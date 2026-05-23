import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CascadeSchema, type LLMClient } from "@wake/contracts";
import { explain, relevantSubgraph } from "./index";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const cascade = CascadeSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(root, "fixtures/cascades/notion-acquisition.json"),
      "utf8",
    ),
  ),
);

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

describe("interp trace", () => {
  it("traces the upstream chain for 'why did productivity twitter turn hostile'", () => {
    const sub = relevantSubgraph(
      cascade,
      "why did productivity twitter turn hostile?",
    );
    const ids = sub.map((e) => e.id);
    // the hostile cohort post (e9) and its cause chain back to the seed (e1)
    expect(ids).toContain("e1");
    expect(ids).toContain("e8");
    expect(ids).toContain("e9");
    // time-sorted
    const times = sub.map((e) => e.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("falls back to the cascade tail when nothing matches", () => {
    const sub = relevantSubgraph(cascade, "zzzz nonexistent qqqq");
    expect(sub.length).toBeGreaterThan(0);
  });
});

describe("interp explain", () => {
  it("returns a grounded answer with valid cited event ids", async () => {
    const out = await explain(
      cascade,
      "why did productivity twitter turn hostile?",
      mock({
        answer:
          "Casey Newton's skeptical framing (e5) was amplified by Twitter (e8), reaching the cohort which then voiced betrayal (e9).",
        citedEventIds: ["e5", "e8", "e9"],
      }),
    );
    expect(out.answer.length).toBeGreaterThan(0);
    const dagIds = new Set(cascade.eventDag.map((e) => e.id));
    expect(out.citedEventIds.length).toBeGreaterThan(0);
    for (const id of out.citedEventIds) expect(dagIds.has(id)).toBe(true);
  });

  it("drops hallucinated ids and falls back to the proximate chain", async () => {
    const out = await explain(
      cascade,
      "why did productivity twitter turn hostile?",
      mock({ answer: "...", citedEventIds: ["nope-1", "nope-2"] }),
    );
    // none of the cited ids were real → fell back to real ones
    const dagIds = new Set(cascade.eventDag.map((e) => e.id));
    for (const id of out.citedEventIds) expect(dagIds.has(id)).toBe(true);
  });
});
