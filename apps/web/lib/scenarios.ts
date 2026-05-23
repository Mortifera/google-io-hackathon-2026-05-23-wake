import type { Cascade, MonteCarloResult } from "@wake/contracts";
import acquisitionCascade from "@fixtures/cascades/notion-world.acquisition.json";
import acquisitionMc from "@fixtures/montecarlo/notion-acquisition.json";

/**
 * Registry of precomputed scenarios, keyed by `seedActionId` (matching the
 * world's seed actions). The operator console lists every seed action in the
 * world; the ones present here are "live" (a real cascade exists), the rest show
 * as "pending" until L9 precomputes them. As new cascades land, add an entry —
 * the console and playback pick them up with no other changes.
 */
export interface Scenario {
  cascade: Cascade;
  /** Monte Carlo analysis for this scenario, if computed yet. */
  mc: MonteCarloResult | null;
}

export const SCENARIOS: Record<string, Scenario> = {
  acquisition: {
    cascade: acquisitionCascade as unknown as Cascade,
    // Real analysis arrives at CP3; until then the fan reads the fixture.
    mc: acquisitionMc as unknown as MonteCarloResult,
  },
};

/** The action id the demo opens on (the canonical "safe" run / escape hatch). */
export const DEFAULT_ACTION_ID = "acquisition";

export function scenarioFor(actionId: string): Scenario {
  return SCENARIOS[actionId] ?? SCENARIOS[DEFAULT_ACTION_ID];
}

export function isLive(actionId: string): boolean {
  return actionId in SCENARIOS;
}
