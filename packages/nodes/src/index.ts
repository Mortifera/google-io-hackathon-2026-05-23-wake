import type { TickFn } from "@wake/contracts";

/**
 * Per-node behaviour. STUB — owned by L3 (see briefs/L3-nodes.md).
 *
 * Build the prompt that turns (state, inbox, clock) into
 * (stateDelta, outgoing events, rationale), validate the structured output
 * against TickOutputSchema, and tune it against a historical Notion event
 * (the eval). The kernel injects this as `deps.tickFn`.
 */
export const tickFn: TickFn = async (_input, _llm) => {
  throw new Error("tickFn not implemented yet (L3). See briefs/L3-nodes.md");
};
