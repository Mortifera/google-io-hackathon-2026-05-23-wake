import { describe, it, expect } from "vitest";
import type { Cascade } from "@wake/contracts";
import { etaSquared, computePivotal } from "./pivotal";
import { cluster, silhouette } from "./cluster";
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
