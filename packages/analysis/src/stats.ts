/**
 * Tiny numeric helpers for the Monte Carlo analysis. Hand-rolled on purpose —
 * N is small (tens of runs), so we avoid a scipy/ml-matrix dependency and keep
 * everything deterministic and easy to read.
 */

export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, x));

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/** Population variance (divides by N), which is what we want for η² and z-scores. */
export const variance = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) ** 2));
};

export const std = (xs: readonly number[]): number => Math.sqrt(variance(xs));

export const euclidean = (a: readonly number[], b: readonly number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
};

/** Column-wise mean of a row-major matrix (the centroid of a set of vectors). */
export const centroid = (rows: readonly number[][]): number[] => {
  if (rows.length === 0) return [];
  const dim = rows[0]!.length;
  const out = new Array<number>(dim).fill(0);
  for (const row of rows) {
    for (let j = 0; j < dim; j++) out[j]! += row[j] ?? 0;
  }
  for (let j = 0; j < dim; j++) out[j]! /= rows.length;
  return out;
};

/**
 * Standardize each column to zero mean / unit variance so no single feature
 * (e.g. sentiment on [-1,1] vs attention on [0,1]) dominates the distance.
 * Constant columns (std 0) collapse to 0 and stop contributing.
 */
export const standardizeColumns = (rows: readonly number[][]): number[][] => {
  if (rows.length === 0) return [];
  const dim = rows[0]!.length;
  const means: number[] = [];
  const stds: number[] = [];
  for (let j = 0; j < dim; j++) {
    const col = rows.map((r) => r[j] ?? 0);
    means[j] = mean(col);
    stds[j] = std(col);
  }
  return rows.map((r) =>
    r.map((v, j) => (stds[j]! === 0 ? 0 : (v - means[j]!) / stds[j]!)),
  );
};
