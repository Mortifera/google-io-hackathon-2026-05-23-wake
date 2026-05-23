import { z } from "zod";

/** A cluster of outcomes that converged despite perturbation. */
export const OutcomeClusterSchema = z.object({
  id: z.string(),
  /** Human label, e.g. "muted positive integration". */
  label: z.string(),
  summary: z.string(),
  memberRunIds: z.array(z.string()),
  /** The single run to replay as this cluster's representative. */
  representativeRunId: z.string(),
});
export type OutcomeCluster = z.infer<typeof OutcomeClusterSchema>;

/** The headline of the demo: the variable that most determines the outcome. */
export const PivotalVariableSchema = z.object({
  dimension: z.string(),
  /** Share of cross-cluster variance this dimension explains (0..1). */
  explainedVariance: z.number().min(0).max(1),
  description: z.string(),
});
export type PivotalVariable = z.infer<typeof PivotalVariableSchema>;

export const MonteCarloRunSchema = z.object({
  id: z.string(),
  clusterId: z.string(),
  /** Numeric fingerprint of the final graph state (used for clustering). */
  outcomeVector: z.array(z.number()),
});
export type MonteCarloRun = z.infer<typeof MonteCarloRunSchema>;

/** Output of N runs. THE seam between `@wake/analysis` and the fan view. */
export const MonteCarloResultSchema = z.object({
  worldId: z.string(),
  seedActionId: z.string(),
  runs: z.array(MonteCarloRunSchema),
  clusters: z.array(OutcomeClusterSchema),
  pivotal: PivotalVariableSchema,
});
export type MonteCarloResult = z.infer<typeof MonteCarloResultSchema>;
