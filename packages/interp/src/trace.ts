import type { Cascade, Event } from "@wake/contracts";

const STOP = new Set([
  "the", "and", "for", "with", "why", "did", "does", "was", "were", "are",
  "this", "that", "its", "their", "they", "turn", "become", "get", "got",
  "how", "what", "who", "when", "into", "from", "have", "has",
]);

/** Significant lowercase tokens from a question (keeps node-id-like tokens). */
export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Events whose source/target/channel/content mention any question token. */
export function focusEvents(cascade: Cascade, question: string): Event[] {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];
  return cascade.eventDag.filter((e) => {
    const hay = `${e.source} ${e.target} ${e.channel} ${e.content}`.toLowerCase();
    return tokens.some((t) => hay.includes(t));
  });
}

/** Walk causedBy backwards from the given events, returning the union, time-sorted. */
export function ancestorChain(cascade: Cascade, events: Event[]): Event[] {
  const byId = new Map(cascade.eventDag.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const out: Event[] = [];
  const visit = (e: Event): void => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    out.push(e);
    if (e.causedBy) {
      const parent = byId.get(e.causedBy);
      if (parent) visit(parent);
    }
  };
  for (const e of events) visit(e);
  return out.sort((a, b) => a.time - b.time);
}

/**
 * The chain of events relevant to a question: the events that mention it plus
 * everything upstream that caused them. Falls back to the tail of the cascade
 * if nothing matches.
 */
export function relevantSubgraph(cascade: Cascade, question: string): Event[] {
  let focus = focusEvents(cascade, question);
  if (focus.length === 0) focus = cascade.eventDag.slice(-5);
  return ancestorChain(cascade, focus);
}
