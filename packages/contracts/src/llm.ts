/**
 * The model contract. Implemented by `@wake/llm` (real Gemini Flash client plus
 * a deterministic mock). Injected into every subsystem that reasons.
 */

export interface LLMUsage {
  inTokens: number;
  outTokens: number;
  /** Tokens served from the prompt cache (the dossier system prompt). */
  cached: number;
  costUsd: number;
}

export interface CompleteArgs<TSchema = unknown> {
  /** System prompt — typically the cached per-node dossier + output schema. */
  system: string;
  /** Per-call input — current state, inbox, world clock. */
  user: string;
  /** JSON schema (or zod schema) describing the required structured output. */
  schema: TSchema;
  /** Sampling temperature. Monte Carlo divergence comes from raising this. */
  temperature?: number;
  maxTokens?: number;
  /** Optional cache key/tag for the system prompt. */
  cacheKey?: string;
}

export interface LLMResult<T> {
  data: T;
  usage: LLMUsage;
}

export interface LLMClient {
  complete<T>(args: CompleteArgs): Promise<LLMResult<T>>;
}

export const ZERO_USAGE: LLMUsage = {
  inTokens: 0,
  outTokens: 0,
  cached: 0,
  costUsd: 0,
};
