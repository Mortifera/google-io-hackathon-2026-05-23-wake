import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CascadeSchema,
  type TickFn,
  type EdgeTransform,
  type LLMClient,
} from "@wake/contracts";
import { runCascade, runCascadeStream, loadWorld } from "./index";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const world = loadWorld(path.join(root, "worlds/notion/mini.json"));

// A deterministic, LLM-free tick: on first activation a node reacts to all its
// neighbors, then quiets down (so the wave propagates and saturates). This
// exercises the kernel mechanics independent of real node prompts (that's L3).
const isPublic = (character: string): boolean =>
  /journalist|audience|platform|amplif|press|->journalist/.test(character);

const testTick: TickFn = async ({ node, state, inbox, neighbors }) => {
  const last = inbox[inbox.length - 1];
  const fresh = state.attentionBudget >= 0.99;
  const outgoing = fresh
    ? neighbors.map((nb) => ({
        id: "",
        type: isPublic(nb.character)
          ? ("public_post" as const)
          : ("private_message" as const),
        source: node.id,
        target: nb.id,
        channel: nb.character,
        content: `${node.label} reacts to: ${last?.content ?? "the news"}`,
        time: 0,
        causedBy: null,
        rationale: `${node.label} responds.`,
      }))
    : [];
  return {
    stateDelta: {
      beliefs: `Heard: ${last?.content ?? ""}`,
      mood: {
        attention: 0.8,
        sentiment: state.mood.sentiment - 0.3,
        urgency: 0.5,
      },
    },
    outgoing,
    rationale: `${node.label} processed ${inbox.length} event(s).`,
  };
};

// Passthrough edge that lightly reframes load-bearing channels and kills very
// weak edges. (Real archetype prompts are L4.)
const testEdge: EdgeTransform = async (event, _src, _dst, edge) => {
  if (edge.weight < 0.3) return null;
  return edge.llmMediated
    ? { ...event, content: `[${edge.character}] ${event.content}` }
    : event;
};

const noopLLM: LLMClient = {
  complete: async () => ({
    data: {} as never,
    usage: { inTokens: 0, outTokens: 0, cached: 0, costUsd: 0 },
  }),
};

const deps = { llm: noopLLM, tickFn: testTick, edgeTransform: testEdge };

describe("kernel runCascade", () => {
  it("produces a schema-valid, non-trivial cascade from the mini world", async () => {
    const c = await runCascade(world, "acquisition", deps, { seed: 1 });
    expect(() => CascadeSchema.parse(c)).not.toThrow();
    expect(c.ticks.length).toBeGreaterThan(2);
    // more than just the seed event(s) propagated
    expect(c.eventDag.length).toBeGreaterThan(world.seeds.length + 3);
    // every node has a final state
    expect(Object.keys(c.finalState).sort()).toEqual(
      world.nodes.map((n) => n.id).sort(),
    );
  });

  it("preserves provenance: causedBy references resolve within the DAG", async () => {
    const c = await runCascade(world, "acquisition", deps, { seed: 1 });
    const ids = new Set(c.eventDag.map((e) => e.id));
    expect(ids.size).toBe(c.eventDag.length); // unique ids
    for (const e of c.eventDag) {
      if (e.causedBy !== null) expect(ids.has(e.causedBy)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed", async () => {
    const a = await runCascade(world, "acquisition", deps, { seed: 7 });
    const b = await runCascade(world, "acquisition", deps, { seed: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("saturates and terminates (a node does not act forever)", async () => {
    const c = await runCascade(world, "acquisition", deps, { seed: 1 });
    // notion-corp acts at most a few times before its attention budget depletes
    const corpActs = c.ticks.filter((t) =>
      t.activeNodeIds.includes("notion-corp"),
    ).length;
    expect(corpActs).toBeLessThanOrEqual(3);
  });
});

describe("kernel runCascadeStream", () => {
  it("yields a tick event per tick, then one done with the full cascade", async () => {
    const events = [];
    for await (const ev of runCascadeStream(world, "acquisition", deps, {
      seed: 1,
    })) {
      events.push(ev);
    }
    const done = events.filter((e) => e.type === "done");
    const tickEvents = events.filter((e) => e.type === "tick");
    expect(done).toHaveLength(1);
    expect(tickEvents.length).toBeGreaterThan(0);
    const streamed = done[0]!.type === "done" ? done[0]!.cascade : undefined;
    expect(streamed).toBeDefined();
    expect(tickEvents.length).toBe(streamed!.ticks.length); // one event per tick
  });

  it("streamed output is identical to the batch runCascade", async () => {
    let streamed;
    for await (const ev of runCascadeStream(world, "acquisition", deps, {
      seed: 5,
    })) {
      if (ev.type === "done") streamed = ev.cascade;
    }
    const batch = await runCascade(world, "acquisition", deps, { seed: 5 });
    expect(JSON.stringify(streamed)).toBe(JSON.stringify(batch));
  });
});
