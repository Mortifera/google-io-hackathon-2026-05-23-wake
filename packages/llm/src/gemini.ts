import type { LLMClient, CompleteArgs, LLMResult, LLMUsage } from "@wake/contracts";
import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Real Gemini Flash client (L2). Satisfies the `LLMClient` contract by calling
 * Gemini 3.5 Flash with structured output and turning the response into a
 * schema-valid `LLMResult<T>`.
 *
 * What it does:
 *  - converts the caller's zod `schema` to JSON Schema and asks Gemini for JSON
 *    that matches it (`responseJsonSchema` + JSON mime), then validates the reply
 *    with the same zod schema and retries on malformed/invalid JSON,
 *  - caches the per-node dossier system prompt (implicitly by keeping it as the
 *    stable `systemInstruction` prefix; explicitly, keyed by `cacheKey`, when
 *    `explicitCache` is enabled and the prompt is large enough) and reports the
 *    cached token count in `usage.cached`,
 *  - retries with exponential backoff + jitter on 429/5xx,
 *  - bounds in-flight requests with an internal semaphore (the kernel also caps
 *    concurrency; this is a second line of defence — see GEMINI_RATE_LIMITS.md),
 *  - accounts cost in `usage.costUsd`.
 *
 * The network call is isolated behind {@link GeminiTransport} so the orchestration
 * (retry / validation / cost / caching) is unit-testable offline with a fake
 * transport. The real transport wraps `@google/genai`.
 */

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

/** Per-million-token USD rates used to fill `usage.costUsd`. */
export interface GeminiPricing {
  /** Uncached input tokens, USD per 1M. */
  inputPerM: number;
  /** Cached input tokens, USD per 1M (typically a fraction of `inputPerM`). */
  cachedInputPerM: number;
  /** Output tokens (incl. thinking), USD per 1M. */
  outputPerM: number;
}

/**
 * Best-effort default rates. These approximate published Gemini Flash text
 * pricing and are NOT asserted to be the exact Gemini 3.5 Flash figures — pass
 * `opts.pricing` for accurate cost accounting. The contract only requires the
 * `usage.costUsd` field to be populated; treat the default as an estimate.
 */
export const DEFAULT_PRICING: GeminiPricing = {
  inputPerM: 0.3,
  cachedInputPerM: 0.075,
  outputPerM: 2.5,
};

/* -------------------------------------------------------------------------- */
/* Transport (the only part that touches the network)                         */
/* -------------------------------------------------------------------------- */

export interface GeminiRawUsage {
  /** Total input tokens (includes cached). */
  promptTokens: number;
  /** Output (candidate) tokens. */
  outputTokens: number;
  /** Tokens served from the prompt cache. */
  cachedTokens: number;
  /** Thinking tokens — billed as output for thinking models. */
  thoughtTokens: number;
}

export interface GeminiRawResponse {
  /** Raw model text — expected to be a JSON document. */
  text: string;
  usage: GeminiRawUsage;
}

export interface GeminiGenerateRequest {
  model: string;
  system: string;
  user: string;
  /** JSON Schema for structured output; omit for plain JSON mode. */
  jsonSchema?: unknown;
  temperature?: number;
  maxTokens?: number;
  /** Name of an explicit cached-content handle to reuse (if any). */
  cachedContentName?: string;
}

export interface GeminiCreateCacheRequest {
  model: string;
  system: string;
  /** Cache lifetime in seconds. */
  ttlSeconds: number;
}

export interface GeminiCacheHandle {
  name: string;
  tokens: number;
}

interface CacheEntry {
  handle: Promise<GeminiCacheHandle | null>;
  /** Local wall-clock ms after which we treat the server-side cache as gone. */
  expiresAt: number;
}

/** The seam between the client's orchestration and the actual Gemini API. */
export interface GeminiTransport {
  generate(req: GeminiGenerateRequest): Promise<GeminiRawResponse>;
  /** Optional explicit context caching; only used when `explicitCache` is on. */
  createCache?(req: GeminiCreateCacheRequest): Promise<GeminiCacheHandle>;
}

/** Real transport backed by `@google/genai`. */
export class RealGeminiTransport implements GeminiTransport {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(req: GeminiGenerateRequest): Promise<GeminiRawResponse> {
    const config: Record<string, unknown> = {
      responseMimeType: "application/json",
    };
    if (req.temperature !== undefined) config.temperature = req.temperature;
    if (req.maxTokens !== undefined) config.maxOutputTokens = req.maxTokens;
    if (req.jsonSchema !== undefined) config.responseJsonSchema = req.jsonSchema;
    // When reusing an explicit cache, the system prompt lives in the cache; do
    // not also send it inline.
    if (req.cachedContentName) config.cachedContent = req.cachedContentName;
    else config.systemInstruction = req.system;

    const resp = await this.ai.models.generateContent({
      model: req.model,
      contents: req.user,
      config,
    });

    const u = resp.usageMetadata ?? {};
    return {
      text: resp.text ?? "",
      usage: {
        promptTokens: u.promptTokenCount ?? 0,
        outputTokens: u.candidatesTokenCount ?? 0,
        cachedTokens: u.cachedContentTokenCount ?? 0,
        thoughtTokens: u.thoughtsTokenCount ?? 0,
      },
    };
  }

  async createCache(req: GeminiCreateCacheRequest): Promise<GeminiCacheHandle> {
    const cache = await this.ai.caches.create({
      model: req.model,
      config: {
        systemInstruction: req.system,
        ttl: `${req.ttlSeconds}s`,
      },
    });
    if (!cache.name) throw new Error("caches.create returned no name");
    return { name: cache.name, tokens: cache.usageMetadata?.totalTokenCount ?? 0 };
  }
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

/** Thrown when the model never returns JSON that parses + validates. */
export class GeminiSchemaError extends Error {
  constructor(
    message: string,
    readonly lastText: string,
    cause?: unknown,
  ) {
    // Use the native ES2022 cause rather than a field that shadows
    // Error.prototype.cause.
    super(message, { cause });
    this.name = "GeminiSchemaError";
  }
}

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

export interface GeminiOptions {
  apiKey?: string;
  /** Model id, e.g. "gemini-3.5-flash". Defaults to env `GEMINI_MODEL`. */
  model?: string;
  /** Max in-flight requests through this client. */
  concurrency?: number;

  // --- resilience ---
  /** Retries for transient (429/5xx) failures. */
  retries?: number;
  /** Retries when the reply isn't JSON matching the schema. */
  jsonRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;

  // --- cost ---
  pricing?: GeminiPricing;

  // --- caching ---
  /** Use explicit context caching keyed by `cacheKey` (default: false). */
  explicitCache?: boolean;
  /** Min estimated system-prompt tokens before explicit caching is attempted. */
  minCacheTokens?: number;
  /** Explicit cache TTL in seconds. */
  cacheTtlSeconds?: number;

  // --- injection (testing) ---
  /** Override the network layer. Defaults to {@link RealGeminiTransport}. */
  transport?: GeminiTransport;
  /** Sleep impl for backoff; overridable so tests don't actually wait. */
  sleep?: (ms: number) => Promise<void>;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** Treat an explicit cache as expired slightly before its server-side TTL. */
const CACHE_EXPIRY_FACTOR = 0.9;

/** Hard cap on `onError`-driven immediate retries, so they can't loop forever. */
const MAX_ON_ERROR_RETRIES = 3;

/* -------------------------------------------------------------------------- */
/* Client                                                                      */
/* -------------------------------------------------------------------------- */

export class GeminiLLMClient implements LLMClient {
  private readonly model: string;
  private readonly transport: GeminiTransport;
  private readonly pricing: GeminiPricing;
  private readonly retries: number;
  private readonly jsonRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly explicitCache: boolean;
  private readonly minCacheTokens: number;
  private readonly cacheTtlSeconds: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly sem: Semaphore;
  /** cacheKey -> explicit cache handle, with a local expiry so we never reuse a
   *  handle past its server-side TTL (which would 404). */
  private readonly cacheHandles = new Map<string, CacheEntry>();

  constructor(opts: GeminiOptions = {}) {
    this.model = opts.model ?? process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
    this.pricing = opts.pricing ?? DEFAULT_PRICING;
    this.retries = opts.retries ?? 5;
    this.jsonRetries = opts.jsonRetries ?? 2;
    this.baseDelayMs = opts.baseDelayMs ?? 500;
    this.maxDelayMs = opts.maxDelayMs ?? 20_000;
    this.explicitCache = opts.explicitCache ?? false;
    this.minCacheTokens = opts.minCacheTokens ?? 4096;
    this.cacheTtlSeconds = opts.cacheTtlSeconds ?? 600;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.sem = new Semaphore(Math.max(1, opts.concurrency ?? 8));

    this.transport =
      opts.transport ??
      new RealGeminiTransport(
        opts.apiKey ??
          process.env.GEMINI_API_KEY ??
          process.env.GOOGLE_API_KEY ??
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
          "",
      );
  }

  async complete<T>(args: CompleteArgs): Promise<LLMResult<T>> {
    return this.sem.run(() => this.run<T>(args));
  }

  private async run<T>(args: CompleteArgs): Promise<LLMResult<T>> {
    const validator = asZodSchema(args.schema);
    let jsonSchema = toJsonSchema(args.schema);
    // Mutable: a schema rejection drops `jsonSchema`; a stale-cache 404 drops
    // `cachedContentName` back to inline. Both are correctable mid-flight.
    let cachedContentName = await this.resolveCache(args);

    let lastText = "";
    let lastErr: unknown;

    // jsonRetries+1 attempts to get well-formed, schema-valid JSON. Each attempt
    // independently retries transient transport failures.
    for (let attempt = 0; attempt <= this.jsonRetries; attempt++) {
      const raw = await withRetry(
        () =>
          this.transport.generate({
            model: this.model,
            system: args.system,
            user: args.user,
            jsonSchema,
            temperature: args.temperature,
            maxTokens: args.maxTokens,
            cachedContentName,
          }),
        {
          retries: this.retries,
          baseDelayMs: this.baseDelayMs,
          maxDelayMs: this.maxDelayMs,
          sleep: this.sleep,
          maxOnErrorRetries: MAX_ON_ERROR_RETRIES,
          isRetryable: (e) => {
            const status = httpStatusOf(e);
            return status !== undefined && RETRYABLE_STATUS.has(status);
          },
          // Correctable, non-transient errors: rewrite request state and retry
          // immediately (bounded by maxOnErrorRetries). Each guard is also self-
          // limiting because it clears the state it keys on.
          onError: (e) => {
            // Gemini rejects the schema (400): drop it and fall back to plain
            // JSON mode + zod validation rather than failing hard.
            if (jsonSchema !== undefined && isSchemaRejection(e)) {
              jsonSchema = undefined;
              return "retry";
            }
            // The explicit cache 404'd (server-side TTL expired or evicted):
            // invalidate it and fall back to the inline system prompt.
            if (cachedContentName && isCacheNotFound(e)) {
              this.invalidateCache(args.cacheKey);
              cachedContentName = undefined;
              return "retry";
            }
            return "throw";
          },
        },
      );

      lastText = raw.text;
      const parsed = parseAndValidate<T>(raw.text, validator);
      if (parsed.ok) {
        return { data: parsed.data, usage: this.toUsage(raw.usage) };
      }
      lastErr = parsed.error;
    }

    throw new GeminiSchemaError(
      `Gemini did not return schema-valid JSON after ${this.jsonRetries + 1} attempts`,
      lastText,
      lastErr,
    );
  }

  private toUsage(raw: GeminiRawUsage): LLMUsage {
    const out = raw.outputTokens + raw.thoughtTokens;
    const uncachedIn = Math.max(0, raw.promptTokens - raw.cachedTokens);
    const costUsd =
      (uncachedIn / 1e6) * this.pricing.inputPerM +
      (raw.cachedTokens / 1e6) * this.pricing.cachedInputPerM +
      (out / 1e6) * this.pricing.outputPerM;
    return {
      inTokens: raw.promptTokens,
      outTokens: out,
      cached: raw.cachedTokens,
      costUsd,
    };
  }

  /**
   * Get-or-create an explicit cache handle for this call's system prompt. Returns
   * the cache name to reuse, or undefined to send the system prompt inline (which
   * still benefits from Gemini's implicit prefix caching). Never throws — caching
   * is an optimization, so any failure falls back to inline. Honors TTL: a handle
   * past its local expiry is evicted and recreated rather than reused (a reused
   * server-side-expired cache would 404).
   */
  private async resolveCache(args: CompleteArgs): Promise<string | undefined> {
    if (
      !this.explicitCache ||
      !args.cacheKey ||
      !this.transport.createCache ||
      estimateTokens(args.system) < this.minCacheTokens
    ) {
      return undefined;
    }
    const handle = await this.getOrCreateCache(args.cacheKey, args.system);
    return handle?.name;
  }

  private getOrCreateCache(key: string, system: string): Promise<GeminiCacheHandle | null> {
    const now = Date.now();
    const existing = this.cacheHandles.get(key);
    if (existing && existing.expiresAt > now) return existing.handle;
    if (existing) this.cacheHandles.delete(key); // TTL-expired: evict before recreating

    const handle = this.transport
      .createCache!({ model: this.model, system, ttlSeconds: this.cacheTtlSeconds })
      .catch(() => null);
    // Expire our handle a little before the server-side TTL so we don't reach for
    // a cache the server may have already dropped.
    const expiresAt = now + this.cacheTtlSeconds * 1000 * CACHE_EXPIRY_FACTOR;
    this.cacheHandles.set(key, { handle, expiresAt });
    return handle;
  }

  /** Drop a cached handle so the next call recreates it (used on a 404). */
  private invalidateCache(key?: string): void {
    if (key) this.cacheHandles.delete(key);
  }
}

/* -------------------------------------------------------------------------- */
/* Schema helpers                                                              */
/* -------------------------------------------------------------------------- */

interface ZodLike {
  safeParse(input: unknown): { success: boolean; data?: unknown; error?: unknown };
}

function asZodSchema(schema: unknown): ZodLike | undefined {
  if (schema && typeof (schema as ZodLike).safeParse === "function") {
    return schema as ZodLike;
  }
  return undefined;
}

/**
 * Convert the caller's schema to a JSON Schema for Gemini's `responseJsonSchema`.
 * If it's a zod schema, run it through `zod-to-json-schema` (refs inlined) and
 * strip the keywords Gemini doesn't accept. If it's already a plain object,
 * assume it is a JSON Schema and pass it through sanitized.
 */
export function toJsonSchema(schema: unknown): unknown {
  if (schema == null) return undefined;
  let js: unknown;
  if (asZodSchema(schema)) {
    js = zodToJsonSchema(schema as never, { $refStrategy: "none" });
  } else if (typeof schema === "object") {
    js = schema;
  } else {
    return undefined;
  }
  return sanitizeJsonSchema(js);
}

const STRIPPED_KEYS = new Set(["$schema", "$id", "id", "$ref", "definitions", "$defs", "default"]);

function sanitizeJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitizeJsonSchema);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (STRIPPED_KEYS.has(k)) continue;
      out[k] = sanitizeJsonSchema(v);
    }
    return out;
  }
  return node;
}

interface ParseOk<T> {
  ok: true;
  data: T;
}
interface ParseErr {
  ok: false;
  error: unknown;
}

function parseAndValidate<T>(text: string, validator?: ZodLike): ParseOk<T> | ParseErr {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(text));
  } catch (error) {
    return { ok: false, error };
  }
  if (validator) {
    const result = validator.safeParse(json);
    if (!result.success) return { ok: false, error: result.error };
    return { ok: true, data: result.data as T };
  }
  return { ok: true, data: json as T };
}

/** Some models wrap JSON in ```json fences despite JSON mode — tolerate it. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence?.[1] ?? trimmed;
}

/* -------------------------------------------------------------------------- */
/* Retry / backoff                                                             */
/* -------------------------------------------------------------------------- */

export interface RetryOpts {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep: (ms: number) => Promise<void>;
  isRetryable: (e: unknown) => boolean;
  /** Inspect an error before the retryable check; may rewrite state then retry. */
  onError?: (e: unknown) => "retry" | "throw";
  /** Hard cap on `onError` "retry" decisions, so the fast path can't loop forever. */
  maxOnErrorRetries?: number;
}

/** Exported for unit testing the onError/backoff bounds. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<T> {
  const maxOnErrorRetries = opts.maxOnErrorRetries ?? 0;
  let attempt = 0;
  let onErrorRetries = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      // Correctable errors get an immediate retry, but only up to an explicit
      // bound — otherwise a misbehaving onError could spin indefinitely.
      if (opts.onError && onErrorRetries < maxOnErrorRetries && opts.onError(e) === "retry") {
        onErrorRetries++;
        continue;
      }
      attempt++;
      if (attempt > opts.retries || !opts.isRetryable(e)) throw e;
      const backoff = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** (attempt - 1));
      const jittered = backoff / 2 + Math.random() * (backoff / 2);
      await opts.sleep(jittered);
    }
  }
}

export function httpStatusOf(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  if (typeof e.status === "number") return e.status;
  if (typeof e.code === "number") return e.code;
  const msg = typeof e.message === "string" ? e.message : "";
  const m = /\b(429|500|502|503|504)\b/.exec(msg);
  return m ? Number(m[1]) : undefined;
}

function errMessage(err: unknown): string {
  return err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string"
    ? (err as { message: string }).message.toLowerCase()
    : "";
}

/** Detect a 400 caused by an unacceptable response schema. */
function isSchemaRejection(err: unknown): boolean {
  if (httpStatusOf(err) !== 400) return false;
  return /schema|responsejsonschema|response_schema/.test(errMessage(err));
}

/**
 * Detect a "cached content not found" failure. A 404 while we're using an
 * explicit cache means the server-side cache is gone (TTL expired or evicted);
 * we also sniff the message in case the status isn't surfaced.
 */
function isCacheNotFound(err: unknown): boolean {
  if (httpStatusOf(err) === 404) return true;
  return /cached content (?:was )?not found|cachedcontent\b.*not found/.test(errMessage(err));
}

/* -------------------------------------------------------------------------- */
/* Concurrency                                                                  */
/* -------------------------------------------------------------------------- */

/** Counting semaphore. Permits are transferred directly to waiters on release,
 *  so the in-flight count never exceeds `max`. */
class Semaphore {
  private permits: number;
  private readonly waiters: Array<() => void> = [];

  constructor(max: number) {
    this.permits = max;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) next(); // transfer the permit directly; don't bump `permits`
    else this.permits++;
  }
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/** Rough token estimate (~4 chars/token) — only used to gate explicit caching. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
