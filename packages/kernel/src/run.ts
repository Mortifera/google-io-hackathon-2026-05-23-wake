/**
 * Run a cascade end-to-end and write it to runs/ (gitignored).
 *
 *   pnpm --filter @wake/kernel run:cascade [worldPath] [seedId]
 *   WAKE_LLM=gemini pnpm --filter @wake/kernel run:cascade   # real Flash
 *
 * Wires the kernel to the REAL node/edge behaviour (@wake/nodes, @wake/edges)
 * and an LLM client — MockLLMClient (offline, canned) by default, or the real
 * Gemini client when WAKE_LLM=gemini. This is the one command that, once L2's
 * client and L5's world are in, produces the CP2 cascade.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { LLMClient } from "@wake/contracts";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { runCascade, loadWorld } from "./index";
import { cannedResponder } from "./canned";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const worldArg = process.argv[2] ?? "worlds/notion/mini.json";
const seedId = process.argv[3] ?? "acquisition";
const worldPath = path.isAbsolute(worldArg)
  ? worldArg
  : path.join(repoRoot, worldArg);

async function makeLLM(): Promise<LLMClient> {
  const mod = await import("@wake/llm");
  if (process.env.WAKE_LLM === "gemini") {
    return new mod.GeminiLLMClient({ apiKey: process.env.GEMINI_API_KEY });
  }
  return new mod.MockLLMClient({ responder: cannedResponder });
}

const world = loadWorld(worldPath);
const base = await makeLLM();

// Wrap the client to count calls + sum cost (visibility for paid runs).
let calls = 0;
let costUsd = 0;
const llm: LLMClient = {
  async complete<T>(args) {
    const r = await base.complete<T>(args);
    calls++;
    costUsd += r.usage.costUsd;
    return r;
  },
};

const concurrency = Number(process.env.WAKE_CONCURRENCY ?? 6);
const cascade = await runCascade(
  world,
  seedId,
  { llm, tickFn, edgeTransform },
  { seed: 1, concurrency },
);

const outDir = path.join(repoRoot, "runs");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${world.id}.${seedId}.json`);
writeFileSync(outPath, JSON.stringify(cascade, null, 2));

const mode = process.env.WAKE_LLM === "gemini" ? "gemini" : "mock";
console.log(
  `[${mode}] ${world.id}/${seedId}: ${cascade.ticks.length} ticks, ` +
    `${cascade.eventDag.length} events, ${calls} llm calls, $${costUsd.toFixed(4)} ` +
    `→ ${path.relative(repoRoot, outPath)}`,
);
