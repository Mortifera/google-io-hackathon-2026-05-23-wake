/**
 * Deterministic, seedable PRNG (mulberry32). Same seed → same sequence, which
 * is what makes Monte Carlo branching reproducible: each run gets seed = base+i.
 */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** Pick a random element. */
  pick<T>(arr: readonly T[]): T;
  /** Float in [min, max). */
  float(min: number, max: number): number;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    pick: <T>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error("pick() on empty array");
      return arr[Math.floor(next() * arr.length)] as T;
    },
  };
}
