import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CascadeSchema, MonteCarloResultSchema, type Cascade } from "@wake/contracts";
import { analyze } from "./index";
import { syntheticCascades, drawRegime, perturbCascade } from "./synthetic";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const base: Cascade = CascadeSchema.parse(
  JSON.parse(readFileSync(path.join(root, "fixtures/cascades/notion-acquisition.json"), "utf8")),
);

const opts = { worldId: "notion-mini", seedActionId: "acquisition" };

describe("analyze", () => {
  it("produces a MonteCarloResultSchema-valid result", () => {
    const result = analyze(syntheticCascades(base), opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.worldId).toBe(opts.worldId);
    expect(result.seedActionId).toBe(opts.seedActionId);
  });

  it("clusters the three regimes into three distinct outcome clusters", () => {
    const cascades = syntheticCascades(base);
    const result = analyze(cascades, opts);

    expect(result.clusters.length).toBe(3);

    // Every run belongs to exactly one cluster; clusters cover all runs.
    const runIds = result.runs.map((r) => r.id);
    const membersFlat = result.clusters.flatMap((c) => c.memberRunIds);
    expect(new Set(membersFlat).size).toBe(runIds.length);
    expect([...membersFlat].sort()).toEqual([...runIds].sort());

    for (const c of result.clusters) {
      expect(c.memberRunIds).toContain(c.representativeRunId);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.summary.length).toBeGreaterThan(0);
    }

    // Each run's clusterId resolves to a real cluster.
    const clusterIds = new Set(result.clusters.map((c) => c.id));
    for (const r of result.runs) expect(clusterIds.has(r.clusterId)).toBe(true);
  });

  it("picks the categorical dial that drives the outcome as pivotal", () => {
    const result = analyze(syntheticCascades(base), opts);
    expect(result.pivotal.dimension).toBe("messaging framing");
    // Framing fully determines the regime, so it should dominate the noise dials.
    expect(result.pivotal.explainedVariance).toBeGreaterThan(0.6);
    expect(result.pivotal.description.toLowerCase()).toContain("framing");
  });

  it("picks a numeric dial via the η² (correlation-ratio) path", () => {
    const noiseDials = { seedTiming: [0, 24] as [number, number] };
    const cascades = [
      ...drawRegime(
        base,
        { count: 5, perturbation: { integrationPressure: 0.1 }, sentimentBias: 0.5, divergence: 1, noiseDials },
        10,
      ),
      ...drawRegime(
        base,
        { count: 5, perturbation: { integrationPressure: 0.5 }, sentimentBias: -0.1, divergence: 2, noiseDials },
        20,
      ),
      ...drawRegime(
        base,
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
    // Clone the fixture into two sentiment regimes with no perturbation metadata.
    const plain = (sentimentBias: number, seed: number): Cascade => {
      const c = perturbCascade(base, { count: 1, perturbation: {}, sentimentBias, divergence: 1 }, seed);
      delete (c.meta as { perturbation?: unknown }).perturbation; // truly absent
      return c;
    };
    const cascades = [
      ...Array.from({ length: 4 }, (_, i) => plain(0.5, 100 + i)),
      ...Array.from({ length: 4 }, (_, i) => plain(-0.6, 200 + i)),
    ];
    const result = analyze(cascades, opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.pivotal.description.toLowerCase()).toContain("derived from final-state outcomes");
    expect(result.pivotal.explainedVariance).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const cascades = syntheticCascades(base);
    expect(analyze(cascades, opts)).toEqual(analyze(cascades, opts));
  });

  it("rejects an empty cascade set", () => {
    expect(() => analyze([], opts)).toThrow();
  });
});
