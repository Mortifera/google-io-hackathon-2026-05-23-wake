import type { World, Cascade } from "@wake/contracts";
import { mapWithConcurrency } from "@wake/util";
import { runCascade, type RunDeps } from "./index";

/** A point in perturbation space, e.g. { framing: "independent" }. */
export type Perturbation = Record<string, string>;

export interface SweepDimension {
  name: string;
  values: string[];
}

export interface SweepOptions {
  /** The axes to vary. Their cartesian product × repetitions = the run set. */
  dimensions: SweepDimension[];
  /** Runs per perturbation combo (within-combo spread comes from LLM sampling). */
  repetitions?: number;
  baseSeed?: number;
  /** Concurrent cascades. */
  runConcurrency?: number;
  /** Per-cascade LLM concurrency. */
  concurrency?: number;
  maxTicks?: number;
  temperature?: number;
  /** Called after each cascade resolves — for progress visibility. */
  onProgress?: (done: number, total: number) => void;
  /** Called when a single run fails; the sweep drops it and continues. */
  onError?: (perturbation: Perturbation, error: unknown) => void;
}

function combos(dims: SweepDimension[]): Perturbation[] {
  let acc: Perturbation[] = [{}];
  for (const d of dims) {
    const next: Perturbation[] = [];
    for (const a of acc) for (const v of d.values) next.push({ ...a, [d.name]: v });
    acc = next;
  }
  return acc;
}

/**
 * Produce a perturbed copy of the world for one point in perturbation space.
 * Each known dimension mutates initial conditions so runs genuinely diverge —
 * this is what gives the Monte Carlo real signal (and a real pivotal variable).
 */
export function applyPerturbation(
  world: World,
  seedId: string,
  p: Perturbation,
): World {
  const w = structuredClone(world);
  const clampSent = (x: number): number => Math.max(-1, Math.min(1, x));

  // acquisitionMessagingFraming — the headline DECISION lever. It rewrites the
  // seed messaging AND tilts initial conditions, because "deeply integrated into
  // Microsoft 365" genuinely alarms the craft/community base far more than "stays
  // independent". This is a STRONG-BUT-SOFT push (a sentiment DELTA, not a clamp):
  // framing stays the dominant signal, but it no longer *perfectly* determines the
  // outcome, so the pivotal lands at a credible ~60% instead of a too-clean 100%,
  // and leaves room for competitorSpeed to carve out its own regime.
  const seed = w.seeds.find((s) => s.id === seedId);
  const framing = p.acquisitionMessagingFraming;
  if (framing) {
    const integrated = framing === "integrated";
    if (seed) {
      seed.payload = integrated
        ? "Microsoft has acquired Notion. The official announcement emphasizes that Notion will be deeply integrated into Microsoft 365 and Copilot."
        : "Microsoft has acquired Notion. The official announcement emphasizes that Notion will keep operating independently — its own brand, team, and design culture.";
    }
    for (const n of w.nodes) {
      if (
        /power-user|ambassador|designer|prosumer|creator|community|reddit|discord|hacker|productivity|enthusiast|switch/i.test(
          `${n.id} ${n.label} ${n.dossier}`,
        )
      ) {
        n.initialState.mood.sentiment = clampSent(
          n.initialState.mood.sentiment + (integrated ? -0.45 : 0.25),
        );
        if (integrated) {
          n.initialState.mood.urgency = Math.max(n.initialState.mood.urgency, 0.4);
        }
      }
    }
  }

  // pressClimate — a SECONDARY lever: a softer tilt to journalists' disposition.
  if (p.pressClimate) {
    const skeptical = p.pressClimate === "skeptical";
    for (const n of w.nodes) {
      if (
        /newton|heath|swisher|thompson|newcomer|journalist|verge|platformer|stratechery|information|bloomberg|techcrunch|analyst/i.test(
          `${n.id} ${n.label} ${n.dossier}`,
        )
      ) {
        n.initialState.mood.sentiment = skeptical
          ? Math.min(n.initialState.mood.sentiment, -0.2)
          : Math.max(n.initialState.mood.sentiment, 0.1);
      }
    }
  }

  // competitorSpeed — fast competitors don't just react harder, they OPEN A
  // SECOND FRONT: energized, confident competitors (positive + urgent + low
  // threshold) plus a restless power-user base eyeing the exits. This is a
  // distinct outcome axis from framing's community-sentiment swing — competitor
  // activity shows up in the fingerprint on its own — so `fast` runs cluster into
  // their own "competitor wins" regime rather than just deepening backlash.
  if (p.competitorSpeed) {
    const fast = p.competitorSpeed === "fast";
    for (const n of w.nodes) {
      const tag = `${n.id} ${n.label} ${n.dossier}`;
      if (/linear|coda|clickup|asana|airtable|obsidian|competitor/i.test(`${n.id} ${n.label}`)) {
        if (fast) {
          n.activationThreshold = Math.max(0, n.activationThreshold - 0.2);
          n.initialState.mood.urgency = Math.max(n.initialState.mood.urgency, 0.6);
          // confident: they smell an opening, sentiment turns positive for them.
          n.initialState.mood.sentiment = Math.max(n.initialState.mood.sentiment, 0.35);
        } else {
          n.activationThreshold = n.activationThreshold + 0.1;
        }
      } else if (
        fast &&
        /power-user|ambassador|prosumer|creator|community|reddit|discord|hacker|enthusiast|switch/i.test(
          tag,
        )
      ) {
        // a credible alternative moving fast makes the base restless — they start
        // weighing the exits, independent of how the deal itself was framed.
        n.initialState.mood.urgency = Math.max(n.initialState.mood.urgency, 0.5);
        n.initialState.mood.sentiment = clampSent(n.initialState.mood.sentiment - 0.2);
      }
    }
  }

  return w;
}

/**
 * Run a Monte Carlo sweep: every (perturbation combo × repetition) is a cascade,
 * tagged with its perturbation in `meta`. Feed the result to @wake/analysis to
 * cluster outcomes and find the pivotal variable.
 */
export async function sweep(
  world: World,
  seedId: string,
  deps: RunDeps,
  opts: SweepOptions,
): Promise<Cascade[]> {
  const reps = opts.repetitions ?? 1;
  const baseSeed = opts.baseSeed ?? 1;
  const tasks: { p: Perturbation; seed: number }[] = [];
  let i = 0;
  for (const p of combos(opts.dimensions)) {
    for (let r = 0; r < reps; r++) {
      tasks.push({ p, seed: baseSeed + i });
      i++;
    }
  }
  let done = 0;
  const total = tasks.length;
  // Per-run resilience: a single failed cascade (e.g. a transient network
  // ECONNRESET) is dropped, not allowed to abort the whole sweep. A few
  // survivors fewer is fine for clustering; losing all N is not.
  const results = await mapWithConcurrency(tasks, opts.runConcurrency ?? 4, async (t) => {
    try {
      const cascade = await runCascade(
        applyPerturbation(world, seedId, t.p),
        seedId,
        deps,
        {
          seed: t.seed,
          perturbation: t.p,
          concurrency: opts.concurrency,
          maxTicks: opts.maxTicks,
          temperature: opts.temperature,
        },
      );
      opts.onProgress?.(++done, total);
      return cascade;
    } catch (err) {
      opts.onProgress?.(++done, total);
      opts.onError?.(t.p, err);
      return null;
    }
  });
  return results.filter((c): c is Cascade => c !== null);
}
