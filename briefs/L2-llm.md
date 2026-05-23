# L2 — LLM client (Gemini Flash)

**Folder:** `packages/llm` &middot; **Depends on:** `@wake/contracts` &middot;
**Build against:** the real Gemini API for the happy path; keep the mock as the
test/CI default.

## Mission
Implement `GeminiLLMClient` (the stub in `src/gemini.ts`) so it satisfies the
`LLMClient` contract: `complete<T>({ system, user, schema, temperature, ... })`.

## What to build
- Call **Gemini 3.5 Flash** (Gemini API via `@google/genai`, key from
  `GEMINI_API_KEY` — see `.env`/`.env.example`). Default model `GEMINI_MODEL`.
- **Structured output:** pass the JSON schema (derive from the zod schema in
  `args.schema`) as `responseSchema` / JSON mode and **validate the response**
  against it before returning; retry on invalid JSON.
- **Prompt caching:** cache the `system` prompt (the per-node dossier) keyed by
  `args.cacheKey`; populate `usage.cached`.
- **Resilience:** retry with backoff on 429/5xx; respect Tier 1 rate limits
  (`GEMINI_RATE_LIMITS.md`); bound concurrency (the kernel also limits, but be
  defensive).
- **Cost accounting:** fill `usage.{inTokens,outTokens,cached,costUsd}`.

## Pre-approved
Everything in your folder; a **few** real calls to smoke-test the happy path.

## Needs coordination
- **Large/batch live runs cost money** — the Monte Carlo precompute and big runs
  are budgeted, coordinated events, not solo work (see `AGENTS.md` §3, §8).
- Keep `MockLLMClient` the default everywhere; don't switch the kernel's default
  to live without coordination (that's CP2).

## Done-when
`GeminiLLMClient` returns schema-valid structured output for a sample node prompt;
mock still passes; both satisfy `LLMClient`; a smoke-test script exists; pushed.

## Gotchas
- Don't log full keys. Don't commit `.env`.
- Zod → JSON-schema: use `zod-to-json-schema` (add it to this package) or hand-map.
