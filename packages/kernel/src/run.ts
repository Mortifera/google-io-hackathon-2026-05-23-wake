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
const llm = await makeLLM();
const cascade = await runCascade(
  world,
  seedId,
  { llm, tickFn, edgeTransform },
  { seed: 1, concurrency: 6 },
);

const outDir = path.join(repoRoot, "runs");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${world.id}.${seedId}.json`);
writeFileSync(outPath, JSON.stringify(cascade, null, 2));

console.log(
  `[${process.env.WAKE_LLM === "gemini" ? "gemini" : "mock"}] ${world.id}/${seedId}: ` +
    `${cascade.ticks.length} ticks, ${cascade.eventDag.length} events → ${path.relative(repoRoot, outPath)}`,
);
