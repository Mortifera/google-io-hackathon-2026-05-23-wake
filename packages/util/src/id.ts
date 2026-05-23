/**
 * Tiny deterministic id generator. Pass a per-run counter source so ids are
 * stable across replays of the same seed (don't use Math.random here).
 */
export function makeIdGen(prefix = "e"): () => string {
  let n = 0;
  return () => `${prefix}${(++n).toString(36)}`;
}
