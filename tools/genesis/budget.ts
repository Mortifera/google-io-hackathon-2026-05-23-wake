/**
 * Budget-aware sizing — the budget -> estimated-cost -> graph-size loop from the
 * design mock. The operator picks a $ budget and a tick count; Genesis sizes the
 * cast (how many named leaders vs. archetype cohorts vs. aggregates) to maximize
 * fidelity within that budget.
 *
 * Cost model (deliberately simple + transparent): a frontier-Flash call is
 * ~$0.002. A cascade activates roughly half the graph (attention saturates), so
 * one run ≈ entities * 0.5 * $0.002 ≈ entities * $0.001 — i.e. a ~200-node run
 * ≈ $0.19, matching the brief. Generation (research + dossiers + seeds) adds a
 * smaller, mostly-fixed overhead.
 */

export const CALL_COST_USD = 0.002;

export interface CastCaps {
  leaders: number;
  competitors: number;
  journalists: number;
  cohorts: number;
  platforms: number;
  regulators: number;
  aggregates: number;
}

export interface Sizing {
  budgetUsd: number;
  ticks: number;
  /** Total entities (nodes) the graph is sized to. */
  targetEntities: number;
  caps: CastCaps;
  estGenCostUsd: number;
  estCascadeCostUsd: number;
  estTotalUsd: number;
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.round(n)));

/** One full cascade run over `entities` nodes for `ticks` ticks. */
export function estCascadeCost(entities: number, ticks: number): number {
  const ticksFactor = clampNum(0.6 + 0.4 * (ticks / 12), 0.5, 1.5);
  return entities * 0.5 * CALL_COST_USD * ticksFactor;
}

/** Generation overhead: 2 research calls + dossier batches (12/batch) + seeds. */
export function estGenCost(entities: number): number {
  const dossierBatches = Math.ceil(entities / 12);
  // Generation calls are larger than a tick call; price them a bit higher.
  return (2 + dossierBatches + 1) * CALL_COST_USD * 2.5;
}

const clampNum = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));

/**
 * Pick the largest entity count whose generation + one validating cascade fits
 * the budget (leaving headroom), then allocate it across the cast categories
 * using the mock's rough ratios.
 */
export function planSizing(budgetUsd: number, ticks: number): Sizing {
  const budget = clampNum(budgetUsd, 0.1, 50);
  // Reserve ~40% of budget for generation + the validating run; the rest is the
  // operator's to spend on Monte-Carlo fans later. Grow entities until we hit it.
  const spendCap = budget * 0.6;
  let entities = 12;
  while (
    entities < 240 &&
    estGenCost(entities + 8) + estCascadeCost(entities + 8, ticks) <= spendCap
  ) {
    entities += 8;
  }

  const caps: CastCaps = {
    leaders: clamp(entities * 0.14, 3, 12),
    competitors: clamp(entities * 0.12, 2, 10),
    journalists: clamp(entities * 0.11, 2, 8),
    regulators: clamp(entities * 0.07, 1, 5),
    platforms: clamp(entities * 0.1, 2, 6),
    cohorts: clamp(entities * 0.3, 3, 60),
    aggregates: 0,
  };
  const named =
    caps.leaders + caps.competitors + caps.journalists + caps.regulators + caps.platforms + caps.cohorts;
  caps.aggregates = Math.max(0, entities - named);

  const total =
    caps.leaders +
    caps.competitors +
    caps.journalists +
    caps.regulators +
    caps.platforms +
    caps.cohorts +
    caps.aggregates;

  const estGenCostUsd = estGenCost(total);
  const estCascadeCostUsd = estCascadeCost(total, ticks);
  return {
    budgetUsd: budget,
    ticks,
    targetEntities: total,
    caps,
    estGenCostUsd,
    estCascadeCostUsd,
    estTotalUsd: estGenCostUsd + estCascadeCostUsd,
  };
}
