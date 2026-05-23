/**
 * Genesis CLI — natural language -> a runnable Wake world.
 *
 *   pnpm exec tsx tools/genesis/genesis.ts "What happens if Stripe acquires Plaid?" \
 *     --budget 1 --ticks 12
 *
 * Flags: --budget <usd> (default 1)  --ticks <n> (default 12)
 *        --out <path> (default tools/genesis/out/<worldId>.json)  --model <id>
 *
 * Runs the real pipeline (Gemini research + Flash generation), writes world.json,
 * then proves it by loading it through @wake/kernel and running a cascade offline.
 * Needs GEMINI_API_KEY (or GOOGLE_API_KEY) in .env — never logged.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadWorld } from "../../packages/kernel/src/index";
import { loadEnv, RestGeminiLLM, estimateCost } from "./llm";
import { buildWorld } from "./pipeline";
import { validateAndRun } from "./validateRun";

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): {
  scenario: string;
  budget: number;
  ticks: number;
  out?: string;
  model?: string;
} {
  const positional: string[] = [];
  let budget = 1;
  let ticks = 12;
  let out: string | undefined;
  let model: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--budget") budget = Number(argv[++i]);
    else if (a === "--ticks") ticks = Number(argv[++i]);
    else if (a === "--out") out = argv[++i];
    else if (a === "--model") model = argv[++i];
    else if (a.startsWith("--budget=")) budget = Number(a.slice(9));
    else if (a.startsWith("--ticks=")) ticks = Number(a.slice(8));
    else if (a.startsWith("--out=")) out = a.slice(6);
    else if (a.startsWith("--model=")) model = a.slice(8);
    else positional.push(a);
  }
  return { scenario: positional.join(" ").trim(), budget, ticks, out, model };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.scenario) {
    console.error('Usage: tsx tools/genesis/genesis.ts "<scenario>" [--budget 1] [--ticks 12]');
    process.exit(1);
  }

  const env = { ...loadEnv(), ...process.env } as Record<string, string>;
  const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    console.error("[genesis] no GEMINI_API_KEY/GOOGLE_API_KEY in .env");
    process.exit(1);
  }

  console.log(`\n🌱 Genesis — "${args.scenario}"`);
  console.log(`   budget $${args.budget.toFixed(2)} · ${args.ticks} ticks (model ${args.model ?? env.GEMINI_MODEL ?? "gemini-3.5-flash"})\n`);

  const llm = new RestGeminiLLM(key, args.model ?? env.GEMINI_MODEL ?? "gemini-3.5-flash");

  const t0 = Date.now();
  const { world, sizing, summary, dossiersFilled } = await buildWorld(
    args.scenario,
    { budget: args.budget, ticks: args.ticks },
    llm,
    (label, detail) => console.log(`   ✓ ${label}${detail ? ` — ${detail}` : ""}`),
  );

  // Write the artifact.
  const outPath = args.out
    ? path.resolve(args.out)
    : path.join(here, "out", `${world.id}.json`);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(world, null, 2) + "\n", "utf8");

  // Prove it: load from disk via the kernel, then run a cascade offline.
  const loaded = loadWorld(outPath);
  const report = await validateAndRun(loaded, world.seeds[0]!.id);

  const genMs = Date.now() - t0;
  const actualCost = estimateCost(llm.usage);

  console.log(`\n── THE CAST · ${world.nodes.length} ENTITIES ──`);
  console.log(
    `   ${summary.leaders} leaders · ${summary.competitors} competitors · ${summary.journalists} journalists`,
  );
  console.log(
    `   ${summary.cohorts} cohorts · ${summary.platforms} platforms · ${summary.regulators} regulators`,
  );
  console.log(`\n── WORLD ──`);
  console.log(
    `   ${world.nodes.length} nodes · ${world.edges.length} edges (${world.edges.filter((e) => e.llmMediated).length} load-bearing) · ${world.seeds.length} seeds`,
  );
  console.log(`   dossiers via Flash: ${dossiersFilled}/${world.nodes.length}`);
  console.log(`   seed: "${world.seeds[0]!.label}"`);
  console.log(`\n── VALIDATION (offline cascade) ──`);
  console.log(`   ✓ parses WorldSchema + loads via kernel loadWorld()`);
  console.log(`   ✓ runnable: ${report.ticks} ticks, ${report.events} events (${report.llmCalls} mock calls)`);
  console.log(`\n── COST ──`);
  console.log(
    `   generation: ${llm.usage.calls} Gemini calls, ~$${actualCost.toFixed(4)} (est budget for a live ${args.ticks}-tick run ≈ $${sizing.estCascadeCostUsd.toFixed(2)})`,
  );
  console.log(`\n✅ wrote ${path.relative(path.resolve(here, "../.."), outPath)}  (${genMs}ms)\n`);
}

main().catch((err) => {
  console.error("\n[genesis] FAILED:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});
