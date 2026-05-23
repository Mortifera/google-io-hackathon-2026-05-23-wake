import type {
  World,
  Cascade,
  TickFn,
  EdgeTransform,
  LLMClient,
} from "@wake/contracts";

export { loadWorld } from "./loadWorld";

export interface RunOptions {
  /** Deterministic seed; Monte Carlo passes base+i for each branch. */
  seed?: number;
  /** Sampling temperature handed to the LLM (raise it for MC divergence). */
  temperature?: number;
  /** Max in-flight LLM calls per tick. */
  concurrency?: number;
  /** Hard cap on ticks (safety). */
  maxTicks?: number;
}

export interface RunDeps {
  llm: LLMClient;
  tickFn: TickFn; // injected from @wake/nodes
  edgeTransform: EdgeTransform; // injected from @wake/edges
}

/**
 * Run one cascade. STUB — owned by L1 (see briefs/L1-kernel.md).
 *
 * The kernel imports ONLY @wake/contracts and @wake/util. Node and edge
 * behaviour arrive via `deps` (dependency injection), so the kernel, nodes,
 * and edges can all be built in parallel and integrated at CP1.
 */
export async function runCascade(
  _world: World,
  _seedActionId: string,
  _deps: RunDeps,
  _opts: RunOptions = {},
): Promise<Cascade> {
  throw new Error("runCascade not implemented yet (L1). See briefs/L1-kernel.md");
}
