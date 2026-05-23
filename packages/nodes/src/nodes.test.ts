import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  WorldSchema,
  TickOutputSchema,
  type LLMClient,
  type TickInput,
  type Neighbor,
  type Event,
} from "@wake/contracts";
import { tickFn } from "./index";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const world = WorldSchema.parse(
  JSON.parse(readFileSync(path.join(root, "worlds/notion/mini.json"), "utf8")),
);

function neighborsOf(id: string): Neighbor[] {
  return world.edges
    .filter((e) => e.source === id)
    .map((e) => ({
      id: e.target,
      label: world.nodes.find((n) => n.id === e.target)?.label ?? e.target,
      character: e.character,
    }));
}

const corp = world.nodes.find((n) => n.id === "notion-corp")!;
const seedEvent: Event = {
  id: "e1",
  type: "action",
  source: "world",
  target: "notion-corp",
  channel: "seed",
  content: "Microsoft acquires Notion (independent messaging).",
  time: 0,
  causedBy: null,
};

const input: TickInput = {
  node: corp,
  state: corp.initialState,
  inbox: [seedEvent],
  clock: 0,
  neighbors: neighborsOf("notion-corp"),
};

// Mock LLM that returns a ModelTickOutput-shaped object.
const modelOutput = {
  beliefs: "We must control the narrative.",
  mood: { sentiment: -0.2, urgency: 0.8 },
  publicFace: "Excited about the next chapter.",
  privateInterior: "Bracing for power-user backlash.",
  outgoing: [
    {
      type: "public_post",
      target: "casey-newton",
      content: "Press release: joining Microsoft, staying independent.",
      rationale: "Get ahead of the story.",
    },
  ],
  rationale: "Issue a controlled announcement.",
};

const mockLLM: LLMClient = {
  async complete<T>() {
    return {
      data: modelOutput as unknown as T,
      usage: { inTokens: 0, outTokens: 0, cached: 0, costUsd: 0 },
    };
  },
};

describe("nodes tickFn", () => {
  it("returns a schema-valid TickOutput", async () => {
    const out = await tickFn(input, mockLLM);
    expect(() => TickOutputSchema.parse(out)).not.toThrow();
  });

  it("normalizes outgoing: source, full channel, target preserved", async () => {
    const out = await tickFn(input, mockLLM);
    expect(out.outgoing).toHaveLength(1);
    const ev = out.outgoing[0]!;
    expect(ev.source).toBe("notion-corp");
    expect(ev.target).toBe("casey-newton");
    // channel falls back to the neighbor's edge character when omitted
    expect(ev.channel).toBe("company->journalist");
  });

  it("merges a partial mood onto the node's current mood", async () => {
    const out = await tickFn(input, mockLLM);
    expect(out.stateDelta.mood).toEqual({
      attention: corp.initialState.mood.attention, // unchanged
      sentiment: -0.2,
      urgency: 0.8,
    });
  });
});
