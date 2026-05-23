import type {
  Cascade,
  MonteCarloResult,
  MonteCarloRun,
  OutcomeCluster,
} from "@wake/contracts";
import { fingerprint } from "./fingerprint";
import { cluster, representativeMember } from "./cluster";
import { describeCluster } from "./label";
import { computePivotal } from "./pivotal";
import { standardizeColumns } from "./stats";

export type { Fingerprints } from "./fingerprint";
export { fingerprint } from "./fingerprint";

/**
 * Monte Carlo analysis (L6 — see briefs/L6-analysis.md). Turn N cascades into
 * the fan-view payload:
 *  1. fingerprint each run's finalState into a stable numeric outcome vector,
 *  2. hierarchically cluster the (standardized) vectors into 3–4 outcome
 *     clusters, each with a data-derived label + a representative run,
 *  3. compute the pivotal variable — the perturbation dimension whose variation
 *     best explains which cluster a run lands in.
 *
 * No kernel dependency: this runs against fixture cascades just as well as real
 * ones, because it only reads the frozen Cascade contract.
 */
export function analyze(
  cascades: Cascade[],
  opts: { worldId: string; seedActionId: string },
): MonteCarloResult {
  if (cascades.length === 0) {
    throw new Error("analyze() needs at least one cascade");
  }

  const runIds = cascades.map((_, i) => `r${String(i + 1).padStart(2, "0")}`);

  // 1. Outcome vectors (raw, for the viz/output) + standardized (for clustering).
  const fp = fingerprint(cascades);
  const standardized = standardizeColumns(fp.vectors);

  // 2. Cluster.
  const { k, assignment } = cluster(standardized);
  const clusterIds = Array.from({ length: k }, (_, c) => `c${c + 1}`);

  const membersByCluster: number[][] = Array.from({ length: k }, () => []);
  assignment.forEach((c, i) => membersByCluster[c]!.push(i));

  // Describe every cluster up front, in an explicit pass, so the labels are a
  // fully-built array before anything (clusters *or* the pivotal description)
  // reads them. A future parallel/reordered refactor then can't desync them.
  const copies = membersByCluster.map((members) =>
    describeCluster({
      memberVectors: members.map((i) => fp.vectors[i]!),
      allVectors: fp.vectors,
      featureNames: fp.featureNames,
      share: members.length / cascades.length,
    }),
  );
  const clusterLabels: string[] = copies.map((copy) => copy.label);

  const clusters: OutcomeCluster[] = membersByCluster.map((members, c) => {
    const repIdx = representativeMember(standardized, members);
    return {
      id: clusterIds[c]!,
      label: copies[c]!.label,
      summary: copies[c]!.summary,
      memberRunIds: members.map((i) => runIds[i]!),
      representativeRunId: runIds[repIdx]!,
    };
  });

  // 3. Pivotal variable.
  const pivotal = computePivotal(cascades, assignment, clusterLabels, fp);

  const runs: MonteCarloRun[] = cascades.map((_, i) => ({
    id: runIds[i]!,
    clusterId: clusterIds[assignment[i]!]!,
    outcomeVector: fp.vectors[i]!,
  }));

  return {
    worldId: opts.worldId,
    seedActionId: opts.seedActionId,
    runs,
    clusters,
    pivotal,
  };
}
