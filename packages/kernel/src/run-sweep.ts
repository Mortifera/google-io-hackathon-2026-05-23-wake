/**
 * Monte Carlo precompute: run a perturbation sweep, cluster the outcomes, and
 * write the MonteCarloResult + one representative cascade per cluster to runs/.
 *
 *   WAKE_LLM=gemini WAKE_REPS=6 WAKE_MAXTICKS=12 \
 *     pnpm --filter @wake/kernel run:sweep [worldPath] [seedId]
 *
 * This is the demo's punchline engine: it produces the fan + the pivotal variable.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { LLMClient, CompleteArgs } from "@wake/contracts";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { analyze } from "@wake/analysis";
import { loadWorld } from "./index";
import { sweep, type SweepDimension } from "./sweep";
import { cannedResponder } from "./canned";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const worldArg = process.argv[2] ?? "worlds/notion/world.json";
const seedId = process.argv[3] ?? "acquisition";
const worldPath = path.isAbsolute(worldArg)
  ? worldArg
  : path.join(repoRoot, worldArg);

// Demo perturbation axes. `framing` is the headline pivotal candidate.
const DIMENSIONS: SweepDimension[] = [
  { name: "framing", values: ["independent", "integrated"] },
  { name: "pressClimate", values: ["skeptical", "favorable"] },
  { name: "competitorSpeed", values: ["fast", "slow"] },
];

async function makeLLM(): Promise<LLMClient> {
  const mod = await import("@wake/llm");
  if (process.env.WAKE_LLM === "gemini") {
    return new mod.GeminiLLMClient({ apiKey: process.env.GEMINI_API_KEY });
  }
  return new mod.MockLLMClient({ responder: cannedResponder });
}

const world = loadWorld(worldPath);
const base = await makeLLM();
let calls = 0;
let costUsd = 0;
const llm: LLMClient = {
  async complete<T>(args: CompleteArgs) {
    const r = await base.complete<T>(args);
    calls++;
    costUsd += r.usage.costUsd;
    return r;
  },
};

const reps = Number(process.env.WAKE_REPS ?? 6);
const maxTicks = Number(process.env.WAKE_MAXTICKS ?? 12);
const runConcurrency = Number(process.env.WAKE_RUN_CONCURRENCY ?? 3);
const concurrency = Number(process.env.WAKE_CONCURRENCY ?? 6);

const t0 = Date.now();
const cascades = await sweep(
  world,
  seedId,
  { llm, tickFn, edgeTransform },
  { dimensions: DIMENSIONS, repetitions: reps, runConcurrency, concurrency, maxTicks },
);
const mc = analyze(cascades, { worldId: world.id, seedActionId: seedId });

const outDir = path.join(repoRoot, "runs");
mkdirSync(outDir, { recursive: true });

const mcPath = path.join(outDir, `montecarlo.${world.id}.${seedId}.json`);
writeFileSync(mcPath, JSON.stringify(mc, null, 2));

// One representative cascade per cluster (runIds are r01.. in cascade order).
for (const c of mc.clusters) {
  const idx = Number(c.representativeRunId.replace(/^r/, "")) - 1;
  const cascade = cascades[idx];
  if (cascade) {
    writeFileSync(
      path.join(outDir, `rep.${world.id}.${seedId}.${c.id}.json`),
      JSON.stringify(cascade, null, 2),
    );
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(0);
const mode = process.env.WAKE_LLM === "gemini" ? "gemini" : "mock";
console.log(
  `[${mode}] sweep ${world.id}/${seedId}: ${cascades.length} runs, ` +
    `${calls} llm calls, $${costUsd.toFixed(2)}, ${secs}s`,
);
console.log(
  `clusters: ${mc.clusters.map((c) => `${c.label}(${c.memberRunIds.length})`).join(" | ")}`,
);
console.log(
  `pivotal: ${mc.pivotal.dimension} (${(mc.pivotal.explainedVariance * 100).toFixed(0)}%) — ${mc.pivotal.description}`,
);
console.log(`→ ${path.relative(repoRoot, mcPath)}`);
