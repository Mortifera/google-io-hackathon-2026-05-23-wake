import { centroid, euclidean } from "./stats";

/**
 * Hand-rolled hierarchical (agglomerative, average-linkage) clustering. Small N,
 * so the naive O(N^3) merge loop is plenty and keeps us dependency-free.
 *
 * We agglomerate all the way down to one cluster, snapshotting the assignment at
 * every k, pick the k in [kMin, kMax] with the best silhouette score, then
 * **absorb under-populated clusters** into their nearest neighbour. The second
 * step matters for a clean fan card: silhouette happily isolates one or two
 * outlier runs into singleton clusters, which read as noise on the demo. Folding
 * stragglers (size below a share-of-N floor) into the nearest real cluster leaves
 * 2–3 well-populated outcomes — data-agnostically, with no per-run tuning.
 */
export interface Clustering {
  /** Chosen number of clusters. */
  k: number;
  /** assignment[i] = cluster index (0..k-1) of point i. */
  assignment: number[];
  /** Silhouette score of the chosen clustering, in [-1, 1]. */
  silhouette: number;
}

/** A cluster smaller than max(2, this × N) is a straggler and gets absorbed. */
const MIN_CLUSTER_SHARE = 0.08;

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
  const minSize = Math.max(2, Math.round(MIN_CLUSTER_SHARE * n));

  // Evaluate each candidate k *after* folding stragglers, and keep the best
  // post-absorption clustering. This lets a higher k that surfaces the real
  // regimes (plus a couple of outliers) win, then collapse to 2–3 clean
  // clusters — rather than a low k that quietly buries an outlier as a singleton.
  let best: Clustering | null = null;
  for (let k = lo; k <= hi; k++) {
    const merged = absorbSmall(points, byK.get(k)!, k, minSize);
    const s = silhouette(points, merged.assignment, merged.k);
    // Prefer the higher silhouette; on a tie, prefer fewer clusters (simpler story).
    if (!best || s > best.silhouette + 1e-9) {
      best = { k: merged.k, assignment: merged.assignment, silhouette: s };
    }
  }
  return best!;
}

/**
 * Repeatedly merge the smallest below-floor cluster into its nearest neighbour
 * (by centroid distance), never dropping below 2 clusters. Returns a clustering
 * with densely-relabelled assignments.
 */
function absorbSmall(
  points: readonly number[][],
  assignment: readonly number[],
  k: number,
  minSize: number,
): { k: number; assignment: number[] } {
  let asg = [...assignment];
  let curK = k;

  while (curK > 2) {
    const sizes = new Array<number>(curK).fill(0);
    for (const c of asg) sizes[c]!++;

    // Smallest cluster that's still under the floor.
    let small = -1;
    let smallSize = Infinity;
    for (let c = 0; c < curK; c++) {
      if (sizes[c]! < minSize && sizes[c]! < smallSize) {
        small = c;
        smallSize = sizes[c]!;
      }
    }
    if (small === -1) break; // every cluster is well-populated

    const cents = clusterCentroids(points, asg, curK);
    let target = -1;
    let bestD = Infinity;
    for (let c = 0; c < curK; c++) {
      if (c === small) continue;
      const d = euclidean(cents[small]!, cents[c]!);
      if (d < bestD) {
        bestD = d;
        target = c;
      }
    }

    asg = densify(asg.map((c) => (c === small ? target : c)));
    curK -= 1;
  }

  return { k: curK, assignment: asg };
}

/** Centroid of each cluster (in point space). */
function clusterCentroids(
  points: readonly number[][],
  assignment: readonly number[],
  k: number,
): number[][] {
  const members: number[][] = Array.from({ length: k }, () => []);
  assignment.forEach((c, i) => members[c]!.push(i));
  return members.map((idxs) => centroid(idxs.map((i) => points[i]!)));
}

/** Relabel an assignment so cluster ids are a contiguous 0..m-1. */
function densify(assignment: readonly number[]): number[] {
  const order = [...new Set(assignment)].sort((a, b) => a - b);
  const remap = new Map(order.map((old, dense) => [old, dense]));
  return assignment.map((c) => remap.get(c)!);
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
