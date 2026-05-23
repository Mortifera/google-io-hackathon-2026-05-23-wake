/**
 * Stage 5-6 of the mock: "Writing edges & channels" and "Assembling world.json".
 * Deterministic graph wiring — the LLM picks the cast; CODE wires the graph, so
 * the structure is always valid (no LLM hallucinating dangling edges). Uses the
 * same character vocabulary as worlds/notion, with load-bearing (llmMediated)
 * edges on the canonical archetypes L4 understands.
 *
 * Guarantees: unique node/edge ids, no self-loops, every edge resolves, every
 * non-root node has an inbound path (a reachability pass repairs orphans), and
 * the result parses against WorldSchema.
 */
import type {
  World,
  NodeDef,
  EdgeDef,
  SeedAction,
  NodeState,
  Mood,
  Tier,
  NodeFunction,
} from "../../packages/contracts/src/index";
import type { Cast, CastNode, CastCategory } from "./cast";

const mood = (attention: number, sentiment: number, urgency: number): Mood => ({
  attention,
  sentiment,
  urgency,
});

interface CatSpec {
  tier: Tier;
  fn: NodeFunction;
  thr: number;
  mood: Mood;
}

function specFor(cat: CastCategory): CatSpec {
  switch (cat) {
    case "company":
      return { tier: 1, fn: "actor", thr: 0.1, mood: mood(0.25, 0.1, 0.15) };
    case "leader":
      return { tier: 1, fn: "actor", thr: 0.3, mood: mood(0.3, 0.1, 0.2) };
    case "competitor":
      return { tier: 1, fn: "actor", thr: 0.3, mood: mood(0.35, 0.0, 0.3) };
    case "journalist":
      return { tier: 1, fn: "channel", thr: 0.2, mood: mood(0.3, 0.0, 0.2) };
    case "influencer":
      return { tier: 1, fn: "channel", thr: 0.25, mood: mood(0.35, 0.0, 0.25) };
    case "platform":
      return { tier: 2, fn: "channel", thr: 0.15, mood: mood(0.5, 0.0, 0.4) };
    case "community":
      return { tier: 2, fn: "audience", thr: 0.2, mood: mood(0.4, 0.0, 0.3) };
    case "cohort":
      return { tier: 2, fn: "audience", thr: 0.35, mood: mood(0.3, 0.05, 0.2) };
    case "regulator":
      return { tier: 2, fn: "actor", thr: 0.55, mood: mood(0.3, 0.0, 0.25) };
    case "aggregate":
      return { tier: 3, fn: "audience", thr: 0.4, mood: mood(0.2, 0.05, 0.15) };
  }
}

function mkNode(c: CastNode, isSideA: boolean): NodeDef {
  const spec = specFor(c.category);
  const initialState: NodeState = {
    beliefs: c.note ? c.note.slice(0, 160) : `${c.label} — ${c.category} in this scenario.`,
    mood: spec.mood,
    publicFace: "",
    privateInterior: "",
    history: [],
    commitments: [],
    attentionBudget: 1,
    active: false,
  };
  return {
    id: c.id,
    label: c.label,
    tier: spec.tier,
    fn: spec.fn,
    // Draft dossier = research note; the dossier stage enriches it with Flash.
    dossier: c.note?.trim() || `${c.label}: a ${c.category} relevant to "${c.label}".`,
    initialState,
    activationThreshold: isSideA && c.category === "company" ? 0 : spec.thr,
  };
}

export function castToWorld(cast: Cast): World {
  const nodes: NodeDef[] = cast.nodes.map((c) => mkNode(c, c.id === cast.sideA));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges: EdgeDef[] = [];
  const edgeIds = new Set<string>();
  const push = (
    source: string,
    target: string,
    direction: "one-way" | "two-way",
    weight: number,
    character: string,
    llmMediated: boolean,
  ): void => {
    if (source === target || !nodeIds.has(source) || !nodeIds.has(target)) return;
    let id = `${source}->${target}`;
    if (edgeIds.has(id)) {
      let n = 2;
      while (edgeIds.has(`${id}#${n}`)) n++;
      id = `${id}#${n}`;
    }
    edgeIds.add(id);
    edges.push({ id, source, target, direction, weight, character, llmMediated });
  };

  const of = (cat: CastCategory): CastNode[] => cast.nodes.filter((n) => n.category === cat);
  const companies = of("company");
  const leaders = of("leader");
  const competitors = of("competitor");
  const journalists = [...of("journalist"), ...of("influencer")];
  const platforms = of("platform");
  const audiences = [...of("cohort"), ...of("community"), ...of("aggregate")];
  const regulators = of("regulator");

  // 1. Internal leadership ring per company (load-bearing, two-way).
  for (const co of companies) {
    const team = leaders.filter((l) => l.affiliation === co.id);
    for (const l of team) push(co.id, l.id, "two-way", 0.88, "internal-leadership", true);
    for (let i = 0; i + 1 < team.length; i++) {
      push(team[i]!.id, team[i + 1]!.id, "two-way", 0.7, "internal-leadership", true);
    }
  }

  // 2. Both companies brief the press (company->journalist, load-bearing).
  for (const co of companies) {
    for (const j of journalists) push(co.id, j.id, "one-way", 0.7, "company->journalist", true);
  }

  // 3. Cross-company channel: sideA acts on sideB (the deal itself).
  if (cast.sideB) push(cast.sideA, cast.sideB, "one-way", 0.8, "competitor->strategy", true);

  // 4. sideA's move pings the competitors (competitor->strategy, load-bearing).
  for (const c of competitors) push(cast.sideA, c.id, "one-way", 0.5, "competitor->strategy", true);

  // 5. Journalists publish to platforms (journalist->audience, load-bearing).
  for (const j of journalists) {
    for (const p of platforms) push(j.id, p.id, "one-way", 0.85, "journalist->audience", true);
  }
  // Peer journalist lateral edge (friend->friend) for a touch of cross-talk.
  for (let i = 0; i + 1 < journalists.length; i += 2) {
    push(journalists[i]!.id, journalists[i + 1]!.id, "two-way", 0.4, "friend->friend", true);
  }

  // 6. Platforms amplify to audiences (light platform-amplification). Round-robin
  //    so every audience gets at least one inbound without O(P×A) blow-up.
  if (platforms.length > 0) {
    audiences.forEach((a, i) => {
      const p = platforms[i % platforms.length]!;
      push(p.id, a.id, "one-way", 0.7, "platform-amplification", false);
    });
    // A couple of journalists seed each platform's audience pool directly too.
    for (const p of platforms) push(p.id, cast.sideA, "one-way", 0.3, "customer->cohort", false);
  }

  // 7. Audience feedback to the focal company (light, customer->cohort).
  audiences.slice(0, 6).forEach((a) => push(a.id, cast.sideA, "one-way", 0.4, "customer->cohort", false));

  // 8. Regulators <-> focal company (two-way light, gives regulators inbound).
  for (const r of regulators) push(r.id, cast.sideA, "two-way", 0.55, "regulator->company", false);

  // 9. Reachability repair: connect any orphan (no inbound, not a root) so a
  //    cascade can actually reach it.
  const roots = new Set<string>([cast.sideA, ...cast.seeds.map((s) => s.targetId)]);
  const inbound = new Set<string>();
  for (const e of edges) {
    inbound.add(e.target);
    if (e.direction === "two-way") inbound.add(e.source);
  }
  const fallbackPlatform = platforms[0]?.id;
  for (const n of nodes) {
    if (inbound.has(n.id) || roots.has(n.id)) continue;
    const isAudience = n.fn === "audience";
    if (isAudience && fallbackPlatform) {
      push(fallbackPlatform, n.id, "one-way", 0.5, "platform-amplification", false);
    } else {
      push(cast.sideA, n.id, "one-way", 0.4, "competitor->strategy", true);
    }
  }

  const seeds: SeedAction[] = cast.seeds.map((s) => ({
    id: s.id,
    label: s.label,
    targets: [s.targetId],
    payload: s.payload,
  }));

  return {
    id: cast.worldId,
    label: cast.worldLabel,
    nodes,
    edges,
    seeds,
  };
}
