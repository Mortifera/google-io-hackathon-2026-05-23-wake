import type { Explain } from "@wake/contracts";

/**
 * Interpretability. STUB — owned by L7 (see briefs/L7-interp.md).
 *
 * Trace backwards through `cascade.eventDag` from the events relevant to the
 * question, then make one Flash call that narrates the cause and cites the
 * upstream event ids. Build against the fixture cascade — no kernel dependency.
 */
export const explain: Explain = async (_cascade, _question, _llm) => {
  throw new Error("explain not implemented yet (L7). See briefs/L7-interp.md");
};
