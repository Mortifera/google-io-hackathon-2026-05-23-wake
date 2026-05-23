import { describe, it, expect } from "vitest";
import { z } from "zod";
import type { LLMClient, CompleteArgs } from "@wake/contracts";
import { ZERO_USAGE } from "@wake/contracts";
import { MockLLMClient } from "./mock";
import {
  GeminiLLMClient,
  GeminiSchemaError,
  RealGeminiTransport,
  toJsonSchema,
  httpStatusOf,
  isNetworkError,
  isRetryableError,
  withRetry,
  type GeminiTransport,
  type GeminiRawResponse,
  type GeminiGenerateRequest,
  type GeminiCacheHandle,
  type GeminiCreateCacheRequest,
} from "./gemini";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const DecisionSchema = z.object({
  decision: z.enum(["post", "stay_silent", "escalate"]),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  emit: z.array(z.object({ type: z.string(), content: z.string() })).optional(),
});
type Decision = z.infer<typeof DecisionSchema>;

const VALID: Decision = {
  decision: "post",
  rationale: "The narrative is shifting and silence reads as guilt.",
  confidence: 0.8,
};

const ARGS: CompleteArgs = {
  system: "You are a cautious comms lead. Dossier: ...",
  user: "Inbox: a journalist just asked for comment. Clock: t=3.",
  schema: DecisionSchema,
  temperature: 0.7,
};

const USAGE = { promptTokens: 1000, outputTokens: 200, cachedTokens: 0, thoughtTokens: 0 };

function ok(data: unknown, usage = USAGE): GeminiRawResponse {
  return { text: JSON.stringify(data), usage };
}

function status(code: number, message = `http ${code}`): Error {
  return Object.assign(new Error(message), { status: code });
}

/** Build an undici-style `TypeError: fetch failed` wrapping a network code. */
function fetchFailed(code = "ECONNRESET"): Error {
  return Object.assign(new TypeError("fetch failed"), {
    cause: Object.assign(new Error(`network error: ${code}`), { code }),
  });
}

/** Transport that replays `steps` (errors are thrown), repeating the last step. */
function makeTransport(
  steps: Array<GeminiRawResponse | Error>,
  extra: Partial<GeminiTransport> = {},
) {
  const calls: GeminiGenerateRequest[] = [];
  let i = 0;
  const transport: GeminiTransport = {
    async generate(req) {
      calls.push({ ...req });
      const step = steps[Math.min(i, steps.length - 1)];
      i++;
      if (step instanceof Error) throw step;
      return step!;
    },
    ...extra,
  };
  return { transport, calls };
}

/** No-op sleep so backoff tests don't actually wait. */
const NO_SLEEP = () => Promise.resolve();

/* -------------------------------------------------------------------------- */
/* Contract conformance                                                       */
/* -------------------------------------------------------------------------- */

describe("LLMClient conformance", () => {
  it("both the mock and Gemini clients satisfy LLMClient", async () => {
    const { transport } = makeTransport([ok(VALID)]);
    const clients: LLMClient[] = [new MockLLMClient(), new GeminiLLMClient({ transport })];
    expect(clients).toHaveLength(2);
    for (const c of clients) expect(typeof c.complete).toBe("function");
  });

  it("MockLLMClient returns the responder's data with zero usage (the test default)", async () => {
    const mock = new MockLLMClient({ responder: () => VALID });
    const res = await mock.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
    expect(res.usage).toEqual(ZERO_USAGE);
  });
});

/* -------------------------------------------------------------------------- */
/* Happy path + structured output                                             */
/* -------------------------------------------------------------------------- */

describe("GeminiLLMClient.complete — structured output", () => {
  it("returns schema-valid data and forwards the request", async () => {
    const { transport, calls } = makeTransport([ok(VALID)]);
    const client = new GeminiLLMClient({ transport, model: "gemini-3.5-flash" });
    const res = await client.complete<Decision>(ARGS);

    expect(res.data).toEqual(VALID);
    expect(() => DecisionSchema.parse(res.data)).not.toThrow();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      model: "gemini-3.5-flash",
      system: ARGS.system,
      user: ARGS.user,
      temperature: 0.7,
    });
    // The zod schema was converted and passed as a JSON schema.
    expect(calls[0]!.jsonSchema).toBeDefined();
  });

  it("tolerates a ```json code fence around the JSON", async () => {
    const fenced: GeminiRawResponse = {
      text: "```json\n" + JSON.stringify(VALID) + "\n```",
      usage: USAGE,
    };
    const { transport } = makeTransport([fenced]);
    const client = new GeminiLLMClient({ transport });
    const res = await client.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
  });

  it("passes through data unvalidated when schema is not a zod schema", async () => {
    const { transport } = makeTransport([ok({ anything: true })]);
    const client = new GeminiLLMClient({ transport });
    const res = await client.complete<{ anything: boolean }>({
      ...ARGS,
      schema: { type: "object" }, // plain JSON schema, not zod
    });
    expect(res.data).toEqual({ anything: true });
  });
});

/* -------------------------------------------------------------------------- */
/* JSON / schema validation + retry                                           */
/* -------------------------------------------------------------------------- */

describe("GeminiLLMClient.complete — JSON validation", () => {
  it("retries when the reply is not parseable JSON, then succeeds", async () => {
    const garbage: GeminiRawResponse = { text: "not json at all", usage: USAGE };
    const { transport, calls } = makeTransport([garbage, ok(VALID)]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    const res = await client.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
    expect(calls).toHaveLength(2);
  });

  it("retries when the reply parses but fails the zod schema, then succeeds", async () => {
    const wrongShape = ok({ decision: "nope", rationale: 5, confidence: 2 });
    const { transport, calls } = makeTransport([wrongShape, ok(VALID)]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    const res = await client.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
    expect(calls).toHaveLength(2);
  });

  it("throws GeminiSchemaError after exhausting jsonRetries", async () => {
    const wrongShape = ok({ not: "a decision" });
    const { transport, calls } = makeTransport([wrongShape]);
    const client = new GeminiLLMClient({ transport, jsonRetries: 1, sleep: NO_SLEEP });
    await expect(client.complete(ARGS)).rejects.toBeInstanceOf(GeminiSchemaError);
    expect(calls).toHaveLength(2); // 1 + jsonRetries
  });

  it("sets the native Error cause (not a shadowing field) on GeminiSchemaError", async () => {
    const { transport } = makeTransport([ok({ not: "a decision" })]);
    const client = new GeminiLLMClient({ transport, jsonRetries: 0, sleep: NO_SLEEP });
    const err = (await client.complete(ARGS).catch((e) => e)) as GeminiSchemaError;
    expect(err).toBeInstanceOf(GeminiSchemaError);
    // `cause` is populated through the native super(message, { cause }) path
    // (the underlying validation error), not a custom shadowing field.
    expect(err.cause).toBeDefined();
    expect(err.cause).toBe((err as unknown as { cause: unknown }).cause);
    expect(err.lastText).toContain("not");
  });
});

/* -------------------------------------------------------------------------- */
/* Transient failures + backoff                                               */
/* -------------------------------------------------------------------------- */

describe("GeminiLLMClient.complete — resilience", () => {
  it("retries on 429 then succeeds", async () => {
    const { transport, calls } = makeTransport([status(429), ok(VALID)]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    const res = await client.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
    expect(calls).toHaveLength(2);
  });

  it("retries on a network error (fetch failed / ECONNRESET) then succeeds", async () => {
    // This is the failure that crashed the precompute: a network-layer blip,
    // not an HTTP status. The SDK surfaces it as `TypeError: fetch failed`.
    const { transport, calls } = makeTransport([fetchFailed("ECONNRESET"), ok(VALID)]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    const res = await client.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
    expect(calls).toHaveLength(2);
  });

  it("retries through several network blips before succeeding", async () => {
    const { transport, calls } = makeTransport([
      fetchFailed("ETIMEDOUT"),
      fetchFailed("EAI_AGAIN"),
      ok(VALID),
    ]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    await client.complete<Decision>(ARGS);
    expect(calls).toHaveLength(3);
  });

  it("retries on 503 then succeeds", async () => {
    const { transport, calls } = makeTransport([status(503), status(503), ok(VALID)]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    await client.complete<Decision>(ARGS);
    expect(calls).toHaveLength(3);
  });

  it("gives up after `retries` transient failures", async () => {
    const { transport, calls } = makeTransport([status(503)]);
    const client = new GeminiLLMClient({ transport, retries: 2, sleep: NO_SLEEP });
    await expect(client.complete(ARGS)).rejects.toThrow();
    expect(calls).toHaveLength(3); // initial + 2 retries
  });

  it("does not retry on a non-retryable status (400)", async () => {
    const { transport, calls } = makeTransport([status(400, "bad request")]);
    const client = new GeminiLLMClient({ transport, sleep: NO_SLEEP });
    await expect(client.complete(ARGS)).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });

  it("drops the response schema and retries when Gemini rejects it (400 schema)", async () => {
    const schemaErr = status(400, "Invalid value for responseJsonSchema: unsupported keyword");
    const { transport, calls } = makeTransport([schemaErr, ok(VALID)]);
    const client = new GeminiLLMClient({ transport, retries: 0, sleep: NO_SLEEP });
    const res = await client.complete<Decision>(ARGS);
    expect(res.data).toEqual(VALID);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.jsonSchema).toBeDefined();
    expect(calls[1]!.jsonSchema).toBeUndefined(); // schema dropped, JSON mode only
  });
});

/* -------------------------------------------------------------------------- */
/* Usage + cost accounting                                                    */
/* -------------------------------------------------------------------------- */

describe("GeminiLLMClient — usage and cost", () => {
  it("computes cost from token counts with the cached discount", async () => {
    const usage = { promptTokens: 1000, outputTokens: 500, cachedTokens: 200, thoughtTokens: 100 };
    const { transport } = makeTransport([ok(VALID, usage)]);
    const client = new GeminiLLMClient({
      transport,
      pricing: { inputPerM: 1, cachedInputPerM: 0.25, outputPerM: 2 },
    });
    const { usage: u } = await client.complete<Decision>(ARGS);

    expect(u.inTokens).toBe(1000);
    expect(u.outTokens).toBe(600); // candidates + thoughts
    expect(u.cached).toBe(200);
    // uncachedIn=800 -> 0.0008 ; cached=200 -> 0.00005 ; out=600 -> 0.0012
    expect(u.costUsd).toBeCloseTo(0.00205, 10);
  });

  it("reports cached tokens from implicit caching", async () => {
    const usage = { promptTokens: 1000, outputTokens: 100, cachedTokens: 750, thoughtTokens: 0 };
    const { transport } = makeTransport([ok(VALID, usage)]);
    const client = new GeminiLLMClient({ transport });
    const { usage: u } = await client.complete<Decision>(ARGS);
    expect(u.cached).toBe(750);
  });
});

/* -------------------------------------------------------------------------- */
/* Explicit prompt caching                                                    */
/* -------------------------------------------------------------------------- */

describe("GeminiLLMClient — explicit caching", () => {
  function cachingTransport() {
    const created: GeminiCreateCacheRequest[] = [];
    const calls: GeminiGenerateRequest[] = [];
    const transport: GeminiTransport = {
      async generate(req) {
        calls.push({ ...req });
        return ok(VALID);
      },
      async createCache(req): Promise<GeminiCacheHandle> {
        created.push(req);
        return { name: `cache/${created.length}`, tokens: 5000 };
      },
    };
    return { transport, created, calls };
  }

  const bigSystem = "dossier ".repeat(4000); // well past minCacheTokens

  it("creates one cache per cacheKey and reuses it", async () => {
    const { transport, created, calls } = cachingTransport();
    const client = new GeminiLLMClient({
      transport,
      explicitCache: true,
      minCacheTokens: 1,
    });
    const args = { ...ARGS, system: bigSystem, cacheKey: "node:ceo" };
    await client.complete(args);
    await client.complete(args);

    expect(created).toHaveLength(1); // get-or-create, not per call
    expect(calls).toHaveLength(2);
    expect(calls[0]!.cachedContentName).toBe("cache/1");
    expect(calls[1]!.cachedContentName).toBe("cache/1");
  });

  it("does not use explicit caching when disabled", async () => {
    const { transport, created, calls } = cachingTransport();
    const client = new GeminiLLMClient({ transport, minCacheTokens: 1 });
    await client.complete({ ...ARGS, system: bigSystem, cacheKey: "node:ceo" });
    expect(created).toHaveLength(0);
    expect(calls[0]!.cachedContentName).toBeUndefined();
  });

  it("skips explicit caching for system prompts below the token floor", async () => {
    const { transport, created } = cachingTransport();
    const client = new GeminiLLMClient({ transport, explicitCache: true, minCacheTokens: 4096 });
    await client.complete({ ...ARGS, cacheKey: "node:ceo" }); // short system prompt
    expect(created).toHaveLength(0);
  });

  it("falls back to inline when cache creation fails", async () => {
    const calls: GeminiGenerateRequest[] = [];
    const transport: GeminiTransport = {
      async generate(req) {
        calls.push({ ...req });
        return ok(VALID);
      },
      async createCache(): Promise<GeminiCacheHandle> {
        throw new Error("cache service down");
      },
    };
    const client = new GeminiLLMClient({ transport, explicitCache: true, minCacheTokens: 1 });
    const res = await client.complete<Decision>({ ...ARGS, system: bigSystem, cacheKey: "k" });
    expect(res.data).toEqual(VALID);
    expect(calls[0]!.cachedContentName).toBeUndefined();
  });

  it("recreates the cache when the local TTL has expired (no stale reuse)", async () => {
    const { transport, created, calls } = cachingTransport();
    const client = new GeminiLLMClient({
      transport,
      explicitCache: true,
      minCacheTokens: 1,
      cacheTtlSeconds: 0, // every call sees the handle as already expired
    });
    const args = { ...ARGS, system: bigSystem, cacheKey: "node:ceo" };
    await client.complete(args);
    await client.complete(args);

    expect(created).toHaveLength(2); // TTL-evicted and recreated
    expect(calls[0]!.cachedContentName).toBe("cache/1");
    expect(calls[1]!.cachedContentName).toBe("cache/2");
  });

  /** Cache exists locally but the server 404s it (server-side TTL/eviction). */
  function expiredCacheTransport() {
    const created: GeminiCreateCacheRequest[] = [];
    const calls: GeminiGenerateRequest[] = [];
    const transport: GeminiTransport = {
      async generate(req) {
        calls.push({ ...req });
        if (req.cachedContentName) throw status(404, "Cached content not found");
        return ok(VALID); // inline fallback succeeds
      },
      async createCache(req): Promise<GeminiCacheHandle> {
        created.push(req);
        return { name: `cache/${created.length}`, tokens: 5000 };
      },
    };
    return { transport, created, calls };
  }

  it("falls back to the inline prompt when the cached content 404s", async () => {
    const { transport, calls } = expiredCacheTransport();
    const client = new GeminiLLMClient({
      transport,
      explicitCache: true,
      minCacheTokens: 1,
      retries: 0,
      sleep: NO_SLEEP,
    });
    const res = await client.complete<Decision>({
      ...ARGS,
      system: bigSystem,
      cacheKey: "node:ceo",
    });

    expect(res.data).toEqual(VALID);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.cachedContentName).toBe("cache/1"); // first try used the cache -> 404
    expect(calls[1]!.cachedContentName).toBeUndefined(); // retried inline -> success
  });

  it("invalidates the 404'd handle so the next call regenerates it", async () => {
    const { transport, created } = expiredCacheTransport();
    const client = new GeminiLLMClient({
      transport,
      explicitCache: true,
      minCacheTokens: 1,
      retries: 0,
      sleep: NO_SLEEP,
    });
    const args = { ...ARGS, system: bigSystem, cacheKey: "node:ceo" };
    await client.complete(args);
    expect(created).toHaveLength(1);
    await client.complete(args); // handle was invalidated -> recreate
    expect(created).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */
/* Concurrency                                                                 */
/* -------------------------------------------------------------------------- */

describe("GeminiLLMClient — concurrency", () => {
  it("caps in-flight requests at `concurrency`", async () => {
    let active = 0;
    let maxActive = 0;
    const transport: GeminiTransport = {
      async generate() {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 10));
        active--;
        return ok(VALID);
      },
    };
    const client = new GeminiLLMClient({ transport, concurrency: 2 });
    await Promise.all(Array.from({ length: 6 }, () => client.complete(ARGS)));
    expect(maxActive).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                                */
/* -------------------------------------------------------------------------- */

describe("toJsonSchema", () => {
  it("converts a zod schema and strips keywords Gemini rejects", () => {
    const js = toJsonSchema(DecisionSchema) as Record<string, any>;
    expect(js.$schema).toBeUndefined();
    expect(js.definitions).toBeUndefined();
    expect(js.type).toBe("object");
    expect(js.properties.decision.enum).toEqual(["post", "stay_silent", "escalate"]);
    expect(js.required).toContain("decision");
  });

  it("sanitizes a plain JSON schema passed straight through", () => {
    const js = toJsonSchema({ $schema: "x", type: "object", properties: {} }) as Record<string, any>;
    expect(js.$schema).toBeUndefined();
    expect(js.type).toBe("object");
  });
});

describe("httpStatusOf", () => {
  it("reads .status, .code, or a status code in the message", () => {
    expect(httpStatusOf(status(429))).toBe(429);
    expect(httpStatusOf({ code: 503 })).toBe(503);
    expect(httpStatusOf(new Error("got a 500 from upstream"))).toBe(500);
    expect(httpStatusOf(new Error("nope"))).toBeUndefined();
  });
});

describe("isNetworkError", () => {
  it("detects undici 'fetch failed' and walks the cause chain for the code", () => {
    expect(isNetworkError(fetchFailed("ECONNRESET"))).toBe(true);
    expect(isNetworkError(fetchFailed("ETIMEDOUT"))).toBe(true);
    expect(isNetworkError(fetchFailed("ECONNREFUSED"))).toBe(true);
    expect(isNetworkError(fetchFailed("EAI_AGAIN"))).toBe(true);
  });

  it("detects a code directly on the error and undici UND_ERR_* codes", () => {
    expect(isNetworkError({ code: "ECONNRESET" })).toBe(true);
    expect(isNetworkError({ code: "UND_ERR_SOCKET" })).toBe(true);
    expect(isNetworkError(new Error("socket hang up"))).toBe(true);
  });

  it("does not flag ordinary HTTP/application errors as network errors", () => {
    expect(isNetworkError(status(400, "bad request"))).toBe(false);
    expect(isNetworkError(status(429))).toBe(false);
    expect(isNetworkError(new Error("invalid responseJsonSchema"))).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("is true for 429/5xx and for network blips, false otherwise", () => {
    expect(isRetryableError(status(429))).toBe(true);
    expect(isRetryableError(status(503))).toBe(true);
    expect(isRetryableError(fetchFailed("ECONNRESET"))).toBe(true);
    expect(isRetryableError(status(400))).toBe(false);
    expect(isRetryableError(new Error("unrelated"))).toBe(false);
  });
});

describe("RealGeminiTransport", () => {
  it("constructs without throwing (no network until generate)", () => {
    expect(() => new RealGeminiTransport("test-key")).not.toThrow();
  });
});

describe("withRetry — onError bound", () => {
  const baseOpts = {
    retries: 0,
    baseDelayMs: 1,
    maxDelayMs: 1,
    sleep: NO_SLEEP,
    isRetryable: () => false,
  };

  it("never loops forever even if onError always says 'retry'", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw status(400, "always correctable in onError's eyes");
    };
    await expect(
      withRetry(fn, { ...baseOpts, maxOnErrorRetries: 2, onError: () => "retry" }),
    ).rejects.toThrow();
    expect(calls).toBe(3); // maxOnErrorRetries (2) + 1 final attempt
  });

  it("retries via onError within the bound, then succeeds", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls === 1) throw status(400, "correctable once");
      return "ok";
    };
    const out = await withRetry(fn, {
      ...baseOpts,
      maxOnErrorRetries: 3,
      onError: () => "retry",
    });
    expect(out).toBe("ok");
    expect(calls).toBe(2);
  });
});
