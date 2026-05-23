import type { Cascade, MonteCarloResult } from "@wake/contracts";
import acquisitionCascade from "@fixtures/cascades/notion-world.acquisition.json";
import acquisitionMc from "@fixtures/montecarlo/notion-world.acquisition.json";
import freeTierCascade from "@fixtures/cascades/notion-world.free-tier-removal.json";
import ceoStepsDownCascade from "@fixtures/cascades/notion-world.ceo-steps-down.json";
import openSourceCascade from "@fixtures/cascades/notion-world.open-source.json";
import engineerIdeaCascade from "@fixtures/cascades/notion-world.engineer-idea.json";
import engineerIdeaPreacq from "@fixtures/cascades/notion-preacq.engineer-idea.json";
import engineerIdeaPostacq from "@fixtures/cascades/notion-postacq.engineer-idea.json";

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
    // CP3: the real Monte Carlo analysis (16 runs → clusters + pivotal).
    mc: acquisitionMc as unknown as MonteCarloResult,
  },
  // The four menu seeds — each a precomputed Cascade replay (no fan yet).
  "free-tier-removal": {
    cascade: freeTierCascade as unknown as Cascade,
    mc: null,
  },
  "ceo-steps-down": {
    cascade: ceoStepsDownCascade as unknown as Cascade,
    mc: null,
  },
  "open-source": {
    cascade: openSourceCascade as unknown as Cascade,
    mc: null,
  },
  "engineer-idea": {
    cascade: engineerIdeaCascade as unknown as Cascade,
    mc: null,
  },
};

/** The action id the demo opens on (the canonical "safe" run / escape hatch). */
export const DEFAULT_ACTION_ID = "acquisition";

/**
 * The two-beat: the SAME engineer's-idea action run in two worlds. The cascade
 * (maya → ai-features-team → eng-manager → vp-of-ai) is identical in both — the
 * divergence is in the manager's *intent*, which inverts at `focusNodeId`:
 * pre-acquisition he buries the idea; post-acquisition he weaponizes it.
 */
export const TWO_BEAT = {
  focusNodeId: "eng-manager",
  pre: {
    label: "Pre-acquisition",
    world: "Independent Notion",
    cascade: engineerIdeaPreacq as unknown as Cascade,
  },
  post: {
    label: "Post-acquisition",
    world: "Microsoft subsidiary",
    cascade: engineerIdeaPostacq as unknown as Cascade,
  },
};

export function scenarioFor(actionId: string): Scenario {
  return SCENARIOS[actionId] ?? SCENARIOS[DEFAULT_ACTION_ID];
}

export function isLive(actionId: string): boolean {
  return actionId in SCENARIOS;
}
