import type { World, Cascade } from "@wake/contracts";

/**
 * Build a world whose initial conditions are a cascade's FINAL state — i.e.
 * "the world as it stands AFTER this cascade happened." Running a new action in
 * this mutated world is how Wake shows the same action playing out differently
 * in a changed world (the pre- vs. post-acquisition beat): each node carries the
 * beliefs/mood it ended the prior cascade with, so e.g. managers now react to a
 * new idea through their post-acquisition disposition.
 *
 * Attention budget is reset (the prior cascade depleted it) and `active` cleared,
 * so nodes are free to react to the new action.
 */
export function mutateWorldFromCascade(world: World, cascade: Cascade): World {
  const w = structuredClone(world);
  for (const n of w.nodes) {
    const finalState = cascade.finalState[n.id];
    if (!finalState) continue;
    n.initialState = {
      ...structuredClone(finalState),
      active: false,
      attentionBudget: 1,
    };
  }
  return w;
}
