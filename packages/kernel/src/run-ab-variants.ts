/**
 * Precompute the A/B Testing variants for the acquisition action.
 * Same world, same seed action — two different framings of the acquisition message:
 *
 *   VARIANT A (independent) — "Notion keeps its own brand, team, and design culture."
 *   VARIANT B (integrated)  — "Notion will be deeply integrated into Microsoft 365 and Copilot."
 *
 * The acquisitionMessagingFraming perturbation in sweep.ts is the lever.
 * Framing accounts for ~58% of outcome variance — the A/B contrast is legible and honest.
 *
 * Run:
 *   WAKE_LLM=gemini node --env-file=.env --import tsx packages/kernel/src/run-ab-variants.ts
 *
 * Outputs to fixtures/cascades/:
 *   notion.variant-independent.json
 *   notion.variant-integrated.json
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CascadeSchema,
  type LLMClient,
  type CompleteArgs,
} from "@wake/contracts";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { runCascade, loadWorld } from "./index";
import { applyPerturbation } from "./sweep";
import { cannedResponder } from "./canned";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const baseWorld = loadWorld(path.join(repoRoot, "worlds/notion/world.json"));

async function makeLLM(): Promise<LLMClient> {
  const mod = await import("@wake/llm");
  if (process.env.WAKE_LLM === "gemini") {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    return new mod.GeminiLLMClient({ apiKey: key });
  }
  return new mod.MockLLMClient({ responder: cannedResponder });
}

const base = await makeLLM();
let calls = 0;
let cost = 0;
const llm: LLMClient = {
  async complete<T>(args: CompleteArgs) {
    const r = await base.complete<T>(args);
    calls++;
    cost += r.usage.costUsd;
    if (calls % 10 === 0) {
      console.log(`  [progress] ${calls} calls, $${cost.toFixed(3)}`);
    }
    return r;
  },
};

const outDir = path.join(repoRoot, "fixtures/cascades");
mkdirSync(outDir, { recursive: true });

async function run(
  label: string,
  framing: "independent" | "integrated",
  filename: string,
) {
  console.log(`\n[${process.env.WAKE_LLM === "gemini" ? "gemini" : "mock"}] Running variant: ${label}`);
  const world = applyPerturbation(baseWorld, "acquisition", {
    acquisitionMessagingFraming: framing,
  });

  const cascade = await runCascade(
    world,
    "acquisition",
    { llm, tickFn, edgeTransform },
    {
      seed: framing === "independent" ? 10 : 20,
      concurrency: Number(process.env.WAKE_CONCURRENCY ?? 10),
      maxTicks: Number(process.env.WAKE_MAXTICKS ?? 18),
      perturbation: { acquisitionMessagingFraming: framing },
    },
  );

  const outPath = path.join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(cascade, null, 2));

  const reach = [...new Set(cascade.eventDag.map((e) => e.target))];
  const finalSentiments = Object.entries(cascade.finalState)
    .filter(([, st]) => st.mood)
    .map(([id, st]) => ({ id, sentiment: st.mood.sentiment }))
    .sort((a, b) => a.sentiment - b.sentiment)
    .slice(0, 4);

  console.log(
    `  ${cascade.ticks.length} ticks, ${cascade.eventDag.length} events → ${path.relative(repoRoot, outPath)}`,
  );
  console.log(`  reaches: ${reach.join(", ")}`);
  console.log(`  most negative: ${finalSentiments.map((s) => `${s.id}(${s.sentiment.toFixed(2)})`).join(", ")}`);
}

await run(
  "independent (stays autonomous)",
  "independent",
  "notion.variant-independent.json",
);

await run(
  "integrated (deep Microsoft 365)",
  "integrated",
  "notion.variant-integrated.json",
);

console.log(`\n  Total: ${calls} calls, $${cost.toFixed(3)}`);
