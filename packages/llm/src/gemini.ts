import type {
  LLMClient,
  CompleteArgs,
  LLMResult,
} from "@wake/contracts";

/**
 * Real Gemini Flash client. STUB — owned by L2 (see briefs/L2-llm.md).
 *
 * Responsibilities for L2:
 *  - call Gemini 3.5 Flash (Vertex or the Gemini API) with structured output
 *    (responseSchema / JSON mode), validating the result against `args.schema`,
 *  - cache the system prompt (the per-node dossier) and report `usage.cached`,
 *  - retry with backoff on 429/5xx, bound concurrency (mapWithConcurrency),
 *  - account cost in `usage.costUsd`.
 *
 * Until implemented, calling complete() throws so nothing silently no-ops; use
 * MockLLMClient for offline dev (it is the default in the kernel).
 */
export interface GeminiOptions {
  apiKey?: string;
  model?: string; // e.g. "gemini-3.5-flash"
  /** Max in-flight requests. */
  concurrency?: number;
}

export class GeminiLLMClient implements LLMClient {
  constructor(private readonly opts: GeminiOptions = {}) {}

  async complete<T>(_args: CompleteArgs): Promise<LLMResult<T>> {
    throw new Error(
      "GeminiLLMClient.complete not implemented yet (L2). Use MockLLMClient for now.",
    );
  }
}
