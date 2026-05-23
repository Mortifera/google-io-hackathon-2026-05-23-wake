import { z } from "zod";
import { NodeStateSchema } from "./state";
import { EventSchema } from "./event";
import { NodeDefSchema } from "./world";
import type { LLMClient } from "./llm";
import type { NodeState } from "./state";
import type { Event } from "./event";
import type { NodeDef } from "./world";

/**
 * Per-node behaviour contract (implemented by `@wake/nodes`).
 * The kernel calls this by dependency injection — it never imports node code.
 */
export const TickInputSchema = z.object({
  node: NodeDefSchema,
  state: NodeStateSchema,
  /** Events received but not yet acted on. */
  inbox: z.array(EventSchema),
  /** Current world-clock time. */
  clock: z.number(),
});
export type TickInput = z.infer<typeof TickInputSchema>;

export const TickOutputSchema = z.object({
  /** Field-level updates to apply to the node's state. */
  stateDelta: NodeStateSchema.partial(),
  /** Events the node emits this tick, with explicit targets. */
  outgoing: z.array(EventSchema),
  /** One-sentence first-person reason, surfaced by the interpretability layer. */
  rationale: z.string(),
});
export type TickOutput = z.infer<typeof TickOutputSchema>;

/**
 * A single Flash call: (state, inbox, clock) -> (delta, events, rationale).
 * The `llm` is injected so nodes can be tested against the mock.
 */
export type TickFn = (input: TickInput, llm: LLMClient) => Promise<TickOutput>;

// Re-export the shapes a TickFn implementer will reference.
export type { NodeState, Event, NodeDef, LLMClient };
