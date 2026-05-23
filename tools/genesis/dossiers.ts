/**
 * Stage 4 of the mock: "Generating dossiers · Gemini 3.5 Flash". Each node gets a
 * cached system-prompt dossier that drives how it behaves in a cascade. Batched
 * to keep call count (and cost) low. Tier-1 named entities are written from the
 * research note + general knowledge with uncertainty marked and no invented
 * quotes; Tier-2/3 are explicit composite archetypes.
 */
import type { World, NodeDef } from "../../packages/contracts/src/index";
import type { GenesisLLM } from "./llm";
import type { Cast } from "./cast";

const DOSSIER_SCHEMA = {
  type: "OBJECT",
  properties: {
    dossiers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          dossier: { type: "STRING" },
          publicFace: { type: "STRING" },
        },
        required: ["id", "dossier"],
      },
    },
  },
  required: ["dossiers"],
} as const;

function systemPrompt(scenario: string): string {
  return [
    `You write "dossiers" for nodes in Wake, a multi-agent world simulation of this scenario:`,
    `"${scenario}"`,
    ``,
    `A dossier is cached system-prompt material that drives how a node behaves during a cascade: its voice, how it filters and reacts to news, its biases, and what flips its sentiment.`,
    `- Tier 1 (named real people/orgs): write from public knowledge; mark uncertainty ("reportedly/likely"); NEVER invent quotes or private facts.`,
    `- Tier 2/3 (cohorts, communities, platforms, aggregates): these are COMPOSITE archetypes, not real individuals — characterize the segment.`,
    `Each dossier is 70-120 words, vivid, present tense, scenario-relevant. Also give a one-line "publicFace" (what it says in public right now). Output ONLY the requested JSON.`,
  ].join("\n");
}

interface DossierOut {
  dossiers?: Array<{ id?: string; dossier?: string; publicFace?: string }>;
}

const chunk = <T>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

function tierLabel(n: NodeDef): string {
  return n.tier === 1 ? "Tier-1 (named — real, factual)" : `Tier-${n.tier} (composite archetype)`;
}

export async function fillDossiers(
  world: World,
  cast: Cast,
  llm: GenesisLLM,
  onStep?: (label: string, detail?: string) => void,
): Promise<number> {
  onStep?.("Generating dossiers", "Gemini 3.5 Flash");
  const noteById = new Map(cast.nodes.map((c) => [c.id, c.note]));
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  let filled = 0;

  const batches = chunk(world.nodes, 10);
  for (const batch of batches) {
    const user = [
      `Write a final dossier for each node. Preserve the draft's meaning; make it sharper and scenario-specific.`,
      ``,
      ...batch.map(
        (n) =>
          `- id: ${n.id}\n  label: ${n.label}\n  ${tierLabel(n)}, function: ${n.fn}\n  draft: ${noteById.get(n.id) ?? n.dossier}`,
      ),
    ].join("\n");

    try {
      const out = await llm.json<DossierOut>({
        system: systemPrompt(cast.scenario),
        user,
        schema: DOSSIER_SCHEMA,
        temperature: 0.75,
      });
      for (const r of out.dossiers ?? []) {
        if (!r.id || !r.dossier) continue;
        const node = byId.get(r.id);
        if (!node) continue;
        node.dossier = r.dossier.trim();
        if (r.publicFace) node.initialState.publicFace = r.publicFace.trim().slice(0, 200);
        filled++;
      }
    } catch (err) {
      // Non-fatal: nodes keep their draft dossier (still valid). Log and move on.
      onStep?.("Dossier batch failed (keeping drafts)", (err as Error)?.message);
    }
  }
  return filled;
}
