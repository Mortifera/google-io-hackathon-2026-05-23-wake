/**
 * Precompute the "same action, different world" beat as a MATCHED PAIR. The same
 * action — an engineer DMs her manager a product idea — is run in two worlds that
 * differ only in the org's disposition:
 *
 *   PRE  — independent, roadmap-locked Notion. Net-new ideas are politely deferred
 *          to next planning cycle: the idea fizzles at the manager.
 *   POST — Notion as a Microsoft subsidiary, under pressure to show Copilot synergy.
 *          The same idea is now strategic: it escalates up the chain.
 *
 * The post world's initial conditions are derived from the acquisition cascade's
 * final state (mutateWorldFromCascade), then both worlds are primed with their
 * disposition. The contrast is the world, not the action.
 *
 *   WAKE_LLM=gemini node --env-file=.env --import tsx packages/kernel/src/run-postacq.ts
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CascadeSchema,
  type World,
  type LLMClient,
  type CompleteArgs,
} from "@wake/contracts";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { runCascade, loadWorld, mutateWorldFromCascade } from "./index";
import { cannedResponder } from "./canned";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const world = loadWorld(path.join(repoRoot, "worlds/notion/world.json"));
const acquisition = CascadeSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(repoRoot, "fixtures/cascades/notion-world.acquisition.json"),
      "utf8",
    ),
  ),
);

// The internal Notion org — the nodes whose disposition defines the world-state.
// (External press, competitors, Microsoft, and cohorts are deliberately excluded.)
const INTERNAL_NOTION = new Set([
  "notion-corp", "ivan-zhao", "simon-last", "akshay-kothari", "notion-board",
  "eng-manager", "director-of-engineering", "head-of-design", "head-of-marketing",
  "head-of-sales", "head-of-customer-success", "vp-of-ai", "head-of-platform",
  "head-of-people", "maya", "postgres-eng", "core-platform-eng", "ai-features-team",
  "growth-eng", "design-team", "marketing-team", "sales-team", "customer-success-team",
]);

/** Prime the internal org with a world-disposition and frame the seed accordingly. */
function prime(
  w: World,
  belief: string,
  interior: string,
  seedPayload: string,
): World {
  for (const n of w.nodes) {
    if (!INTERNAL_NOTION.has(n.id)) continue;
    n.initialState.beliefs = belief + n.initialState.beliefs;
    n.initialState.privateInterior = interior + n.initialState.privateInterior;
  }
  const seed = w.seeds.find((s) => s.id === "engineer-idea");
  if (seed) seed.payload = seedPayload;
  return w;
}

const PRE = prime(
  structuredClone(world),
  "PRE-ACQUISITION REALITY: Notion is an independent company, heads-down on a " +
    "committed quarterly roadmap with no spare headcount. Net-new exploratory ideas " +
    "outside the roadmap are politely acknowledged and deferred to the next planning " +
    "cycle — they are not escalated to leadership. ",
  "I can't take on net-new scope right now; I'll thank them and park this for next " +
    "planning. ",
  "Maya has just DM'd her engineering manager a product idea: use AI to auto-generate " +
    "links between Notion pages by semantic similarity. It's a net-new exploratory idea, " +
    "not on the current roadmap. The DM is sitting in his inbox now, awaiting his response.",
);

const POST = prime(
  mutateWorldFromCascade(world, acquisition),
  "POST-ACQUISITION REALITY: Notion is now a Microsoft subsidiary — the deal has " +
    "closed. Leadership is pushing every team to surface concrete Microsoft 365 / " +
    "Copilot synergy stories to justify their headcount in the new org. ",
  "I need a visible win that demonstrates Microsoft synergy. ",
  "Maya has just DM'd her engineering manager a concrete product idea: use AI to " +
    "auto-generate links between Notion pages by semantic similarity — and she's " +
    "pitched it as Office-style cross-document linking that showcases Microsoft 365 / " +
    "Copilot synergy. The DM is sitting in his inbox now, awaiting his response.",
);

async function makeLLM(): Promise<LLMClient> {
  const mod = await import("@wake/llm");
  if (process.env.WAKE_LLM === "gemini") {
    return new mod.GeminiLLMClient({ apiKey: process.env.GEMINI_API_KEY });
  }
  return new mod.MockLLMClient({ responder: cannedResponder });
}

const base = await makeLLM();
let calls = 0;
let cost = 0;
const llm: LLMClient = {
  async complete<T>(args: CompleteArgs) {
    const r = await base.complete<T>(args);
    calls++;
    cost += r.usage.costUsd;
    return r;
  },
};

const outDir = path.join(repoRoot, "runs");
mkdirSync(outDir, { recursive: true });

async function run(label: string, w: World, file: string) {
  const cascade = await runCascade(
    w,
    "engineer-idea",
    { llm, tickFn, edgeTransform },
    {
      seed: 1,
      concurrency: Number(process.env.WAKE_CONCURRENCY ?? 10),
      maxTicks: Number(process.env.WAKE_MAXTICKS ?? 16),
    },
  );
  const outPath = path.join(outDir, file);
  writeFileSync(outPath, JSON.stringify(cascade, null, 2));
  const reach = [...new Set(cascade.eventDag.map((e) => e.target))];
  console.log(
    `[${process.env.WAKE_LLM === "gemini" ? "gemini" : "mock"}] ${label}: ` +
      `${cascade.ticks.length} ticks, ${cascade.eventDag.length} events → ` +
      `${path.relative(repoRoot, outPath)}\n    reaches: ${reach.join(", ")}`,
  );
}

await run("PRE  (independent, roadmap-locked)", PRE, "notion.preacq.engineer-idea.json");
await run("POST (Microsoft subsidiary)", POST, "notion.postacq.engineer-idea.json");
console.log(`    ${calls} calls, $${cost.toFixed(3)} total`);
