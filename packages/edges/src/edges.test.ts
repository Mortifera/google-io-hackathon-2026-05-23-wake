import { describe, it, expect } from "vitest";
import type { LLMClient, Event, NodeDef, EdgeDef } from "@wake/contracts";
import { edgeTransform } from "./index";

const ev: Event = {
  id: "e1",
  type: "public_post",
  source: "casey-newton",
  target: "twitter",
  channel: "journo-twitter",
  content: "Notion joins Microsoft; can independence survive?",
  time: 45,
  causedBy: "e0",
};

const src: NodeDef = {
  id: "casey-newton",
  label: "Casey Newton",
  tier: 1,
  fn: "channel",
  dossier: "journalist",
  activationThreshold: 0.2,
  initialState: {
    beliefs: "",
    mood: { attention: 0.3, sentiment: -0.1, urgency: 0.2 },
    publicFace: "",
    privateInterior: "",
    history: [],
    commitments: [],
    attentionBudget: 1,
    active: false,
  },
};
const dst: NodeDef = { ...src, id: "twitter", label: "Twitter", fn: "channel" };

function edge(partial: Partial<EdgeDef>): EdgeDef {
  return {
    id: "x",
    source: "a",
    target: "b",
    direction: "one-way",
    weight: 0.8,
    character: "direct",
    llmMediated: false,
    ...partial,
  };
}

// Inline mock LLM; generic so it satisfies LLMClient.complete<T>.
function mock(data: unknown): LLMClient {
  return {
    async complete<T>() {
      return {
        data: data as unknown as T,
        usage: { inTokens: 0, outTokens: 0, cached: 0, costUsd: 0 },
      };
    },
  };
}

describe("edges edgeTransform", () => {
  it("light platform edge amplifies (deterministic, no LLM)", async () => {
    const out = await edgeTransform(
      ev,
      src,
      dst,
      edge({ character: "platform-amplification", llmMediated: false }),
      mock({}),
    );
    expect(out).not.toBeNull();
    expect(out!.content.startsWith("Trending — ")).toBe(true);
  });

  it("kills events on a too-weak light edge", async () => {
    const out = await edgeTransform(
      ev,
      src,
      dst,
      edge({ weight: 0.1, llmMediated: false }),
      mock({}),
    );
    expect(out).toBeNull();
  });

  it("load-bearing edge applies the LLM transform", async () => {
    const out = await edgeTransform(
      ev,
      src,
      dst,
      edge({ character: "journalist->audience", llmMediated: true }),
      mock({ drop: false, content: "REFRAMED", rationale: "sharpened" }),
    );
    expect(out).not.toBeNull();
    expect(out!.content).toBe("REFRAMED");
    expect(out!.rationale).toBe("sharpened");
    // provenance preserved
    expect(out!.id).toBe("e1");
    expect(out!.causedBy).toBe("e0");
  });

  it("drops the event when the LLM says drop", async () => {
    const out = await edgeTransform(
      ev,
      src,
      dst,
      edge({ character: "employee->manager", llmMediated: true }),
      mock({ drop: true, content: "(killed)" }),
    );
    expect(out).toBeNull();
  });
});
