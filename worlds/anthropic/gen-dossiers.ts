/**
 * worlds/anthropic/gen-dossiers.ts — generate the non-curated Tier-2/3 dossiers
 * with Gemini Flash (the "mass info" lane). Curated ids (CURATED_DOSSIERS) are
 * skipped. Mirrors worlds/notion/gen-dossiers.ts. Archetypes/aggregates only —
 * no real-person facts or quotes invented (AGENTS.md §4).
 *
 * Run: pnpm exec tsx worlds/anthropic/gen-dossiers.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CURATED_DOSSIERS } from "./dossiers.t1";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(path.join(repoRoot, ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] && m[2] !== undefined) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env } as Record<string, string>;
const apiKey =
  env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) throw new Error("no GEMINI_API_KEY/GOOGLE_API_KEY in .env");
const MODEL = env.GEMINI_MODEL || "gemini-3.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

interface WNode {
  id: string;
  label: string;
  tier: number;
  fn: string;
  dossier: string;
}

const world = JSON.parse(readFileSync(path.join(here, "world.json"), "utf8")) as {
  nodes: WNode[];
};
const targets = world.nodes.filter((n) => n.tier !== 1 && !CURATED_DOSSIERS[n.id]);

const SYSTEM = `You write concise "dossiers" for nodes in Wake, a multi-agent world simulation centered on ANTHROPIC. The focal storylines are: a public Claude safety incident (a frontier-eval finding leaks), a mega funding round, a safety co-founder departing over the safety-vs-commercial balance, new frontier-AI regulation, and a major new Claude model launch.

Each dossier is cached system-prompt material that drives how the node behaves during a cascade. A good dossier captures: the node's voice/behavior, how it filters and reacts to news, its biases and sensitivities, and what would flip its sentiment. For aggregate/count nodes, note it is a composite with averaged sentiment and low individual signal.

These are ARCHETYPES and AGGREGATES, not real named individuals — do NOT invent specific facts, names, numbers, or quotes about real people. Keep each dossier 80-110 words, vivid, specific, present tense, no preamble.`;

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

let inTok = 0;
let outTok = 0;

async function genBatch(batch: WNode[], attempt = 1): Promise<Record<string, string>> {
  const userLines = batch
    .map(
      (n) =>
        `- id: ${n.id}\n  label: ${n.label}\n  tier: ${n.tier} (${
          n.tier === 2 ? "archetype cohort" : "aggregate / count node"
        })\n  function: ${n.fn}\n  draft: ${n.dossier}`,
    )
    .join("\n");
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Rewrite and enrich each node's draft into a final dossier (80-110 words). Preserve its meaning and scenario relevance; make it sharper and more specific. Return one object per node.\n\n${userLines}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.75,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: { id: { type: "STRING" }, dossier: { type: "STRING" } },
          required: ["id", "dossier"],
        },
      },
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const status = res.status;
    if ((status === 429 || status >= 500) && attempt <= 4) {
      await sleep(1000 * 2 ** (attempt - 1));
      return genBatch(batch, attempt + 1);
    }
    throw new Error(`Gemini ${status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  if (data.usageMetadata) {
    inTok += data.usageMetadata.promptTokenCount ?? 0;
    outTok += data.usageMetadata.candidatesTokenCount ?? 0;
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const arr = JSON.parse(text) as { id: string; dossier: string }[];
  const out: Record<string, string> = {};
  for (const r of arr) if (r?.id && r?.dossier) out[r.id] = r.dossier.trim();
  return out;
}

const result: Record<string, string> = {};
const batches = chunk(targets, 12);
for (const [i, batch] of batches.entries()) {
  process.stdout.write(`batch ${i + 1}/${batches.length} (${batch.length} nodes)... `);
  try {
    const r = await genBatch(batch);
    Object.assign(result, r);
    console.log(`ok (${Object.keys(r).length})`);
  } catch (e) {
    console.log(`FAILED: ${(e as Error).message}`);
  }
  await sleep(400);
}

const validIds = new Set(targets.map((t) => t.id));
for (const k of Object.keys(result)) if (!validIds.has(k)) delete result[k];
const missing = targets.filter((t) => !result[t.id]).map((t) => t.id);
const estCost = (inTok / 1e6) * 0.3 + (outTok / 1e6) * 2.5;

writeFileSync(
  path.join(here, "dossiers.bulk.json"),
  JSON.stringify(result, Object.keys(result).sort(), 2) + "\n",
);
console.log(
  `\nwrote dossiers.bulk.json: ${Object.keys(result).length}/${targets.length} dossiers` +
    `\n  tokens: in=${inTok} out=${outTok}  est cost ~$${estCost.toFixed(4)}` +
    (missing.length ? `\n  MISSING (${missing.length}): ${missing.join(", ")}` : ""),
);
