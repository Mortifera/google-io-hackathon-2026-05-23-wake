import type { Cascade } from "./cascade";
import type { LLMClient } from "./llm";

/** A traced, grounded answer to a "why did X happen" question. */
export interface Explanation {
  answer: string;
  /** Event ids cited in the answer (the upstream chain). */
  citedEventIds: string[];
}

/**
 * Interpretability contract (implemented by `@wake/interp`).
 * Traces backwards through the cascade DAG and narrates the cause.
 */
export type Explain = (
  cascade: Cascade,
  question: string,
  llm: LLMClient,
) => Promise<Explanation>;
