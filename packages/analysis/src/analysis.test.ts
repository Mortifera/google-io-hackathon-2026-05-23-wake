import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CascadeSchema, MonteCarloResultSchema, type Cascade } from "@wake/contracts";
import { analyze } from "./index";
import { framedScenario, drawRegime, perturbCascade } from "./synthetic";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const load = (p: string): Cascade =>
  CascadeSchema.parse(JSON.parse(readFileSync(path.join(root, p), "utf8")));

// The REAL 207-node Notion cascade is the demo target; the 8-node mini is a fast
// cross-check that the same code holds on a small world.
const real = load("fixtures/cascades/notion-world.acquisition.json");
const mini = load("fixtures/cascades/notion-acquisition.json");

const opts = { worldId: real.meta.worldId, seedActionId: real.meta.seedActionId };

// The card-ready vocabulary describeCluster is allowed to emit.
const CLEAN_LABELS = new Set([
  "Smooth integration",
  "Cautious acceptance",
  "Simmering discontent",
  "Full-blown backlash",
  "Competitors capitalize",
]);

describe("analyze on the real cascade (demo-grade)", () => {
  const result = analyze(framedScenario(real), opts);

  it("produces a MonteCarloResultSchema-valid result", () => {
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.worldId).toBe("notion");
  });

  it("yields 3–4 cleanly labeled clusters that partition the runs", () => {
    expect(result.clusters.length).toBeGreaterThanOrEqual(3);
    expect(result.clusters.length).toBeLessThanOrEqual(4);

    const runIds = result.runs.map((r) => r.id);
    const membersFlat = result.clusters.flatMap((c) => c.memberRunIds);
    expect([...membersFlat].sort()).toEqual([...runIds].sort());

    for (const c of result.clusters) {
      expect(CLEAN_LABELS.has(c.label)).toBe(true); // card-ready label
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.memberRunIds).toContain(c.representativeRunId);
    }
  });

  it("names framing as the pivotal variable with a crisp one-sentence punchline", () => {
    expect(result.pivotal.dimension).toBe("framing");
    expect(result.pivotal.explainedVariance).toBeGreaterThan(0.6);

    const d = result.pivotal.description;
    expect(d.toLowerCase()).toContain("framing");
    expect(d).toContain("independent");
    expect(d).toContain("integrated");
    // One sentence: a single terminal period.
    expect((d.match(/\.\s/g) ?? []).length).toBe(0);
  });
});

describe("analyze", () => {
  it("holds up on the mini world too", () => {
    const result = analyze(framedScenario(mini), opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.pivotal.dimension).toBe("framing");
    for (const c of result.clusters) expect(CLEAN_LABELS.has(c.label)).toBe(true);
  });

  it("picks a numeric dial via the η² (correlation-ratio) path", () => {
    const noiseDials = { seedTiming: [0, 24] as [number, number] };
    const cascades = [
      ...drawRegime(
        mini,
        { count: 5, perturbation: { integrationPressure: 0.1 }, sentimentBias: 0.5, divergence: 1, noiseDials },
        10,
      ),
      ...drawRegime(
        mini,
        { count: 5, perturbation: { integrationPressure: 0.5 }, sentimentBias: -0.1, divergence: 2, noiseDials },
        20,
      ),
      ...drawRegime(
        mini,
        { count: 5, perturbation: { integrationPressure: 0.9 }, sentimentBias: -0.6, divergence: 4, noiseDials },
        30,
      ),
    ];
    const result = analyze(cascades, opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.pivotal.dimension).toBe("integration pressure");
    expect(result.pivotal.explainedVariance).toBeGreaterThan(0.6);
  });

  it("falls back to an outcome feature when no perturbation is recorded", () => {
    const plain = (sentimentBias: number, seed: number): Cascade => {
      const c = perturbCascade(mini, { count: 1, perturbation: {}, sentimentBias, divergence: 1 }, seed);
      delete (c.meta as { perturbation?: unknown }).perturbation; // truly absent
      return c;
    };
    const cascades = [
      ...Array.from({ length: 4 }, (_, i) => plain(0.5, 100 + i)),
      ...Array.from({ length: 4 }, (_, i) => plain(-0.6, 200 + i)),
    ];
    const result = analyze(cascades, opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.pivotal.description.toLowerCase()).toContain("read off the outcomes");
    expect(result.pivotal.explainedVariance).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const cascades = framedScenario(real);
    expect(analyze(cascades, opts)).toEqual(analyze(cascades, opts));
  });

  it("rejects an empty cascade set", () => {
    expect(() => analyze([], opts)).toThrow();
  });
});
