/**
 * Proof that a generated world is real: it must parse against WorldSchema AND
 * actually run a cascade through the existing kernel. We run it offline with the
 * MockLLMClient + the kernel's canned responder (zero API cost) — the structure
 * is what we're validating here, not the prose.
 */
import { WorldSchema, type World } from "../../packages/contracts/src/index";
import { runCascade } from "../../packages/kernel/src/index";
import { tickFn } from "../../packages/nodes/src/index";
import { edgeTransform } from "../../packages/edges/src/index";
import { MockLLMClient } from "../../packages/llm/src/index";
import { cannedResponder } from "../../packages/kernel/src/canned";

export interface RunReport {
  ticks: number;
  events: number;
  llmCalls: number;
}

export async function validateAndRun(
  world: World,
  seedId: string,
  maxTicks = 8,
): Promise<RunReport> {
  // 1. Schema validity (same check loadWorld() does).
  WorldSchema.parse(world);

  // 2. Runnability: a real cascade through the real kernel/nodes/edges.
  const llm = new MockLLMClient({ responder: cannedResponder });
  const cascade = await runCascade(
    world,
    seedId,
    { llm, tickFn, edgeTransform },
    { seed: 1, concurrency: 8, maxTicks },
  );

  return {
    ticks: cascade.ticks.length,
    events: cascade.eventDag.length,
    llmCalls: llm.callCount,
  };
}
