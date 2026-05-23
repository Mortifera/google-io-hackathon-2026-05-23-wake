/**
 * Offline demo / smoke run for the analysis package.
 *
 *   pnpm --filter @wake/analysis analyze
 *
 * Loads the fixture cascade, fans it into a synthetic Monte Carlo set, runs
 * analyze(), validates the result against MonteCarloResultSchema, and prints it.
 * No kernel, no network — pure fixtures.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CascadeSchema, MonteCarloResultSchema } from "@wake/contracts";
import { analyze } from "./index";
import { framedScenario } from "./synthetic";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// The real 207-node Notion cascade; fan it into a synthetic Monte Carlo set.
const base = CascadeSchema.parse(
  JSON.parse(readFileSync(path.join(root, "fixtures/cascades/notion-world.acquisition.json"), "utf8")),
);

const cascades = framedScenario(base);
const result = analyze(cascades, { worldId: base.meta.worldId, seedActionId: base.meta.seedActionId });

// Fail loudly if we ever emit something off-contract.
MonteCarloResultSchema.parse(result);

console.log(`\n${cascades.length} runs → ${result.clusters.length} clusters\n`);
for (const c of result.clusters) {
  console.log(`  [${c.id}] ${c.label}  (${c.memberRunIds.length} runs, rep ${c.representativeRunId})`);
  console.log(`        ${c.summary}`);
}
console.log(`\nPivotal: ${result.pivotal.dimension}  (explains ${(result.pivotal.explainedVariance * 100).toFixed(0)}%)`);
console.log(`  ${result.pivotal.description}\n`);

// Full payload for piping into the viz / inspection.
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
