import { describe, it, expect } from "vitest";
import type { Cascade } from "@wake/contracts";
import { etaSquared, computePivotal } from "./pivotal";
import { cluster, silhouette } from "./cluster";
import { describeClusters, type LabelInput } from "./label";
import type { Fingerprints } from "./fingerprint";

describe("etaSquared (correlation ratio)", () => {
  it("is 1 when the values perfectly separate by cluster", () => {
    // All variance is between clusters → η² = 1.
    const values = [1, 1, 1, 5, 5, 5];
    const groups = [0, 0, 0, 1, 1, 1];
    expect(etaSquared(values, groups)).toBeCloseTo(1, 10);
  });

  it("is 0 when the dial is constant (no variance to explain)", () => {
    expect(etaSquared([3, 3, 3, 3], [0, 0, 1, 1])).toBe(0);
  });

  it("is ~0 when cluster means coincide (no between-cluster variance)", () => {
    // Each cluster spans the same range, so means match → nothing explained.
    const values = [1, 5, 1, 5];
    const groups = [0, 0, 1, 1];
    expect(etaSquared(values, groups)).toBeCloseTo(0, 10);
  });
});

describe("silhouette", () => {
  it("is near 1 for two tight, well-separated blobs", () => {
    const points = [
      [0, 0],
      [0.1, 0.1],
      [0, 0.1],
      [10, 10],
      [10.1, 10],
      [10, 10.1],
    ];
    const assignment = [0, 0, 0, 1, 1, 1];
    expect(silhouette(points, assignment, 2)).toBeGreaterThan(0.9);
  });

  it("cluster() recovers k=2 for two clearly separated blobs", () => {
    const points = [
      [0, 0],
      [0.2, 0.1],
      [9, 9],
      [9.1, 8.9],
      [9, 9.2],
    ];
    const result = cluster(points);
    expect(result.k).toBe(2);
    // The two far-apart groups must not share a cluster id.
    expect(result.assignment[0]).not.toBe(result.assignment[2]);
  });
});

describe("computePivotal", () => {
  // computePivotal only reads meta.perturbation off each cascade for the
  // perturbation path, so a minimal stub is enough to assert the math.
  const mk = (perturbation: Record<string, unknown>): Cascade =>
    ({ meta: { worldId: "w", seedActionId: "s", seed: 0, perturbation } }) as unknown as Cascade;

  const emptyFp: Fingerprints = { vectors: [], featureNames: [] };

  it("selects the numeric dial that perfectly tracks cluster membership", () => {
    const cascades = [mk({ dial: 0.1 }), mk({ dial: 0.1 }), mk({ dial: 0.9 }), mk({ dial: 0.9 })];
    const clusterIndex = [0, 0, 1, 1];
    const piv = computePivotal(cascades, clusterIndex, ["A", "B"], [0.5, -0.5], emptyFp);
    expect(piv.dimension).toBe("dial");
    expect(piv.explainedVariance).toBeCloseTo(1, 10);
  });

  it("prefers the perfectly-separating dial over a constant (uninformative) one", () => {
    const cascades = [
      mk({ driver: 0.1, noise: 1 }),
      mk({ driver: 0.1, noise: 1 }),
      mk({ driver: 0.9, noise: 1 }),
      mk({ driver: 0.9, noise: 1 }),
    ];
    const piv = computePivotal(cascades, [0, 0, 1, 1], ["A", "B"], [0.5, -0.5], emptyFp);
    expect(piv.dimension).toBe("driver");
  });
});

describe("describeClusters dedup guard", () => {
  const featureNames = ["a.sentiment", "b.sentiment"];

  it("gives same-tier clusters distinct labels with a clean base", () => {
    // Two clusters, both deeply negative → both want "Full-blown backlash".
    const all = [
      [-0.6, -0.55],
      [-0.7, -0.5],
      [-0.5, -0.7],
      [-0.55, -0.68],
    ];
    const c1: LabelInput = { memberVectors: [all[0]!, all[1]!], allVectors: all, featureNames, share: 0.5 };
    const c2: LabelInput = { memberVectors: [all[2]!, all[3]!], allVectors: all, featureNames, share: 0.5 };

    const copies = describeClusters([c1, c2]);
    expect(copies[0]!.label).not.toBe(copies[1]!.label); // distinct headings
    for (const c of copies) expect(c.label.startsWith("Full-blown backlash")).toBe(true);
  });

  it("guarantees uniqueness even when the qualifier node would also collide", () => {
    // Identical clusters: same tier AND same distinctive node → numeric suffix.
    const all = [
      [-0.6, -0.6],
      [-0.6, -0.6],
      [-0.6, -0.6],
    ];
    const same: LabelInput = { memberVectors: [all[0]!], allVectors: all, featureNames, share: 1 / 3 };
    const copies = describeClusters([same, { ...same }, { ...same }]);
    expect(new Set(copies.map((c) => c.label)).size).toBe(3);
  });
});
