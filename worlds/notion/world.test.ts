import { describe, it, expect } from "vitest";
import { loadWorld } from "@wake/kernel";
import {
  WORLD_PATH,
  loadAndParse,
  checkWorld,
  MINI_IDS,
  SEED_IDS,
} from "./validate";

// The committed artifact. loadAndParse() throws if it fails WorldSchema.
const world = loadAndParse();

describe("notion world.json", () => {
  it("loads via the kernel's loadWorld() (parses against WorldSchema)", () => {
    const loaded = loadWorld(WORLD_PATH);
    expect(loaded.id).toBe("notion");
    expect(loaded.nodes.length).toBe(world.nodes.length);
  });

  it("passes referential-integrity and shape checks", () => {
    expect(checkWorld(world)).toEqual([]);
  });

  it("is ~200 nodes with a 30-50 Tier-1 band", () => {
    expect(world.nodes.length).toBeGreaterThanOrEqual(180);
    const t1 = world.nodes.filter((n) => n.tier === 1).length;
    expect(t1).toBeGreaterThanOrEqual(30);
    expect(t1).toBeLessThanOrEqual(50);
    // all three tiers are populated
    expect(world.nodes.some((n) => n.tier === 2)).toBe(true);
    expect(world.nodes.some((n) => n.tier === 3)).toBe(true);
  });

  it("preserves the inherited mini.json node ids", () => {
    const ids = new Set(world.nodes.map((n) => n.id));
    for (const id of MINI_IDS) expect(ids.has(id)).toBe(true);
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

  it("has load-bearing edges and they outnumber none of the light ones unreasonably", () => {
    const llm = world.edges.filter((e) => e.llmMediated);
    expect(llm.length).toBeGreaterThan(20); // a real spine of curated channels
    expect(llm.length).toBeLessThan(world.edges.length); // but most fan-out is light
  });
});
