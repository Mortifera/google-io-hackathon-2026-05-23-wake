import type { Event } from "./event";
import type { NodeDef, EdgeDef } from "./world";
import type { LLMClient } from "./llm";

/**
 * Per-edge behaviour contract (implemented by `@wake/edges`).
 *
 * When an event traverses a load-bearing (llmMediated) edge this runs as a
 * Flash call that filters / distorts / amplifies / kills the event. For light
 * edges it is a cheap deterministic transform driven by the edge's character
 * and weight. Returning `null` means the event dies on this edge.
 */
export type EdgeTransform = (
  event: Event,
  source: NodeDef,
  target: NodeDef,
  edge: EdgeDef,
  llm: LLMClient,
) => Promise<Event | null>;

/** Canonical load-bearing edge archetypes. Light edges use deterministic rules. */
export const EDGE_ARCHETYPES = [
  "journalist->audience",
  "employee->manager",
  "customer->cohort",
  "competitor->strategy",
  "platform-amplification",
  "friend->friend",
] as const;
export type EdgeArchetype = (typeof EDGE_ARCHETYPES)[number];
