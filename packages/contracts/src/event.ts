import { z } from "zod";

/**
 * The kinds of thing a node can emit.
 *  - public_post:      visible to the public layer (tweet, press, blog)
 *  - private_message:  visible only on the private layer (DM, internal Slack)
 *  - decision:         an internal resolution (may or may not produce action)
 *  - action:           a concrete world-changing act
 *  - emergent:         system-generated (a leak, a Blind post) when divergence
 *                      between public and private crosses a threshold
 */
export const EventTypeSchema = z.enum([
  "public_post",
  "private_message",
  "decision",
  "action",
  "emergent",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * The unit that flows through the graph. Every event carries its provenance
 * (`causedBy`) so the full cascade forms a DAG that the interpretability layer
 * can trace backwards through.
 */
export const EventSchema = z.object({
  id: z.string(),
  type: EventTypeSchema,
  /** Originating node id (or "world" for the injected seed). */
  source: z.string(),
  /** Receiving node id. */
  target: z.string(),
  /** Platform / edge id the event travelled over. */
  channel: z.string(),
  content: z.string(),
  /** World-clock time at which the event was emitted. */
  time: z.number(),
  /** Parent event id, or null for a seed. Forms the cascade DAG. */
  causedBy: z.string().nullable(),
  /** First-person, one-sentence reason the originator emitted this. */
  rationale: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;
