/**
 * Monte Carlo over a world+action, run durably via the Workflow DevKit.
 *
 * The workflow function only orchestrates (it runs in a sandbox): it fans out M
 * cascade steps in bounded batches, then an analyze step. All heavy work — the
 * kernel, Gemini, analysis — lives inside "use step" functions (full Node access),
 * which dynamically import the engine so the sandbox never loads it.
 *
 * Variation comes from the system's own non-determinism: each run uses a distinct
 * seed and a non-zero temperature, and analyze() clusters the distribution and
 * reports the pivotal variable. Progress + the final result are streamed to the
 * run's default writable (newline-delimited JSON) so the client can render them.
 */
import { FatalError, getWritable } from "workflow";
import type { Cascade, MonteCarloResult, World } from "@wake/contracts";

const MAX_TICKS = 12;
const PER_CASCADE_CONCURRENCY = 6;
const BATCH = 6; // parallel cascades per batch — bounds Gemini Tier-1 load
const TEMPERATURE = 0.85;

/** Build the LLM client inside a step (full Node + process.env). */
async function makeLLM(mode: "gemini" | "mock", apiKey: string) {
  const mod = await import("@wake/llm");
  if (mode === "mock") {
    const { cannedResponder } = await import("@wake/kernel");
    return new mod.MockLLMClient({ responder: cannedResponder });
  }
  // BYO key (from the request) takes precedence; falls back to the server env.
  return new mod.GeminiLLMClient(apiKey ? { apiKey } : {});
}

/** Append one newline-delimited JSON chunk to the run's default stream. */
async function writeChunk(obj: unknown): Promise<void> {
  const writer = getWritable<string>().getWriter();
  try {
    await writer.write(JSON.stringify(obj) + "\n");
  } finally {
    writer.releaseLock();
  }
}

/** One cascade of the sweep. Distinct seed + temperature → a distinct future. */
async function runOneCascade(
  world: World,
  seedId: string,
  seed: number,
  total: number,
  llmMode: "gemini" | "mock",
  apiKey: string,
): Promise<Cascade> {
  "use step";
  const { runCascade } = await import("@wake/kernel");
  const { tickFn } = await import("@wake/nodes");
  const { edgeTransform } = await import("@wake/edges");
  const llm = await makeLLM(llmMode, apiKey);
  let cascade: Cascade;
  try {
    cascade = await runCascade(
      world,
      seedId,
      { llm, tickFn, edgeTransform },
      { seed, temperature: TEMPERATURE, maxTicks: MAX_TICKS, concurrency: PER_CASCADE_CONCURRENCY },
    );
  } catch (err) {
    const msg = (err as { message?: string }).message ?? String(err);
    // Auth/config failures won't fix themselves — fail fast instead of letting
    // the WDK retry the step (which would hang the whole run).
    if (/api[_ ]?key|API_KEY_INVALID|invalid argument|40[13]/i.test(msg)) {
      throw new FatalError(`Gemini auth failed: ${msg.slice(0, 140)}`);
    }
    throw err; // transient — let the WDK retry it
  }
  await writeChunk({ type: "progress", total });
  return cascade;
}

/** Cluster the cascades into outcomes + the pivotal variable. */
async function analyzeStep(
  cascades: Cascade[],
  worldId: string,
  seedId: string,
): Promise<MonteCarloResult> {
  "use step";
  const { analyze } = await import("@wake/analysis");
  const result = analyze(cascades, { worldId, seedActionId: seedId });
  await writeChunk({ type: "result", result });
  return result;
}

export async function monteCarloWorkflow(
  world: World,
  seedId: string,
  variations: number,
  llmMode: "gemini" | "mock" = "gemini",
  apiKey = "",
): Promise<MonteCarloResult> {
  "use workflow";
  const cascades: Cascade[] = [];
  for (let i = 0; i < variations; i += BATCH) {
    const end = Math.min(i + BATCH, variations);
    const batch: Promise<Cascade>[] = [];
    for (let j = i; j < end; j++) {
      batch.push(runOneCascade(world, seedId, j + 1, variations, llmMode, apiKey));
    }
    const settled = await Promise.all(batch);
    for (const c of settled) cascades.push(c);
  }
  return analyzeStep(cascades, world.id, seedId);
}
