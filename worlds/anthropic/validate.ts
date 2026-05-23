/**
 * worlds/anthropic/validate.ts — schema + integrity checks for world.json.
 * `loadAndParse()` mirrors @wake/kernel loadWorld(); `checkWorld()` adds the
 * referential-integrity guarantees the kernel relies on. CLI + shared by the test.
 *
 * Run: pnpm exec tsx worlds/anthropic/validate.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WorldSchema, type World } from "../../packages/contracts/src/index";

export const WORLD_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "world.json",
);

export const SEED_IDS = [
  "safety-incident",
  "mega-raise",
  "cofounder-departs",
  "regulation",
  "model-launch",
] as const;

/** Same convention as worlds/notion: load-bearing edges use only these keys. */
export const BLESSED_LLM_CHARACTERS = new Set([
  "journalist->audience",
  "employee->manager",
  "customer->cohort",
  "competitor->strategy",
  "platform-amplification",
  "friend->friend",
  "company->journalist",
  "internal-leadership",
  "leadership->report",
]);

export function loadAndParse(): World {
  return WorldSchema.parse(JSON.parse(readFileSync(WORLD_PATH, "utf8")));
}

export function checkWorld(world: World): string[] {
  const issues: string[] = [];

  const ids = new Set<string>();
  for (const n of world.nodes) {
    if (ids.has(n.id)) issues.push(`duplicate node id: ${n.id}`);
    ids.add(n.id);
    if (!n.dossier.trim()) issues.push(`empty dossier: ${n.id}`);
  }

  const edgeIds = new Set<string>();
  for (const e of world.edges) {
    if (edgeIds.has(e.id)) issues.push(`duplicate edge id: ${e.id}`);
    edgeIds.add(e.id);
    if (e.source === e.target) issues.push(`self-loop edge: ${e.id}`);
    if (!ids.has(e.source)) issues.push(`edge ${e.id} source not a node: ${e.source}`);
    if (!ids.has(e.target)) issues.push(`edge ${e.id} target not a node: ${e.target}`);
    if (e.llmMediated && !BLESSED_LLM_CHARACTERS.has(e.character)) {
      issues.push(`edge ${e.id} is llmMediated but uses non-canonical character "${e.character}"`);
    }
  }

  for (const s of world.seeds) {
    for (const t of s.targets) {
      if (!ids.has(t)) issues.push(`seed ${s.id} targets unknown node: ${t}`);
    }
  }
  for (const id of SEED_IDS) {
    if (!world.seeds.some((s) => s.id === id)) issues.push(`missing seed action: ${id}`);
  }

  const t1 = world.nodes.filter((n) => n.tier === 1).length;
  if (t1 < 15 || t1 > 35) issues.push(`tier-1 count ${t1} outside the 15-35 target`);
  if (world.nodes.length < 40) issues.push(`only ${world.nodes.length} nodes (target ~50)`);

  const hasInbound = new Set<string>();
  for (const e of world.edges) {
    hasInbound.add(e.target);
    if (e.direction === "two-way") hasInbound.add(e.source);
  }
  const roots = new Set<string>(["anthropic-corp", ...world.seeds.flatMap((s) => s.targets)]);
  for (const n of world.nodes) {
    if (!hasInbound.has(n.id) && !roots.has(n.id)) {
      issues.push(`unreachable node (no inbound edge): ${n.id}`);
    }
  }

  return issues;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const world = loadAndParse();
  const issues = checkWorld(world);
  if (issues.length) {
    console.error(`FAIL — ${issues.length} issue(s):\n` + issues.map((i) => `  - ${i}`).join("\n"));
    process.exit(1);
  }
  const t: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const n of world.nodes) t[n.tier] = (t[n.tier] ?? 0) + 1;
  const llm = world.edges.filter((e) => e.llmMediated).length;
  console.log(
    `OK "${world.id}": ${world.nodes.length} nodes (T1=${t[1]}, T2=${t[2]}, T3=${t[3]}), ` +
      `${world.edges.length} edges (llmMediated=${llm}), ${world.seeds.length} seeds`,
  );
}
