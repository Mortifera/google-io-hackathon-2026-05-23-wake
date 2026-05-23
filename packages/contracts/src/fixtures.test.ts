import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  WorldSchema,
  CascadeSchema,
  MonteCarloResultSchema,
} from "./index";

// repo root = packages/contracts/src -> up three
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const load = (p: string): unknown =>
  JSON.parse(readFileSync(path.join(root, p), "utf8"));

describe("shared fixtures validate against the contracts", () => {
  it("mini world conforms to WorldSchema", () => {
    expect(() => WorldSchema.parse(load("worlds/notion/mini.json"))).not.toThrow();
  });

  it("acquisition cascade conforms to CascadeSchema", () => {
    expect(() =>
      CascadeSchema.parse(load("fixtures/cascades/notion-acquisition.json")),
    ).not.toThrow();
  });

  it("acquisition monte carlo conforms to MonteCarloResultSchema", () => {
    expect(() =>
      MonteCarloResultSchema.parse(
        load("fixtures/montecarlo/notion-acquisition.json"),
      ),
    ).not.toThrow();
  });

  it("real full-world cascade (the demo artifact) conforms to CascadeSchema", () => {
    expect(() =>
      CascadeSchema.parse(
        load("fixtures/cascades/notion-world.acquisition.json"),
      ),
    ).not.toThrow();
  });

  it("cascade event ids are unique and causedBy references resolve", () => {
    const c = CascadeSchema.parse(
      load("fixtures/cascades/notion-acquisition.json"),
    );
    const ids = new Set(c.eventDag.map((e) => e.id));
    expect(ids.size).toBe(c.eventDag.length);
    for (const e of c.eventDag) {
      if (e.causedBy !== null) expect(ids.has(e.causedBy)).toBe(true);
    }
  });

  it("A/B variant: independent framing cascade conforms to CascadeSchema", () => {
    expect(() =>
      CascadeSchema.parse(load("fixtures/cascades/notion.variant-independent.json")),
    ).not.toThrow();
  });

  it("A/B variant: integrated framing cascade conforms to CascadeSchema", () => {
    expect(() =>
      CascadeSchema.parse(load("fixtures/cascades/notion.variant-integrated.json")),
    ).not.toThrow();
  });

  it("A/B variants have the expected perturbation metadata", () => {
    const ind = CascadeSchema.parse(load("fixtures/cascades/notion.variant-independent.json"));
    const int2 = CascadeSchema.parse(load("fixtures/cascades/notion.variant-integrated.json"));
    expect(ind.meta.perturbation?.["acquisitionMessagingFraming"]).toBe("independent");
    expect(int2.meta.perturbation?.["acquisitionMessagingFraming"]).toBe("integrated");
  });

  it("A/B variants show legible divergence: integrated is more negative", () => {
    const ind = CascadeSchema.parse(load("fixtures/cascades/notion.variant-independent.json"));
    const int2 = CascadeSchema.parse(load("fixtures/cascades/notion.variant-integrated.json"));

    const meanSentiment = (c: typeof ind) => {
      const vals = Object.values(c.finalState).map((st) => st.mood.sentiment);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const indMean = meanSentiment(ind);
    const intMean = meanSentiment(int2);

    // Integrated framing should be meaningfully more negative (at least 0.1 gap).
    expect(intMean).toBeLessThan(indMean - 0.1);
  });
});
