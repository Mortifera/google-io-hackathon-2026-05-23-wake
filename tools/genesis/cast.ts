/**
 * Stage 1-2 of the mock: "Researching the cast (Google Search)" and "Deciding
 * which entities matter". Two Gemini calls:
 *   1. ground():  Google-Search-grounded research on the real cast.
 *   2. json():    structure that research into a typed Cast, sized to the budget.
 * Then we defensively normalize (kebab ids, dedupe, resolve affiliations, clamp
 * to caps) so downstream wiring can trust it.
 */
import type { GenesisLLM } from "./llm";
import type { CastCaps, Sizing } from "./budget";

export type CastCategory =
  | "company"
  | "leader"
  | "competitor"
  | "journalist"
  | "influencer"
  | "cohort"
  | "community"
  | "platform"
  | "regulator"
  | "aggregate";

export interface CastNode {
  id: string;
  label: string;
  category: CastCategory;
  side: "A" | "B" | "neutral";
  /** Company id a leader belongs to (drives leadership-ring / report wiring). */
  affiliation?: string;
  /** One-line research note — seeds the dossier. */
  note: string;
}

export interface SeedSpec {
  id: string;
  label: string;
  targetId: string;
  payload: string;
}

export interface Cast {
  worldId: string;
  worldLabel: string;
  scenario: string;
  sideA: string;
  sideB?: string;
  nodes: CastNode[];
  seeds: SeedSpec[];
  queries: string[];
}

const CATEGORIES: CastCategory[] = [
  "company",
  "leader",
  "competitor",
  "journalist",
  "influencer",
  "cohort",
  "community",
  "platform",
  "regulator",
  "aggregate",
];

export function kebab(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "node";
}

const CAST_SCHEMA = {
  type: "OBJECT",
  properties: {
    worldId: { type: "STRING" },
    worldLabel: { type: "STRING" },
    sideAId: { type: "STRING" },
    sideBId: { type: "STRING" },
    nodes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          category: { type: "STRING", enum: CATEGORIES },
          side: { type: "STRING", enum: ["A", "B", "neutral"] },
          affiliation: { type: "STRING" },
          note: { type: "STRING" },
        },
        required: ["id", "label", "category", "side", "note"],
      },
    },
    seeds: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          targetId: { type: "STRING" },
          payload: { type: "STRING" },
        },
        required: ["id", "label", "targetId", "payload"],
      },
    },
  },
  required: ["worldId", "worldLabel", "sideAId", "nodes", "seeds"],
} as const;

interface RawCast {
  worldId?: string;
  worldLabel?: string;
  sideAId?: string;
  sideBId?: string;
  nodes?: Array<Partial<CastNode>>;
  seeds?: Array<Partial<SeedSpec>>;
}

function researchPrompt(scenario: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `Research the real-world cast for a multi-agent simulation of this scenario (today is ${today}):`,
    `"${scenario}"`,
    ``,
    `Using web search, identify with one concrete, factual one-line note each:`,
    `- The PRIMARY company/actor and the COUNTERPARTY company (if the scenario involves two).`,
    `- Key named leaders/executives on each side (the CEO plus the few who would actually decide or speak).`,
    `- The main competitor companies who would react.`,
    `- Major journalists/analysts and influencers who would cover it.`,
    `- The important customer/user cohorts and communities affected (these are segments, not individuals).`,
    `- The platforms where the story spreads (e.g. X/Twitter, Hacker News, relevant subreddits).`,
    `- The regulators/agencies with jurisdiction.`,
    ``,
    `Name real people and organizations. Be accurate; do not invent private facts or quotes.`,
  ].join("\n");
}

function structurePrompt(scenario: string, research: string, caps: CastCaps): string {
  return [
    `Scenario: "${scenario}"`,
    ``,
    `Research notes:`,
    research,
    ``,
    `Convert this into a structured cast for the simulation. Rules:`,
    `- ids are kebab-case and unique (e.g. "stripe-corp", "patrick-collison").`,
    `- Include exactly one "company" node for the primary actor (sideAId) and, if applicable, one for the counterparty (sideBId).`,
    `- Each "leader" MUST set "affiliation" to the company id they belong to.`,
    `- "cohort"/"community"/"aggregate" nodes are composite SEGMENTS, never real individuals.`,
    `- side: "A" = primary actor's side, "B" = counterparty's side, "neutral" = press/cohorts/regulators/competitors.`,
    `- Propose 1-3 "seeds": the on-stage actions (e.g. the acquisition announcement). Each targetId must be a node id (usually the sideA company).`,
    ``,
    `Aim for roughly these counts (fidelity within budget):`,
    `  leaders ${caps.leaders}, competitors ${caps.competitors}, journalists ${caps.journalists},`,
    `  cohorts ${caps.cohorts}, platforms ${caps.platforms}, regulators ${caps.regulators}.`,
    `Quality over quantity — prefer the entities that genuinely shape the outcome.`,
  ].join("\n");
}

const CAST_SYSTEM =
  "You design the cast for Wake, a multi-agent world simulation. You turn grounded research into a clean, typed graph of the entities that matter for an accurate simulation. Real people/orgs for named nodes; composite archetypes for cohorts/communities/aggregates. Output ONLY the requested JSON.";

export async function researchCast(
  scenario: string,
  sizing: Sizing,
  llm: GenesisLLM,
  onStep?: (label: string, detail?: string) => void,
): Promise<Cast> {
  onStep?.("Researching the cast", "Google Search");
  const grounded = await llm.ground(researchPrompt(scenario));

  onStep?.("Deciding which entities matter", "structuring the cast");
  const raw = await llm.json<RawCast>({
    system: CAST_SYSTEM,
    user: structurePrompt(scenario, grounded.text, sizing.caps),
    schema: CAST_SCHEMA,
    temperature: 0.5,
  });

  return normalizeCast(raw, scenario, sizing, grounded.queries);
}

/** Make the LLM's cast safe to wire: kebab+unique ids, resolved sides/affiliations,
 *  guaranteed focal companies, clamped to caps, at least one valid seed. */
export function normalizeCast(
  raw: RawCast,
  scenario: string,
  sizing: Sizing,
  queries: string[],
): Cast {
  const worldId = kebab(raw.worldId || scenario.split(/\s+/).slice(0, 4).join("-"));
  const worldLabel = (raw.worldLabel || scenario).slice(0, 120);

  const seen = new Set<string>();
  const uniqueId = (want: string): string => {
    let id = kebab(want);
    if (!seen.has(id)) {
      seen.add(id);
      return id;
    }
    let n = 2;
    while (seen.has(`${id}-${n}`)) n++;
    id = `${id}-${n}`;
    seen.add(id);
    return id;
  };

  // Map original -> normalized ids so affiliations/seed targets still resolve.
  const idRemap = new Map<string, string>();
  const nodes: CastNode[] = [];
  const perCat: Record<string, number> = {};
  const capFor = (c: CastCategory): number => {
    switch (c) {
      case "company":
        return 2;
      case "leader":
        return sizing.caps.leaders;
      case "competitor":
        return sizing.caps.competitors;
      case "journalist":
        return sizing.caps.journalists;
      case "influencer":
        return Math.max(2, Math.round(sizing.caps.journalists / 2));
      case "cohort":
      case "community":
        return sizing.caps.cohorts;
      case "platform":
        return sizing.caps.platforms;
      case "regulator":
        return sizing.caps.regulators;
      case "aggregate":
        return sizing.caps.aggregates + 4;
    }
  };

  for (const r of raw.nodes ?? []) {
    const category = (CATEGORIES.includes(r.category as CastCategory)
      ? r.category
      : "cohort") as CastCategory;
    const key = category === "cohort" || category === "community" ? "cohort" : category;
    perCat[key] = (perCat[key] ?? 0) + 1;
    if (perCat[key] > capFor(category)) continue; // clamp to budget caps
    const label = (r.label || r.id || "Unnamed").toString().slice(0, 80);
    const id = uniqueId(r.id || label);
    if (r.id) idRemap.set(r.id, id);
    idRemap.set(label, id);
    nodes.push({
      id,
      label,
      category,
      side: (["A", "B", "neutral"].includes(r.side as string) ? r.side : "neutral") as CastNode["side"],
      affiliation: r.affiliation,
      note: (r.note || "").toString().slice(0, 400),
    });
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const resolve = (ref: string | undefined): string | undefined => {
    if (!ref) return undefined;
    if (byId.has(ref)) return ref;
    const mapped = idRemap.get(ref) ?? idRemap.get(kebab(ref));
    return mapped && byId.has(mapped) ? mapped : undefined;
  };

  // Guarantee a focal company A.
  let sideA = resolve(raw.sideAId);
  if (!sideA) {
    const firstCompany = nodes.find((n) => n.category === "company");
    sideA = firstCompany?.id;
  }
  if (!sideA) {
    const id = uniqueId(`${worldId}-corp`);
    nodes.push({
      id,
      label: worldLabel,
      category: "company",
      side: "A",
      note: `The focal organization in: ${scenario}.`,
    });
    byId.set(id, nodes[nodes.length - 1]!);
    sideA = id;
  }
  const sideB = resolve(raw.sideBId);

  // Resolve leader affiliations to a real company; default to sideA.
  for (const n of nodes) {
    if (n.category === "leader") {
      n.affiliation = resolve(n.affiliation) ?? sideA;
    }
  }

  // Seeds: keep those that resolve; ensure at least one targeting sideA.
  const seeds: SeedSpec[] = [];
  const seedIds = new Set<string>();
  for (const s of raw.seeds ?? []) {
    const target = resolve(s.targetId) ?? sideA;
    let id = kebab(s.id || s.label || "seed");
    if (seedIds.has(id)) id = `${id}-${seeds.length + 1}`;
    seedIds.add(id);
    seeds.push({
      id,
      label: (s.label || "Scenario action").slice(0, 120),
      targetId: target,
      payload: (s.payload || scenario).slice(0, 600),
    });
  }
  if (seeds.length === 0) {
    seeds.push({
      id: "scenario",
      label: worldLabel,
      targetId: sideA,
      payload: scenario,
    });
  }

  return { worldId, worldLabel, scenario, sideA, sideB, nodes, seeds, queries };
}

/** Counts per cast bucket for the mock's "THE CAST · N ENTITIES" summary. */
export function castSummary(cast: Cast): Record<string, number> {
  const s: Record<string, number> = {
    leaders: 0,
    competitors: 0,
    journalists: 0,
    cohorts: 0,
    platforms: 0,
    regulators: 0,
  };
  for (const n of cast.nodes) {
    if (n.category === "leader") s.leaders!++;
    else if (n.category === "competitor") s.competitors!++;
    else if (n.category === "journalist" || n.category === "influencer") s.journalists!++;
    else if (n.category === "cohort" || n.category === "community" || n.category === "aggregate")
      s.cohorts!++;
    else if (n.category === "platform") s.platforms!++;
    else if (n.category === "regulator") s.regulators!++;
  }
  return s;
}
