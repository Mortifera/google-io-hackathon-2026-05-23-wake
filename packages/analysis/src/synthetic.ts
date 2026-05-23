import type { Cascade } from "@wake/contracts";
import { clamp } from "./stats";

/**
 * Offline cascade generator for building and testing the analysis without the
 * kernel. We take one real fixture cascade and perturb its finalState into
 * regimes that *should* fall into distinct clusters, tagging each run with the
 * perturbation that drove it. This lets us assert that analyze() recovers the
 * right clusters and the right pivotal variable.
 *
 * Everything is deterministic (seeded RNG), and every emitted cascade stays
 * within the contract's value ranges so it still parses as a Cascade.
 */

/** Deterministic, dependency-free PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RegimeSpec {
  /** How many runs to draw from this regime. */
  count: number;
  /** Perturbation recorded on every run in this regime (the input dials). */
  perturbation: Record<string, unknown>;
  /** Added to every node's final sentiment. */
  sentimentBias: number;
  /** Overrides applied to specific nodes' final sentiment (post-bias). */
  perNodeSentiment?: Record<string, number>;
  /** Final public/private divergence count for runs in this regime. */
  divergence: number;
  /** Optional noise dial: a numeric perturbation drawn uniformly per run. */
  noiseDials?: Record<string, [number, number]>;
}

/** Build one perturbed cascade from a base fixture cascade. */
export function perturbCascade(
  base: Cascade,
  spec: RegimeSpec,
  seed: number,
): Cascade {
  const rand = rng(seed);
  const c: Cascade = structuredClone(base);

  for (const [nodeId, state] of Object.entries(c.finalState)) {
    const override = spec.perNodeSentiment?.[nodeId];
    const jitter = (rand() - 0.5) * 0.1; // ±0.05
    const target = (override ?? state.mood.sentiment + spec.sentimentBias) + jitter;
    state.mood.sentiment = clamp(target, -1, 1);
  }

  // Resolve any per-run noise dials into concrete numbers.
  const perturbation: Record<string, unknown> = { ...spec.perturbation };
  for (const [k, [lo, hi]] of Object.entries(spec.noiseDials ?? {})) {
    perturbation[k] = +(lo + rand() * (hi - lo)).toFixed(3);
  }

  c.meta = { ...c.meta, seed, perturbation };
  c.divergence = [
    { tick: 0, count: 0 },
    { tick: 4, count: spec.divergence },
  ];
  return c;
}

/** Draw `spec.count` cascades from a regime, with distinct seeds. */
export function drawRegime(base: Cascade, spec: RegimeSpec, seedBase: number): Cascade[] {
  return Array.from({ length: spec.count }, (_, i) => perturbCascade(base, spec, seedBase + i));
}

/**
 * A demo-ready Monte Carlo set: three regimes separated by a categorical
 * `messagingFraming` dial (plus two uncorrelated numeric noise dials). Framing
 * should come out as the pivotal variable.
 */
export function syntheticCascades(base: Cascade): Cascade[] {
  const noiseDials = {
    seedTiming: [0, 24] as [number, number],
    competitorAggression: [0, 1] as [number, number],
  };

  const regimes: RegimeSpec[] = [
    {
      count: 6,
      perturbation: { messagingFraming: "independent" },
      sentimentBias: 0.5,
      perNodeSentiment: { "linear-leadership": 0.2 },
      divergence: 1,
      noiseDials,
    },
    {
      count: 5,
      perturbation: { messagingFraming: "integrated" },
      sentimentBias: -0.4,
      divergence: 3,
      noiseDials,
    },
    {
      count: 4,
      perturbation: { messagingFraming: "leaked" },
      sentimentBias: -0.3,
      perNodeSentiment: { "linear-leadership": 0.9 },
      divergence: 4,
      noiseDials,
    },
  ];

  let seed = 1000;
  const out: Cascade[] = [];
  for (const r of regimes) {
    out.push(...drawRegime(base, r, seed));
    seed += 100;
  }
  return out;
}
