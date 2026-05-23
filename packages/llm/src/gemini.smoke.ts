/**
 * Live smoke test for GeminiLLMClient — proves the happy path against the real
 * Gemini API: structured output, schema validation, usage + cost accounting.
 *
 * Run from the repo root (loads ../../.env if present):
 *   pnpm --filter @wake/llm smoke
 *
 * It makes a couple of cheap Flash calls (well under the ~$20 experimental
 * budget). Skips cleanly with a clear message if no API key is configured.
 * Never prints the key.
 */
import { z } from "zod";
import { GeminiLLMClient } from "./gemini";

const DecisionSchema = z.object({
  decision: z.enum(["post", "stay_silent", "escalate"]),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  emit: z
    .array(z.object({ type: z.string(), content: z.string() }))
    .optional(),
});

const SYSTEM = [
  "You are the head of communications for a fast-growing software company.",
  "You are measured, protective of the brand, and allergic to overreaction.",
  "Decide how to respond to inbound events. Output ONLY structured JSON.",
].join(" ");

const USER = [
  "World clock: t=3.",
  "Inbox: A respected tech journalist DMs you: 'Hearing you're about to be",
  "acquired — care to comment before I publish in an hour?'",
  "Internal state: the deal is real but unsigned and under NDA.",
  "Decide: post publicly, stay silent, or escalate internally.",
].join(" ");

function hasKey(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  );
}

async function main() {
  if (!hasKey()) {
    console.log(
      "[smoke] No GEMINI_API_KEY found — skipping live smoke test.\n" +
        "        Copy .env.example to .env and set the key, then re-run.",
    );
    return;
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  console.log(`[smoke] model=${model} (key present, not shown)`);

  const llm = new GeminiLLMClient({ model });

  // 1) Structured-output happy path.
  const t0 = Date.now();
  const res = await llm.complete<z.infer<typeof DecisionSchema>>({
    system: SYSTEM,
    user: USER,
    schema: DecisionSchema,
    temperature: 0.7,
    cacheKey: "smoke:comms-lead",
  });
  const ms = Date.now() - t0;

  // Re-validate independently so the smoke test fails loudly on a bad shape.
  DecisionSchema.parse(res.data);

  console.log(`\n[smoke] structured output (${ms}ms):`);
  console.log(JSON.stringify(res.data, null, 2));
  console.log("\n[smoke] usage:", res.usage);

  // 2) Second call (same cacheKey) to exercise the cached-prompt path. With small
  //    dossiers this reports implicit-cache hits, if any.
  const res2 = await llm.complete<z.infer<typeof DecisionSchema>>({
    system: SYSTEM,
    user: USER + " (Assume the journalist now has a second source.)",
    schema: DecisionSchema,
    temperature: 0.9,
    cacheKey: "smoke:comms-lead",
  });
  DecisionSchema.parse(res2.data);
  console.log("\n[smoke] second call decision:", res2.data.decision);
  console.log("[smoke] second call cached tokens:", res2.usage.cached);

  const total = (res.usage.costUsd + res2.usage.costUsd).toFixed(6);
  console.log(`\n[smoke] OK — 2 calls, est. cost $${total}`);
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
