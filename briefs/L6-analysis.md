# L6 — Monte Carlo analysis

**Folder:** `packages/analysis` &middot; **Depends on:** `@wake/contracts`
&middot; **Build against:** the fixture cascades (no kernel dependency).

## Mission
Implement `analyze(cascades, { worldId, seedActionId }) → MonteCarloResult` (the
stub in `src/index.ts`). Turn N cascades into the fan-view payload.

## What to build
- **Outcome vector per run:** fingerprint each cascade's `finalState` into a
  numeric vector (e.g. per-node sentiment/attention, churn flags, divergence
  totals). Stable, comparable across runs.
- **Clustering:** hierarchical clustering over the outcome vectors → 3–4 distinct
  `OutcomeCluster`s. Hand-roll it (small N, no scipy needed). Label each cluster
  with a short human summary and pick a `representativeRunId` (nearest centroid).
- **Pivotal variable:** for each perturbation dimension (from `cascade.meta
  .perturbation`), measure how much its variation correlates with cluster
  membership; the dimension explaining the most cross-cluster variance is the
  pivotal variable. Fill `explainedVariance` (0..1) and a plain-English
  `description`. This is the line that goes on the demo card — make it real, not a
  hand-wave.

## Produces
A `MonteCarloResult` (validate with `MonteCarloResultSchema`).

## Pre-approved
Everything in your folder; generate synthetic cascade sets from the fixture for
testing (vary the fixture's finalState to fake clusters).

## Needs coordination
CP3 wires your output into the viz fan. The kernel produces the real N cascades
(L1) — until then, build entirely against fixtures.

## Done-when
Given a set of cascades, produces a `MonteCarloResultSchema`-valid result with
sensible clusters + a pivotal variable; test green; pushed.
