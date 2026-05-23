import type { Event } from "@wake/contracts";
import type { CascadeModel, GraphModel } from "./model";
import { classifyAffect, affectStyle } from "./palette";

/**
 * Local interpretability — a real trace-back over the cascade's `causedBy` DAG,
 * narrated. This is the same algorithm `@wake/interp` runs; here the final
 * narration is templated rather than written by Flash. At CP3 the prose
 * generation is swapped for the live `explain()` call, but the traced chain and
 * the cited event ids stay identical, so the panel keeps working throughout.
 */
export interface ExplanationResult {
  answer: string;
  citedEventIds: string[];
  /** The ordered cause chain (root → leaf), for visual rendering. */
  chain: Event[];
  /** Whether this came from the local stub (vs. the live model). */
  source: "local-trace" | "model";
}

/** Walk `causedBy` from an event back to its root, returning root→leaf order. */
export function traceBack(model: CascadeModel, fromEventId: string): Event[] {
  const chain: Event[] = [];
  const seen = new Set<string>();
  let cur: Event | undefined = model.eventById.get(fromEventId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.causedBy ? model.eventById.get(cur.causedBy) : undefined;
  }
  return chain;
}

/** The single most defining event for a node: latest one it received, else its
 * latest action. This is the leaf we trace back from. */
function definingEvent(model: CascadeModel, nodeId: string): Event | undefined {
  const incoming = model.eventDag.filter((e) => e.target === nodeId);
  const outgoing = model.eventDag.filter((e) => e.source === nodeId);
  const pool = incoming.length ? incoming : outgoing;
  if (!pool.length) return undefined;
  return pool.reduce((a, b) => (b.time >= a.time ? b : a));
}

const CONNECTORS = [
  "From there,",
  "In turn,",
  "That fed forward:",
  "Then,",
  "Which spilled over:",
  "And finally,",
];

function labelOf(graph: GraphModel, id: string): string {
  if (id === "world") return "The injected action";
  return graph.nodes.find((n) => n.id === id)?.label ?? id;
}

function narrate(
  graph: GraphModel,
  chain: Event[],
  leadIn: string,
): string {
  if (!chain.length) return `${leadIn} No upstream cause was found in the DAG.`;
  const parts: string[] = [leadIn, "Tracing the cascade back:"];
  chain.forEach((e, i) => {
    if (i === 0) {
      parts.push(`it began with “${e.content}” [${e.id}].`);
    } else {
      const c = CONNECTORS[Math.min(i - 1, CONNECTORS.length - 1)];
      parts.push(`${c} “${e.content}” [${e.id}].`);
    }
  });
  return parts.join(" ");
}

export function explainNode(
  model: CascadeModel,
  graph: GraphModel,
  nodeId: string,
): ExplanationResult {
  const leaf = definingEvent(model, nodeId);
  const chain = leaf ? traceBack(model, leaf.id) : [];
  const label = labelOf(graph, nodeId);
  const finalStates = model.resolvedStates[model.resolvedStates.length - 1];
  const st = finalStates?.[nodeId];
  const affect = st ? affectStyle(st) : null;
  const lead = affect
    ? `${label} ends ${affect.label.toLowerCase()} (${affect.blurb}).`
    : `${label}:`;
  return {
    answer: narrate(graph, chain, lead),
    citedEventIds: chain.map((e) => e.id),
    chain,
    source: "local-trace",
  };
}

export function explainEvent(
  model: CascadeModel,
  graph: GraphModel,
  eventId: string,
): ExplanationResult {
  const chain = traceBack(model, eventId);
  const ev = model.eventById.get(eventId);
  const lead = ev
    ? `Why ${labelOf(graph, ev.source)} → ${labelOf(graph, ev.target)} [${ev.id}] happened.`
    : "This event:";
  return {
    answer: narrate(graph, chain, lead),
    citedEventIds: chain.map((e) => e.id),
    chain,
    source: "local-trace",
  };
}

export { classifyAffect };
