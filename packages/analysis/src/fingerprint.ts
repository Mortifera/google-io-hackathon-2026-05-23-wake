import type { Cascade } from "@wake/contracts";

/**
 * A run's final state, reduced to a numeric vector that is stable and
 * comparable across runs. We fingerprint over the *sorted union* of every node
 * id seen in any cascade, so the i-th component always means the same thing —
 * a node missing from one run reads as neutral (0) there.
 *
 * Per node we keep the affective state that actually drives the outcome
 * (sentiment / attention / urgency) plus the remaining attention budget, and we
 * append one cascade-level signal: the final public/private divergence count,
 * which is the leak pressure the dual-layer view cares about.
 */
export interface Fingerprints {
  /** One outcome vector per cascade, in input order. */
  vectors: number[][];
  /** Human-readable name of each vector component, e.g. "prod-twitter.sentiment". */
  featureNames: string[];
}

const NODE_FEATURES = ["sentiment", "attention", "urgency", "attentionBudget"] as const;
const DIVERGENCE_FEATURE = "__divergence";

export function fingerprint(cascades: readonly Cascade[]): Fingerprints {
  const nodeIds = sortedNodeUnion(cascades);

  const featureNames: string[] = [];
  for (const id of nodeIds) {
    for (const f of NODE_FEATURES) featureNames.push(`${id}.${f}`);
  }
  featureNames.push(DIVERGENCE_FEATURE);

  const vectors = cascades.map((c) => {
    const vec: number[] = [];
    for (const id of nodeIds) {
      const s = c.finalState[id];
      // Missing node => neutral: no sentiment, no attention, no urgency, no budget.
      vec.push(s?.mood.sentiment ?? 0);
      vec.push(s?.mood.attention ?? 0);
      vec.push(s?.mood.urgency ?? 0);
      vec.push(s?.attentionBudget ?? 0);
    }
    vec.push(finalDivergence(c));
    return vec;
  });

  return { vectors, featureNames };
}

const sortedNodeUnion = (cascades: readonly Cascade[]): string[] => {
  const ids = new Set<string>();
  for (const c of cascades) {
    for (const id of Object.keys(c.finalState)) ids.add(id);
  }
  return [...ids].sort();
};

/** The last recorded public/private divergence count (0 if none recorded). */
const finalDivergence = (c: Cascade): number => {
  const last = c.divergence.at(-1);
  return last?.count ?? 0;
};
