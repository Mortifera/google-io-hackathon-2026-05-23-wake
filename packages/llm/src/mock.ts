import type {
  LLMClient,
  CompleteArgs,
  LLMResult,
  LLMUsage,
} from "@wake/contracts";
import { ZERO_USAGE } from "@wake/contracts";

/**
 * A responder decides what `data` a mock `complete()` call returns. It receives
 * the call args so it can branch on `args.user` / `args.cacheKey`. Return any
 * object shaped like the caller's expected `T`.
 */
export type MockResponder = (args: CompleteArgs) => unknown;

export interface MockLLMOptions {
  responder?: MockResponder;
  /** Synthetic latency per call (ms) to make cascades feel paced in dev. */
  latencyMs?: number;
  /** Fake usage reported per call. */
  usage?: LLMUsage;
}

/**
 * Deterministic, offline LLMClient. This is the default everywhere until L2's
 * real Gemini client lands, and it stays the default in tests and CI so we
 * never spend money to run the kernel.
 *
 * Workers building node/edge behaviour should pass their own `responder` that
 * returns plausible structured outputs for their prompts.
 */
export class MockLLMClient implements LLMClient {
  private calls = 0;
  constructor(private readonly opts: MockLLMOptions = {}) {}

  get callCount(): number {
    return this.calls;
  }

  async complete<T>(args: CompleteArgs): Promise<LLMResult<T>> {
    this.calls++;
    if (this.opts.latencyMs) {
      await new Promise((r) => setTimeout(r, this.opts.latencyMs));
    }
    const data = (this.opts.responder ? this.opts.responder(args) : {}) as T;
    return { data, usage: this.opts.usage ?? ZERO_USAGE };
  }
}

/** Convenience: a mock that always returns the same canned object. */
export function cannedLLM(data: unknown, opts: MockLLMOptions = {}): MockLLMClient {
  return new MockLLMClient({ ...opts, responder: () => data });
}
