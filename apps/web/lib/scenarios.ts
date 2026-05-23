import type { Cascade, MonteCarloResult } from "@wake/contracts";
import acquisitionCascade from "@fixtures/cascades/notion-world.acquisition.json";
import acquisitionMc from "@fixtures/montecarlo/notion-world.acquisition.json";
import freeTierCascade from "@fixtures/cascades/notion-world.free-tier-removal.json";
import ceoStepsDownCascade from "@fixtures/cascades/notion-world.ceo-steps-down.json";
import openSourceCascade from "@fixtures/cascades/notion-world.open-source.json";
import engineerIdeaCascade from "@fixtures/cascades/notion-world.engineer-idea.json";
import engineerIdeaPreacq from "@fixtures/cascades/notion-preacq.engineer-idea.json";
import engineerIdeaPostacq from "@fixtures/cascades/notion-postacq.engineer-idea.json";
import variantIndependent from "@fixtures/cascades/notion.variant-independent.json";
import variantIntegrated from "@fixtures/cascades/notion.variant-integrated.json";

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

/**
 * A/B Testing: the SAME acquisition action framed two ways — "independent" vs
 * "integrated" — in the SAME world. Framing is the pivotal variable (~58% of
 * outcome variance). The two cascades run under different acquisitionMessagingFraming
 * perturbations; real divergent outcomes from live Gemini runs.
 *
 * Note: this is distinct from TWO_BEAT (same action, two worlds). Here the world
 * is identical — only the action framing changes.
 */
export interface ABVariant {
  /** Short variant name (e.g. "Independent-led"). */
  label: string;
  /** One-sentence description of the framing. */
  description: string;
  /** The full framing text used as the seed payload delta. */
  framing: string;
  /** Precomputed cascade for this variant. */
  cascade: Cascade;
  /** Instrument-register interpretation of what the data shows. */
  interpretation: string;
}

export interface ABTest {
  /** The question this A/B surfaces. */
  question: string;
  /** Short description of what's being tested. */
  description: string;
  /** Summary of what the sweep data shows (shown below the grid). */
  sweepSummary: string;
  variants: Record<"independent" | "integrated", ABVariant>;
}

export const AB_TEST: ABTest = {
  question: "Which way should Notion announce the acquisition?",
  description:
    "Same world, same action — two framings of the acquisition message. " +
    "The sweep settles on a legible difference: framing is the pivotal variable, " +
    "accounting for roughly 58% of outcome variance.",
  sweepSummary:
    "The sweep data favors the 'independent' framing. Mean network sentiment lands at " +
    "+0.07 (independent) vs -0.17 (integrated) — a 0.24-point gap. The integrated frame " +
    "more than doubles the count of highly-negative nodes (30 vs 14) and collapses the " +
    "positive cluster from 76 to 18 nodes. The narrative difference: 'independent' lets " +
    "the craft/community base hold onto Notion's identity; 'integrated' reads as a " +
    "Microsoft absorption and triggers the power-user backlash cascade immediately.",
  variants: {
    independent: {
      label: "Independent-led",
      description: "Notion keeps its own brand, team, and design culture.",
      framing:
        "Microsoft has acquired Notion. The official announcement emphasizes that Notion will " +
        "keep operating independently — its own brand, team, and design culture.",
      cascade: variantIndependent as unknown as Cascade,
      interpretation:
        "Leading with 'stays fully independent' pre-empts the acquisition-distrust narrative. " +
        "The narrative spreads mostly positive across creators, power users, and press. " +
        "Consumer backlash is rare and shallow — the sweep finds backlash never reaches critical mass. " +
        "The sweep settles on 'independent' as the lower-risk path by a wide margin.",
    },
    integrated: {
      label: "Integrated-led",
      description: "Notion becomes part of Microsoft 365, bringing its docs and editor into Copilot.",
      framing:
        "Microsoft has acquired Notion. The official announcement emphasizes that Notion will " +
        "be deeply integrated into Microsoft 365 and Copilot.",
      cascade: variantIntegrated as unknown as Cascade,
      interpretation:
        "Leading with 'integrated into Microsoft 365' triggers immediate craft/community alarm. " +
        "Power users, design Twitter, and the dev community land in consumer backlash quickly. " +
        "The sweep shows 30 highly-negative nodes vs 14 under the independent frame — " +
        "a 2x amplification of the backlash cluster. Mean network sentiment drops to -0.17.",
    },
  },
};
