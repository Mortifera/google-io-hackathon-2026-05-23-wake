import type { Cascade, MonteCarloResult } from "@wake/contracts";

/**
 * Monte Carlo analysis. STUB — owned by L6 (see briefs/L6-analysis.md).
 *
 * Turn N cascades into:
 *  - an outcome vector per run (fingerprint of finalState),
 *  - hierarchical clusters with labels + representative runs,
 *  - the pivotal variable (the perturbation dimension explaining the most
 *    cross-cluster variance).
 * Build against the fixture cascades — no kernel dependency required.
 */
export function analyze(
  _cascades: Cascade[],
  _opts: { worldId: string; seedActionId: string },
): MonteCarloResult {
  throw new Error("analyze not implemented yet (L6). See briefs/L6-analysis.md");
}
