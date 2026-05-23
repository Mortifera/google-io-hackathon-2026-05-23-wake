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

  // framing — rewrite the acquisition messaging the seed injects.
  const seed = w.seeds.find((s) => s.id === seedId);
  if (p.framing && seed) {
    seed.payload =
      p.framing === "integrated"
        ? "Microsoft has acquired Notion. The official announcement emphasizes that Notion will be deeply integrated into Microsoft 365 and Copilot."
        : "Microsoft has acquired Notion. The official announcement emphasizes that Notion will keep operating independently — its own brand, team, and design culture.";
  }

  // pressClimate — tilt the journalists' starting disposition.
  if (p.pressClimate) {
    const skeptical = p.pressClimate === "skeptical";
    for (const n of w.nodes) {
      if (
        /newton|heath|swisher|thompson|newcomer|journalist|verge|platformer|stratechery|information|bloomberg|techcrunch|analyst/i.test(
          `${n.id} ${n.label} ${n.dossier}`,
        )
      ) {
        n.initialState.mood.sentiment = skeptical
          ? Math.min(n.initialState.mood.sentiment, -0.4)
          : Math.max(n.initialState.mood.sentiment, 0.15);
      }
    }
  }

  // competitorSpeed — fast competitors are primed to pounce.
  if (p.competitorSpeed) {
    const fast = p.competitorSpeed === "fast";
    for (const n of w.nodes) {
      if (/linear|coda|clickup|asana|airtable|obsidian|competitor/i.test(`${n.id} ${n.label}`)) {
        if (fast) {
          n.activationThreshold = Math.max(0, n.activationThreshold - 0.15);
          n.initialState.mood.urgency = Math.max(n.initialState.mood.urgency, 0.55);
        } else {
          n.activationThreshold = n.activationThreshold + 0.1;
        }
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
