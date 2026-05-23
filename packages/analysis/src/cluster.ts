import { centroid, euclidean } from "./stats";

/**
 * Hand-rolled hierarchical (agglomerative, average-linkage) clustering. Small N,
 * so the naive O(N^3) merge loop is plenty and keeps us dependency-free.
 *
 * We agglomerate all the way down to one cluster, snapshotting the assignment at
 * every k, then pick the k in [kMin, kMax] with the best silhouette score. That
 * makes the number of clusters data-driven instead of hardcoded.
 */
export interface Clustering {
  /** Chosen number of clusters. */
  k: number;
  /** assignment[i] = cluster index (0..k-1) of point i. */
  assignment: number[];
  /** Silhouette score of the chosen clustering, in [-1, 1]. */
  silhouette: number;
}

export function cluster(
  points: readonly number[][],
  kMin = 2,
  kMax = 4,
): Clustering {
  const n = points.length;
  if (n <= 1) return { k: Math.max(n, 0), assignment: points.map(() => 0), silhouette: 0 };

  const byK = agglomerate(points);

  const hi = Math.min(kMax, n);
  const lo = Math.min(kMin, hi);

  let best: Clustering | null = null;
  for (let k = lo; k <= hi; k++) {
    const assignment = byK.get(k)!;
    const s = silhouette(points, assignment, k);
    // Prefer the higher silhouette; on a tie, prefer fewer clusters (simpler story).
    if (!best || s > best.silhouette + 1e-9) best = { k, assignment, silhouette: s };
  }
  return best!;
}

/**
 * Run the full agglomeration and return, for each k from n down to 1, the
 * cluster assignment (relabelled to a dense 0..k-1).
 */
function agglomerate(points: readonly number[][]): Map<number, number[]> {
  const n = points.length;
  // Each point starts in its own cluster; clusters hold member point-indices.
  let clusters: number[][] = points.map((_, i) => [i]);

  const byK = new Map<number, number[]>();
  byK.set(n, label(clusters, n));

  while (clusters.length > 1) {
    // Find the closest pair of clusters by average linkage.
    let bestI = 0;
    let bestJ = 1;
    let bestD = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = averageLinkage(points, clusters[i]!, clusters[j]!);
        if (d < bestD) {
          bestD = d;
          bestI = i;
          bestJ = j;
        }
      }
    }
    // Merge j into i and drop j.
    clusters[bestI] = [...clusters[bestI]!, ...clusters[bestJ]!];
    clusters = clusters.filter((_, idx) => idx !== bestJ);
    byK.set(clusters.length, label(clusters, n));
  }

  return byK;
}

/** Mean pairwise distance between two clusters (average linkage). */
function averageLinkage(
  points: readonly number[][],
  a: readonly number[],
  b: readonly number[],
): number {
  let sum = 0;
  for (const i of a) for (const j of b) sum += euclidean(points[i]!, points[j]!);
  return sum / (a.length * b.length);
}

/** Turn a list of member-index arrays into a per-point assignment array. */
function label(clusters: readonly number[][], n: number): number[] {
  const out = new Array<number>(n).fill(0);
  clusters.forEach((members, c) => {
    for (const i of members) out[i] = c;
  });
  return out;
}

/**
 * Mean silhouette coefficient. For each point: a = mean intra-cluster distance,
 * b = mean distance to the nearest *other* cluster; s = (b - a) / max(a, b).
 * Singletons contribute 0. Higher is better-separated.
 */
export function silhouette(
  points: readonly number[][],
  assignment: readonly number[],
  k: number,
): number {
  const n = points.length;
  if (k < 2 || n < 2) return 0;

  const members: number[][] = Array.from({ length: k }, () => []);
  assignment.forEach((c, i) => members[c]!.push(i));

  const meanDistTo = (i: number, group: readonly number[], excludeSelf: boolean) => {
    let sum = 0;
    let count = 0;
    for (const j of group) {
      if (excludeSelf && j === i) continue;
      sum += euclidean(points[i]!, points[j]!);
      count++;
    }
    return count === 0 ? 0 : sum / count;
  };

  let total = 0;
  for (let i = 0; i < n; i++) {
    const own = assignment[i]!;
    if (members[own]!.length <= 1) continue; // singleton → s = 0
    const a = meanDistTo(i, members[own]!, true);
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === own || members[c]!.length === 0) continue;
      b = Math.min(b, meanDistTo(i, members[c]!, false));
    }
    if (!isFinite(b)) continue;
    const s = a === 0 && b === 0 ? 0 : (b - a) / Math.max(a, b);
    total += s;
  }
  return total / n;
}

/**
 * Index (into `points`) of the cluster member nearest the cluster centroid —
 * the run we replay as the cluster's representative.
 */
export function representativeMember(
  points: readonly number[][],
  memberIndices: readonly number[],
): number {
  const ctr = centroid(memberIndices.map((i) => points[i]!));
  let best = memberIndices[0]!;
  let bestD = Infinity;
  for (const i of memberIndices) {
    const d = euclidean(points[i]!, ctr);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
