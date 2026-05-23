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
});
