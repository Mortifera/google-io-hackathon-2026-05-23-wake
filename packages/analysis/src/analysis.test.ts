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

// The card-ready vocabulary describeCluster is allowed to emit — mirrors the fan
// design (somedesignwork.pen): three regime names.
const CLEAN_LABELS = new Set([
  "Muted positive integration",
  "Consumer backlash",
  "Competitor wins",
]);
// On collision a label is suffixed (" · Qualifier"); the base must still be clean.
const baseOf = (label: string): string => label.split(" · ")[0]!;

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

    const labels = result.clusters.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length); // no duplicate card headings
    for (const c of result.clusters) {
      expect(CLEAN_LABELS.has(baseOf(c.label))).toBe(true); // card-ready label
      expect(c.summary.length).toBeGreaterThan(0);
      expect(c.memberRunIds).toContain(c.representativeRunId);
    }
  });

  it("names framing as the pivotal variable, in the instrument-not-advisor register", () => {
    expect(result.pivotal.dimension).toBe("framing");
    expect(result.pivotal.explainedVariance).toBeGreaterThan(0.6);

    const d = result.pivotal.description;
    expect(d.toLowerCase()).toContain("framing");
    expect(d).toContain("independent");
    expect(d).toContain("integrated");
    // Instrument framing: report the reading + point at the lever the data favours.
    expect(d).toContain("The pivotal variable points to");
    expect(d).toMatch(/\d+ of \d+ runs/); // hedged to the counts, never "always"
    // Never advisory / opinionated.
    expect(d).not.toMatch(/\b(recommend|you should|lead with|we suggest|advise)\b/i);
  });
});

describe("analyze", () => {
  it("holds up on the mini world too", () => {
    const result = analyze(framedScenario(mini), opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.pivotal.dimension).toBe("framing");
    for (const c of result.clusters) expect(CLEAN_LABELS.has(baseOf(c.label))).toBe(true);
  });

  it("never emits duplicate cluster labels on a low-variance 48-run fan", () => {
    // Structurally uniform: same base, no sentiment spread (no ±0.5 regimes),
    // only per-run seed jitter + a framing tag. Clusters land in the same tier,
    // so without the dedup guard their card labels would be identical.
    const noiseDials = { seedTiming: [0, 24] as [number, number] };
    const cascades = [
      ...drawRegime(
        real,
        { count: 24, perturbation: { framing: "independent" }, sentimentBias: 0, divergence: 2, noiseDials },
        500,
      ),
      ...drawRegime(
        real,
        { count: 24, perturbation: { framing: "integrated" }, sentimentBias: 0, divergence: 2, noiseDials },
        600,
      ),
    ];
    expect(cascades.length).toBe(48);

    const result = analyze(cascades, opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();

    const labels = result.clusters.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length); // every card heading distinct
    for (const c of result.clusters) expect(CLEAN_LABELS.has(baseOf(c.label))).toBe(true);

    // A real, in-range pivotal is always produced.
    expect(result.pivotal.dimension.length).toBeGreaterThan(0);
    expect(result.pivotal.explainedVariance).toBeGreaterThanOrEqual(0);
    expect(result.pivotal.explainedVariance).toBeLessThanOrEqual(1);
  });

  it("absorbs outlier singletons into well-populated clusters (clean fan)", () => {
    // Reproduces the live 16-run shape: two real regimes (7 each) + two lone
    // outliers. Without absorption these read as 4 clusters incl. 2 singletons.
    const noiseDials = { seedTiming: [0, 24] as [number, number] };
    const cascades = [
      ...drawRegime(
        real,
        { count: 7, perturbation: { framing: "independent" }, sentimentBias: 0.3, divergence: 1, noiseDials },
        700,
      ),
      ...drawRegime(
        real,
        { count: 7, perturbation: { framing: "integrated" }, sentimentBias: -0.3, divergence: 3, noiseDials },
        800,
      ),
      perturbCascade(real, { count: 1, perturbation: { framing: "independent" }, sentimentBias: 0.95, divergence: 0, noiseDials }, 900),
      perturbCascade(real, { count: 1, perturbation: { framing: "integrated" }, sentimentBias: -0.95, divergence: 6, noiseDials }, 901),
    ];
    expect(cascades.length).toBe(16);

    const result = analyze(cascades, opts);
    expect(() => MonteCarloResultSchema.parse(result)).not.toThrow();
    expect(result.clusters.length).toBeGreaterThanOrEqual(2);
    expect(result.clusters.length).toBeLessThanOrEqual(3);
    // No singletons: every cluster is well-populated.
    for (const c of result.clusters) expect(c.memberRunIds.length).toBeGreaterThanOrEqual(2);
    // Runs are still fully partitioned.
    expect(result.clusters.flatMap((c) => c.memberRunIds).length).toBe(16);
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
