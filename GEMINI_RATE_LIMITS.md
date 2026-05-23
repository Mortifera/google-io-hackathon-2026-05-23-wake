# Gemini API — Tier 1 Rate Limits

> These are **Tier 1** limits (the project's current tier). Source: <https://ai.google.dev/gemini-api/docs/rate-limits> (plain-text: `rate-limits.md.txt`). Captured: 2026-05-23.

## Important: RPM / TPM / RPD per-model table not in the source

The fetched document does **not** contain a per-model table of RPM (requests per minute), TPM (tokens per minute), or RPD (requests per day) values for Tier 1. Those figures are served dynamically and the doc directs you to view them live in AI Studio:

- View your active, tier-specific RPM/TPM/RPD limits: <https://aistudio.google.com/rate-limit>

To avoid inventing numbers, no RPM/TPM/RPD table is reproduced here — none appear in the source. The only per-model Tier 1 figures the source actually publishes are the **Batch enqueued tokens** limits, shown below.

## How limits are measured (per the doc)

Rate limits are measured across three dimensions: **RPM** (requests per minute), **TPM** (input tokens per minute), and **RPD** (requests per day). Usage is evaluated against each limit; exceeding any one triggers an error. Limits are applied **per project, not per API key**. RPD quotas reset at midnight Pacific time. Some models add other limits (e.g. IPM for image models, TPD).

## Tier 1 — Batch API enqueued tokens (per model, from the source)

The "Batch enqueued tokens" value is the maximum number of tokens that can be enqueued for batch processing across all active batch jobs for a given model.

| Model | Batch enqueued tokens |
|---|---|
| Gemini 3.1 Pro Preview | 5,000,000 |
| Gemini 3.1 Flash-Lite | 10,000,000 |
| Gemini 3.1 Flash-Lite Preview | 10,000,000 |
| **Gemini 3.5 Flash** | **3,000,000** |
| Gemini 2.5 Pro | 5,000,000 |
| Gemini 2.5 Pro TTS | 25,000 |
| **Gemini 2.5 Flash** | **3,000,000** |
| **Gemini 2.5 Flash Preview** | **3,000,000** |
| Gemini 2.5 Flash Image Preview | 3,000,000 |
| Gemini 2.5 Flash TTS | 100,000 |
| Gemini 2.5 Flash-Lite | 10,000,000 |
| Gemini 2.5 Flash-Lite Preview | 10,000,000 |
| Gemini 2.0 Flash | 10,000,000 |
| Gemini 2.0 Flash Image | 3,000,000 |
| Gemini 2.0 Flash-Lite | 10,000,000 |
| Gemini 3.1 Flash Image Preview | 1,000,000 |
| Gemini 3 Pro Image Preview | 2,000,000 |
| Gemini Embedding | 500,000 |

> Note: the source lists "Gemini 3.5 Flash" twice with the same value (3,000,000); shown once here.

## Tier 1 notes

- **How to qualify for Tier 1:** Set up and link an active billing account. (Free → Tier 1 upgrades typically take effect instantly.) Billing tier cap for Tier 1: **$250**.
- **Batch API** requests have their own limits, separate from non-batch calls:
  - Concurrent batch requests: **100**
  - Input file size limit: **2GB**
  - File storage limit: **20GB**
  - Per-model enqueued-token caps: see the Tier 1 table above.
- **Priority inference:** default priority rate limits are **0.3x** the standard rate limit for each model and tier.
- Experimental and preview models have more restricted limits. Specified limits are not guaranteed; actual capacity may vary.

## Other tiers

Free, Tier 2, and Tier 3 limits (including their batch enqueued-token tables) are documented at the source URL: <https://ai.google.dev/gemini-api/docs/rate-limits>
