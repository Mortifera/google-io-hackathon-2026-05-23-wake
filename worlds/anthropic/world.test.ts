import { describe, it, expect } from "vitest";
import { loadWorld } from "@wake/kernel";
import { WORLD_PATH, loadAndParse, checkWorld, SEED_IDS } from "./validate";

const world = loadAndParse(); // throws if it fails WorldSchema

describe("anthropic world.json", () => {
  it("loads via the kernel's loadWorld() (parses against WorldSchema)", () => {
    const loaded = loadWorld(WORLD_PATH);
    expect(loaded.id).toBe("anthropic");
    expect(loaded.nodes.length).toBe(world.nodes.length);
  });

  it("passes referential-integrity and shape checks", () => {
    expect(checkWorld(world)).toEqual([]);
  });

  it("is a ~50-node tiered world", () => {
    expect(world.nodes.length).toBeGreaterThanOrEqual(40);
    const t1 = world.nodes.filter((n) => n.tier === 1).length;
    expect(t1).toBeGreaterThanOrEqual(15);
    expect(world.nodes.some((n) => n.tier === 2)).toBe(true);
    expect(world.nodes.some((n) => n.tier === 3)).toBe(true);
  });

  it("exposes the 5 curated seed actions, each targeting real nodes", () => {
    const ids = new Set(world.nodes.map((n) => n.id));
    for (const id of SEED_IDS) {
      const seed = world.seeds.find((s) => s.id === id);
      expect(seed, `seed ${id}`).toBeDefined();
      expect(seed!.targets.length).toBeGreaterThan(0);
      for (const t of seed!.targets) expect(ids.has(t)).toBe(true);
    }
  });

  it("has a real spine of load-bearing edges", () => {
    const llm = world.edges.filter((e) => e.llmMediated);
    expect(llm.length).toBeGreaterThan(15);
    expect(llm.length).toBeLessThan(world.edges.length);
  });
});
