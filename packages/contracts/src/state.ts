import { z } from "zod";

/**
 * A node's affective disposition. Drives both behaviour (in tick functions)
 * and colour (in the visualization).
 *  - attention: 0..1   how much this node is currently paying attention
 *  - sentiment: -1..1  how negative/positive it feels about the focal topic
 *  - urgency:   0..1    how much it feels it must act now
 */
export const MoodSchema = z.object({
  attention: z.number().min(0).max(1),
  sentiment: z.number().min(-1).max(1),
  urgency: z.number().min(0).max(1),
});
export type Mood = z.infer<typeof MoodSchema>;

/**
 * The mutable per-node state. Everything the tick function reads and writes,
 * and everything the viz needs to render a node at a point in time.
 */
export const NodeStateSchema = z.object({
  /** Compressed current beliefs about the world / focal topic. */
  beliefs: z.string(),
  mood: MoodSchema,
  /** What this node would say externally right now. */
  publicFace: z.string(),
  /** What this node actually thinks right now (may diverge from publicFace). */
  privateInterior: z.string(),
  /** Capped log of recent events this node received or acted on. */
  history: z.array(z.string()),
  /** Things the node has publicly committed to do. */
  commitments: z.array(z.string()),
  /** Depletes as the node attends to events; drives saturation. */
  attentionBudget: z.number().min(0),
  /** Whether the node acted on the most recent tick (for animation). */
  active: z.boolean(),
});
export type NodeState = z.infer<typeof NodeStateSchema>;

/** A map of nodeId -> NodeState. */
export const NodeStateMapSchema = z.record(z.string(), NodeStateSchema);
export type NodeStateMap = z.infer<typeof NodeStateMapSchema>;
