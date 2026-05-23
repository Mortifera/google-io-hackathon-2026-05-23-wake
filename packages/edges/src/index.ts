import type { EdgeTransform } from "@wake/contracts";

/**
 * Per-edge behaviour. STUB — owned by L4 (see briefs/L4-edges.md).
 *
 * Implement the ~6 load-bearing LLM channel archetypes (EDGE_ARCHETYPES) and
 * deterministic light-edge rules. Return a transformed event, or null to kill
 * it on this edge. The kernel injects this as `deps.edgeTransform`.
 */
export const edgeTransform: EdgeTransform = async (
  event,
  _source,
  _target,
  edge,
  _llm,
) => {
  if (!edge.llmMediated) return event; // light edges pass through for now
  throw new Error("edgeTransform not implemented yet (L4). See briefs/L4-edges.md");
};
