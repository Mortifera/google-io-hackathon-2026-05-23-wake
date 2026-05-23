# Wake — build plan & parallelization

The goal of this document: let us spin up **independent workers, each owning one
subfolder**, that progress without blocking each other, then converge cleanly.

## The one idea that makes parallelization work

Every subsystem talks to every other subsystem through a **small set of frozen
JSON contracts**, never through each other's code. Define those contracts first
(45 min), then each worker:

1. owns exactly one folder,
2. codes against the contracts + a mock/fixture, and
3. integrates by producing or consuming a JSON artifact.

The front-end never waits for the kernel. The kernel never waits for the real
LLM. The data work never waits for anything. We converge on the seams.

### The four seams (freeze these first)

| Seam | Produced by | Consumed by | What it is |
|------|-------------|-------------|------------|
| **`World`** | `worlds/*` | kernel | static graph: nodes, edges, seed actions |
| **`Cascade`** | kernel | viz, interp, analysis | one run: tick log + event DAG + state timeline + final state |
| **`MonteCarloResult`** | analysis | viz | N runs → clusters + pivotal variable |
| **`LLMClient`** | llm | kernel, nodes, edges, interp | model wrapper (+ deterministic mock) |

Plus two function contracts the kernel calls by **dependency injection** (so the
kernel never imports node/edge code):

| Contract | Implemented by | Signature |
|----------|----------------|-----------|
| **`TickFn`** (node behavior) | `nodes` | `(TickInput) → TickOutput` |
| **`EdgeTransform`** (edge behavior) | `edges` | `(event, src, dst, char) → Event \| null` |

If these six are stable, the merge at the end is mechanical.

## Live assignment (2026-05-23)

- **Core agent** (owns `packages/kernel` + `packages/nodes` + `packages/edges`,
  and stays contracts steward): the coupled simulation core that produces the
  real `Cascade`. Picks up `packages/interp` after CP2 unless run separately.
- **4 parallel agents**, one per Claude instance, each building only against the
  committed contracts + fixtures (nobody blocks anyone):
  - **L8** visualization — `apps/web`
  - **L5** world data — `worlds/notion`
  - **L2** llm client — `packages/llm/src/gemini.ts`
  - **L6** analysis — `packages/analysis`
- Kickoff is one line per agent → see `briefs/KICKOFF.md`.

**Integration is git-mediated** (no live orchestration between instances): the
core agent commits a real `Cascade` into `fixtures/` at CP1 (mock LLM + mini
world) and again at CP2 (real Gemini + real Notion world); downstream agents
re-point from the hand-authored fixture to the real one — a one-line change.
Dependencies sequence those *swaps*, never the *start* of any lane.

```
contracts + fixtures + mock (DONE) ──► all lanes build in parallel NOW
        core ─run(mock,mini)─► Cascade ──CP1──► L8 swaps in real cascade
        core + L2 + L5 ─run(Gemini,Notion)─► Cascade ──CP2──┬─► L6 ─► MonteCarlo ─┐
                                                            └─► L7 interp ────────┤
                                                                      CP3 ► L8 wires fan + interp
                                                                      CP4 ► operator + precompute + rehearsal ► DEMO
```

## Stack (default)

**TypeScript end-to-end**, because a single shared type system is the biggest
parallelization win we can buy: `packages/contracts` is imported by both the
kernel and the front-end, so an interface change is a compile error everywhere,
not a silent drift. pnpm workspaces + Turborepo. Next.js for the viz (deploys to
Vercel). Gemini Flash via Vertex / the AI SDK. Clustering is a small hand-rolled
hierarchical impl in TS (no need for scipy at this scale).

> If we'd rather do the kernel/analysis in Python for the clustering libs, the
> only thing that changes is those two packages talk to the rest purely via the
> JSON seams above — still parallelizable, just one more language boundary.

## Monorepo layout — one folder per worker

```
wake/
├── packages/
│   ├── contracts/      [L0] types + zod schemas for all six contracts. THE bedrock.
│   ├── llm/            [L2] Gemini/Vertex client, caching, structured output, MockLLMClient
│   ├── kernel/         [L1] tick loop, scheduler, inbox routing, saturation, branching
│   ├── nodes/          [L3] per-node TickFn: dossier→prompt, (state,inbox)→(delta,events,rationale)
│   ├── edges/          [L4] ~6 LLM channel archetypes + deterministic light edges
│   ├── analysis/       [L6] Monte Carlo clustering + pivotal-variable correlation
│   └── interp/         [L7] event-DAG trace-back: (cascade, question) → narrative
├── worlds/
│   └── notion/         [L5] dossiers, edges, seed actions  (the graph data)
├── apps/
│   └── web/            [L8] Next.js viz: graph, cascade replay, dual-layer, fan, interp panel
├── fixtures/           [L0] golden Cascade + MonteCarlo JSON, mini world  (unblocks everyone)
└── tools/              [L9] operator console, precompute scripts, escape-hatch recorder
```

Only **L0 writes `packages/contracts` and `fixtures/`**. Everyone else reads
them. That is what keeps merge conflicts near zero.

## Workstreams (the workers)

Each worker gets: a folder, the contracts it depends on, a mock to build against,
and a crisp **done-when**.

- **L0 — Contracts & scaffold** *(critical path, ~45 min then maintenance)*
  Define all six contracts as zod schemas + TS types. Scaffold pnpm/turbo/tsconfig.
  Hand-author **one rich fixture `Cascade.json`**, one `MonteCarloResult.json`, a
  `worlds/notion/mini.json` (8-node toy), and ship a `MockLLMClient`.
  *Done when:* `pnpm i && pnpm build` passes and fixtures validate against schemas.

- **L1 — Kernel** *(needs: contracts, mock LLM, mini world)*
  Tick loop, variable time-stepping scheduler (short ticks when active, jump to
  next event when quiet), inbox routing, saturation/attention budgets,
  deterministic seeding, Monte Carlo branching. Calls `TickFn`/`EdgeTransform` by
  injection. *Done when:* mini world + MockLLM → valid `Cascade.json`.

- **L2 — LLM client** *(needs: contracts)*
  Vertex/Gemini Flash wrapper: cached system prompts, structured-output (JSON
  schema) validation, retry/backoff, concurrency limiting, cost accounting, and a
  deterministic `MockLLMClient`. *Done when:* real + mock both satisfy `LLMClient`.

- **L3 — Per-node behavior** *(needs: contracts, LLM interface, a dossier shape)*
  The prompt turning `(state, inbox, clock)` → `(stateDelta, events, rationale)`.
  Dossier→system-prompt templating, tier-aware behavior, the **eval harness**
  (seed a historical Notion event's pre-state, run forward, score resemblance).
  *Done when:* a known event's cascade qualitatively resembles history.

- **L4 — Per-edge behavior** *(needs: contracts, LLM interface)*
  ~6 archetypes: journalist→audience, employee→manager, customer→cohort,
  competitor→strategy, platform-amplification, friend→friend. LLM channels for
  load-bearing edges; parameterized deterministic rules for light edges.
  *Done when:* the same event visibly differs across channels.

- **L5 — World data (Notion)** *(needs: contracts schema only — mostly independent)*
  Scrape/structure public sources → ~200 nodes (Tier 1 named, Tier 2 archetypes,
  Tier 3 aggregates) + edges + the curated seed-action menu. *Done when:*
  `notion/world.json` validates and loads in the kernel.

- **L6 — Analysis** *(needs: contracts; builds against fixture cascades)*
  Cluster N final-state vectors (hierarchical), pick representative runs per
  cluster, compute the pivotal variable (which perturbation dimension explains
  the most cluster variance). *Done when:* fixtures → valid `MonteCarloResult`.

- **L7 — Interpretability** *(needs: contracts, LLM; builds against fixture cascade)*
  Trace-back over the event DAG + a Flash call answering "why did X happen" with
  cited upstream event ids. *Done when:* a "why" question on the fixture returns a
  grounded paragraph.

- **L8 — Visualization** *(needs: contracts; builds entirely against fixtures)*
  Force-directed graph, cascade animation + scrub timeline, public/private
  dual-layer toggle, the Monte Carlo fan + pivotal-variable card, interp panel.
  *Done when:* it renders the fixture cascade and fan with motion/pacing.

- **L9 — Integration / operator / precompute** *(needs: everything; the convergence)*
  Wire real LLM + real world + kernel, curate the action menu, precompute the
  Monte Carlo, build the operator console and the **canned-cascade escape hatch**,
  rehearse. *Done when:* the 3-minute demo runs end-to-end, twice.

## Dependency graph

```
              ┌───────────────┐
              │  L0 contracts  │  ← unblocks everyone (45 min)
              └───────┬───────┘
        ┌────────┬────┼─────┬────────┬─────────┐
        ▼        ▼    ▼     ▼        ▼         ▼
      L2 llm   L5 world  L8 viz   (fixtures feed L6/L7/L8)
        │        │        │
        ▼        ▼        │
      L1 kernel ◄─ L3 nodes, L4 edges (injected)
        │
        ▼
   Cascade.json ──► L6 analysis ──► MonteCarloResult.json ──► L8 viz
        └─────────► L7 interp                                 │
                                                              ▼
                                                        L9 integration
```

## Makeshift Gantt (10:30 kickoff → 17:00 submit)

Legend: `█` build  `▒` ramp / standby-support  `▓` integration  `·` not started

```
                          0·1·2·3·4·5·6   (elapsed hours)
L0 contracts + fixtures   ██▒▒▒▒▒▒▒▒▒▒▒
L2 llm client             ▒███▒▒▒▒▒▒▒▒▒
L5 world data (notion)    ██████▒▒▒▒▒▒▒
L8 visualization          ███████████▓▓
L1 kernel                 ·███████▓▓▓▓▓
L3 per-node behavior      ·███████▒▒▒▒▒
L4 per-edge behavior      ···█████▒▒▒▒▒
L7 interpretability       ·····████▒▒▒▒
L6 analysis (montecarlo)  ·····█████▓▓▓
L9 integration/operator   ·······▒▓▓▓▓▓
                          0·1·2·3·4·5·6
```

What starts at minute 0 (no contracts needed yet): L0 (writing them), L2 (pick
SDK), L5 (scraping), L8 (pick graph lib + skeleton against fixtures). Everyone
else starts at ~0:45 once contracts land.

## Convergence checkpoints

- **CP1 (~2:00) — "the seam works":** kernel + MockLLM + mini world emit a real
  `Cascade.json`; viz drops its fixture and renders the real one. Proves L1↔L8.
- **CP2 (~4:00) — "it's real":** swap MockLLM→Flash, mini→Notion world, tune
  node/edge prompts against the eval. L3/L4/L5 land in the kernel.
- **CP3 (~5:00) — "the punchline":** Monte Carlo → analysis → fan view; interp
  panel wired. L6/L7 land in viz.
- **CP4 (~6:30) — "the demo":** operator console, precomputed runs, escape hatch,
  rehearsal. L9.

## Unblocking artifacts (L0 ships these on day-zero so nobody waits)

- `fixtures/cascades/notion-acquisition.json` — a hand-authored full Cascade so
  **viz/interp/analysis build with zero upstream dependency**.
- `fixtures/montecarlo/notion-acquisition.json` — fake fan + clusters + pivotal var.
- `worlds/notion/mini.json` — 8-node toy world for kernel dev.
- `MockLLMClient` — deterministic canned outputs for offline kernel/node/edge dev.

## The common interfaces (contracts v1)

Sketches; `packages/contracts` is the source of truth. TS-ish for brevity.

```ts
// ---- graph (World) : worlds/* → kernel ----
type Tier = 1 | 2 | 3;
type NodeFunction = "actor" | "audience" | "channel" | "artifact";

interface NodeDef {
  id: string;
  label: string;
  tier: Tier;
  fn: NodeFunction;
  dossier: string;              // cached system-prompt material (~200 tok)
  initialState: NodeState;
  activationThreshold: number;  // controls cascade depth
}

interface EdgeDef {
  id: string;
  source: string; target: string;
  direction: "one-way" | "two-way";
  weight: number;
  character: string;            // archetype key, e.g. "journalist->audience"
  llmMediated: boolean;         // true = load-bearing channel, false = light rule
}

interface SeedAction { id: string; label: string; targets: string[]; payload: string; }
interface World { id: string; nodes: NodeDef[]; edges: EdgeDef[]; seeds: SeedAction[]; }

// ---- node state ----
interface Mood { attention: number; sentiment: number; urgency: number; } // -1..1 / 0..1
interface NodeState {
  beliefs: string;
  mood: Mood;
  publicFace: string;
  privateInterior: string;
  history: string[];            // capped recent events
  commitments: string[];
  attentionBudget: number;      // depletes → saturation
  active: boolean;
}

// ---- events (the unit that flows; carries DAG provenance) ----
type EventType = "public_post" | "private_message" | "decision" | "action" | "emergent";
interface Event {
  id: string;
  type: EventType;
  source: string; target: string;
  channel: string;              // platform / edge id
  content: string;
  time: number;                 // world clock
  causedBy: string | null;      // parent event id → DAG
  rationale?: string;
}

// ---- node behavior (nodes/) : injected into kernel ----
interface TickInput  { state: NodeState; inbox: Event[]; clock: number; node: NodeDef; }
interface TickOutput { stateDelta: Partial<NodeState>; outgoing: Event[]; rationale: string; }
type TickFn = (i: TickInput, llm: LLMClient) => Promise<TickOutput>;

// ---- edge behavior (edges/) : injected into kernel ----
type EdgeTransform =
  (e: Event, src: NodeDef, dst: NodeDef, edge: EdgeDef, llm: LLMClient) => Promise<Event | null>;

// ---- run output (kernel) : → viz / interp / analysis ----
interface Tick { clock: number; activeNodeIds: string[]; events: Event[]; }
interface StateSnapshot { tick: number; states: Record<string, NodeState>; }
interface Cascade {
  meta: { worldId: string; seedActionId: string; seed: number; perturbation?: Record<string, unknown>; };
  ticks: Tick[];
  eventDag: Event[];                 // every event, with causedBy chains
  stateTimeline: StateSnapshot[];    // per-tick snapshots → scrub + dual-layer
  divergence: { tick: number; count: number }[]; // public/private gap → leak triggers
  finalState: Record<string, NodeState>;
}

// ---- monte carlo (analysis) : → viz ----
interface OutcomeCluster { id: string; label: string; summary: string; memberRunIds: string[]; representativeRunId: string; }
interface PivotalVariable { dimension: string; explainedVariance: number; description: string; }
interface MonteCarloResult {
  runs: { id: string; clusterId: string; outcomeVector: number[] }[];
  clusters: OutcomeCluster[];
  pivotal: PivotalVariable;
}

// ---- model (llm/) : used everywhere ----
interface LLMUsage { inTokens: number; outTokens: number; cached: number; costUsd: number; }
interface LLMClient {
  complete<T>(args: {
    system: string;            // cached per-node dossier
    user: string;
    schema: unknown;           // JSON schema for structured output
    temperature?: number;
  }): Promise<{ data: T; usage: LLMUsage }>;
}

// ---- interpretability (interp/) ----
interface Explanation { answer: string; citedEventIds: string[]; }
type Explain = (cascade: Cascade, question: string, llm: LLMClient) => Promise<Explanation>;
```

## Risks to the parallel plan specifically

- **Contract churn mid-build.** Mitigation: L0 freezes v1 at 0:45; after that,
  changes go through L0 as additive fields only (never rename/remove).
- **Viz built against a fixture that doesn't match reality.** Mitigation: the
  fixture is authored to the *schema*, and CP1 swaps it for a real cascade early.
- **Kernel coupling to node/edge code.** Mitigation: strict dependency injection —
  kernel imports only `contracts`, never `nodes`/`edges`.
- **Real LLM cost during dev.** Mitigation: MockLLMClient is the default; real
  Flash only switches on at CP2 and in precompute.
```
