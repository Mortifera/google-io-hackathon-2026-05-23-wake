/**
 * Watch a cascade stream tick-by-tick in the terminal — proves the kernel yields
 * incrementally (the foundation of the live demo) and measures per-tick cadence.
 *
 *   WAKE_LLM=gemini node --env-file=.env --import tsx packages/kernel/src/run-stream.ts [worldPath] [seedId]
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { LLMClient, CompleteArgs } from "@wake/contracts";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { runCascadeStream, loadWorld } from "./index";
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

async function makeLLM(): Promise<LLMClient> {
  const mod = await import("@wake/llm");
  if (process.env.WAKE_LLM === "gemini") {
    return new mod.GeminiLLMClient({ apiKey: process.env.GEMINI_API_KEY });
  }
  return new mod.MockLLMClient({ responder: cannedResponder });
}

const world = loadWorld(worldPath);
const base = await makeLLM();
let cost = 0;
const llm: LLMClient = {
  async complete<T>(args: CompleteArgs) {
    const r = await base.complete<T>(args);
    cost += r.usage.costUsd;
    return r;
  },
};

const concurrency = Number(process.env.WAKE_CONCURRENCY ?? 6);
const maxTicks = Number(process.env.WAKE_MAXTICKS ?? 12);
const t0 = Date.now();
let n = 0;
let prev = 0;

for await (const ev of runCascadeStream(
  world,
  seedId,
  { llm, tickFn, edgeTransform },
  { seed: 1, concurrency, maxTicks },
)) {
  const elapsed = (Date.now() - t0) / 1000;
  if (ev.type === "tick-start") {
    console.log(
      `  ┌ tick ${ev.tick} — thinking: ${ev.active.map((a) => a.label).join(", ")}`,
    );
  } else if (ev.type === "node-acted") {
    console.log(`  │ ${ev.label}: ${ev.rationale}`);
  } else if (ev.type === "tick") {
    n++;
    const gap = (elapsed - prev).toFixed(1);
    prev = elapsed;
    console.log(
      `  └ [tick ${n}] clock=${ev.tick.clock} active=${ev.tick.activeNodeIds.length} ` +
        `events=${ev.tick.events.length} divergence=${ev.divergence.count} ` +
        `(+${gap}s, ${elapsed.toFixed(1)}s)`,
    );
  } else {
    console.log(
      `[done] ${ev.cascade.ticks.length} ticks, ${ev.cascade.eventDag.length} events, ` +
        `$${cost.toFixed(3)}, ${elapsed.toFixed(1)}s`,
    );
  }
}
