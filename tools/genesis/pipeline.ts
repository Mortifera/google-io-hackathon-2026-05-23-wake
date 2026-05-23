/**
 * The Genesis pipeline: natural-language scenario -> validated Wake World.
 * Pure orchestration over an injected GenesisLLM, so genesis.test.ts can drive
 * the whole flow offline with a fake. Emits the design mock's build steps via
 * `onStep` so a UI (or the CLI) can render the progress panel.
 */
import type { World } from "../../packages/contracts/src/index";
import type { GenesisLLM } from "./llm";
import { planSizing, type Sizing } from "./budget";
import { researchCast, castSummary, type Cast } from "./cast";
import { castToWorld } from "./wire";
import { fillDossiers } from "./dossiers";

export type StepFn = (label: string, detail?: string) => void;

export interface BuildOptions {
  budget: number;
  ticks: number;
}

export interface BuildResult {
  world: World;
  cast: Cast;
  sizing: Sizing;
  summary: Record<string, number>;
  dossiersFilled: number;
}

export async function buildWorld(
  scenario: string,
  opts: BuildOptions,
  llm: GenesisLLM,
  onStep: StepFn = () => {},
): Promise<BuildResult> {
  const sizing = planSizing(opts.budget, opts.ticks);

  // Stages 1-2: research the cast + decide which entities matter.
  const cast = await researchCast(scenario, sizing, llm, onStep);

  // Stage 3: size the graph to budget (caps already applied in normalizeCast).
  const summary = castSummary(cast);
  onStep(
    "Sizing the graph to budget",
    `${cast.nodes.length} entities × ${opts.ticks} ticks ≈ $${sizing.estCascadeCostUsd.toFixed(2)} / run`,
  );

  // Build the graph (nodes + deterministic edges).
  const world = castToWorld(cast);

  // Stage 4: dossiers via Flash.
  const dossiersFilled = await fillDossiers(world, cast, llm, onStep);

  // Stages 5-6: edges are wired deterministically above; narrate + assemble.
  onStep("Writing edges & channels", `${world.edges.length} edges`);
  onStep(
    "Assembling world.json",
    `${world.nodes.length} nodes, ${world.edges.length} edges, ${world.seeds.length} seeds`,
  );

  return { world, cast, sizing, summary, dossiersFilled };
}
