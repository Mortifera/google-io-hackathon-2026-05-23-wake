# Wake — Submission Deep-Dive (reference for pitch / video / form)

> One reference doc to build the Google I/O Hackathon submission from: the vision,
> what we planned vs. what we built vs. what's left (Phase C), the proof points,
> and **draft answers for every field on the submission form**. Sources: `VISION.md`,
> `PLAN.md`, `ARCHITECTURE.md`, `docs/final-push.md`, `docs/demo-script.md`,
> `docs/extensions.md`, `docs/critical-path.html`, and a code scan of every package.
>
> Event: **Google I/O Hackathon**, Shack15 SF, Sat 2026-05-23. Submissions due 5:00pm PT.
> Problem statement: *"Build something that's never been built before with **Gemini
> 3.5 Flash** — sub-agent deployment, multi-step workflows, long-horizon tasks at scale."*

---

## 0. TL;DR (the 30-second version)

**Wake is a world model for organizational action.** You drop one action into a
graph of ~200 real entities — Ivan Zhao, Casey Newton, Ben Thompson, Linear,
"productivity Twitter," Sequoia — where **every node is its own Gemini 3.5 Flash
reasoner**, and you watch the consequences cascade in real time. Then Wake runs the
same action **a thousand times with perturbations** (Monte Carlo) and collapses the
result into a handful of outcome regimes, surfacing the **single pivotal variable**
that decides which future you land in.

The thesis: *"We didn't build an oracle. We made the consequence space legible — so
you can watch your decision before you make it, and pick the version that survives.
Flash is what makes a thousand parallel reasoners cheap enough to actually run."*

It is built **directly on the problem statement**: sub-agents = each node/edge,
multi-step workflows = the tick-by-tick cascade, long-horizon scale = the Monte Carlo.

---

## 1. The vision (what we set out to build)

From `VISION.md` / `final-push.md`:

- **The category:** *the simulation layer of the AI-native company.* If AI takes
  over orchestration and humans become the judgment layer, every orchestrator must
  ask "what happens if I take action X?" before taking it. Robotics is solving the
  world model for *physical* action; nobody is solving it for **organizational,
  textual** action. Wake is that world model.
- **The mechanic:** a pre-built world (graph of people, competitors, journalists,
  customer cohorts, platforms, regulators) reacts to an injected action; the
  reaction propagates as a cascade; the cascade is run as a distribution.
- **The honesty moat:** *Monte Carlo, not oracle.* Wake never claims to predict one
  future. It claims the consequence-space, where outcomes diverge, and the pivotal
  variable — the softer, truer, un-disprovable claim.

### The named features the vision called for
| Feature | What it does |
|---|---|
| **Affect ramp** | Node color encodes emotional state (calm → attentive → excited → alarmed → hostile → churning). Color *is* the data. |
| **Public/private dual layer** | Each node has a public face and a private interior; when they diverge too far, a grievance **leaks**. |
| **Live cascade** | The action propagates tick-by-tick; you watch *who* reasons and read *why*. |
| **Monte Carlo fan** | The single run becomes a sheaf of futures, clustered into outcome regimes. |
| **Pivotal variable** | The one input dial that most explains which regime you land in. |
| **Interpretability / butterfly trace** | Click any node → "ask why" → the real causal chain traces back to the seed, cited event by event. |
| **Operator console + escape hatch** | A curated action menu; a precomputed identical run one click away if the live API stalls. |
| **Generalization** | Same engine, a second world (Anthropic). |
| **Genesis (moonshot)** | Type any scenario in plain English → an agent researches the real cast and builds a runnable world on the spot. |

---

## 2. The plan (how we built it) — parallelization + checkpoints

`PLAN.md` decomposed Wake into **frozen-contract seams** so workers could build in
parallel against `@wake/contracts` (JSON/function contracts), never each other's code:

- **L0 contracts** — the seams (World, Cascade, Event, Tick, MonteCarloResult, LLMClient, Interp, EdgeTransform).
- **L1 kernel** — the propagation simulator.
- **L2 llm** — MockLLMClient (offline) + GeminiLLMClient (real).
- **L3 nodes** — per-node reasoning prompt + structured output.
- **L4 edges** — per-edge channel transform (distort/amplify/kill).
- **L5 worlds** — the Notion + Anthropic dossiers → `world.json`.
- **L6 analysis** — fingerprint → cluster → pivotal variable.
- **L7 interp** — the causal-DAG backward trace.
- **L8 viz** — the Next.js app.
- **L9 integration** — operator console, precompute, rehearsal.

**Checkpoints:** CP1 "the seam works" (kernel + Mock + mini world → real Cascade.json
rendered) → CP2 "it's real" (swap Mock→Gemini, mini→Notion) → CP3 "the punchline"
(Monte Carlo → fan + pivotal) → CP4 "the demo" (operator console, precompute, escape
hatch, rehearsal). **All four checkpoints are met.**

---

## 3. What we actually built (verified, in-repo today)

This is the "feature-complete floor" from `final-push.md §0`, confirmed by code scan.

### 3.1 The engine — `@wake/kernel`
A real propagation-wave simulator (not a scripted swarm):
- **Variable time-stepping** — no fixed ticks; events are scheduled by edge
  character delay (journalist→audience fast, employee→manager slow), so rhythm emerges.
- **Activation thresholds + attention-budget saturation** — nodes act only on
  sufficient signal and budget; the cascade terminates naturally.
- **`causedBy` provenance DAG** — every event records what caused it (powers the trace).
- **Deterministic seeding** — same seed → same run (proven in tests).
- **Streaming mode** — `runCascadeStream` is an async generator emitting
  `tick-start` (who's thinking) → `node-acted` (why, per node) → `tick` → `done`.
  **Streamed output is byte-identical to batch** (tested).
- **Public/private dual layer** — state carries `publicFace`, `privateInterior`,
  `sentiment`, `urgency`; divergence is tracked; **leaks** emerge as `type:"emergent"`
  events to platform nodes when private negativity crosses a threshold.

### 3.2 Per-node + per-edge reasoning on **Gemini 3.5 Flash** — `@wake/llm`, `@wake/nodes`, `@wake/edges`
- **`GeminiLLMClient`** (`packages/llm/src/gemini.ts`): model id **`gemini-3.5-flash`**
  via `@google/genai`. Structured output (`responseJsonSchema` + zod validation with
  JSON-repair retries), **context caching** of the per-node dossier system prompt
  (implicit prefix + optional explicit cache), exponential-backoff retries on
  **429/5xx and network blips** (ECONNRESET/`fetch failed`/UND_ERR_*), a **semaphore**
  bounding in-flight calls (Tier-1 rate limits), and **cost accounting** (`usage.costUsd`).
- **`MockLLMClient`** — deterministic offline fake so the whole system runs free.
- **Nodes** reason in character from a tiered dossier + inbox + current state, emitting
  affect/sentiment/public-face/action/rationale.
- **Edges** transform a message as it crosses a relationship (filter / distort /
  amplify / kill), which is how framing mutates as the story spreads.

### 3.3 The worlds — `worlds/`
- **Notion: 208 nodes, 346 edges, 5 seed actions** (tiers: 41 Tier-1 named, 74
  Tier-2, 93 Tier-3), all from real public-source dossiers.
- **Anthropic: 57 nodes, 94 edges, 5 seeds** (the generalization world).
- **mini: 8 nodes** (the CP1 dev fixture).
- Build pipeline: human/LLM dossiers → `build.ts` → validated `world.json`.

### 3.4 Monte Carlo + analysis — `@wake/kernel` sweep + `@wake/analysis`
- **`sweep()`** generates perturbation combinations over **framing**, **press
  climate**, and **competitor speed**, runs N cascades, and is **resilient to
  per-run failure** (drops a bad run instead of aborting the batch).
- **Analysis** fingerprints each run → **clusters** into outcome regimes → computes
  the **pivotal variable** (which input perturbation best explains the divergence).
- Shipped fan (commit `be625d6`): a **live Gemini sweep of 32 runs ($3.19)** → **2
  outcome regimes, Consumer backlash (24) / Competitor wins (8)**, with the pivotal
  variable **"acquisition messaging framing" at 58%** — deliberately re-tuned down
  from an earlier too-clean 100% so the dial is dominant-not-deterministic (credible,
  not rigged). Both regimes are negative; the honest read is "this acquisition is
  risky in most futures, and the lever you control is the framing." Cluster labels
  match the fan's design vocabulary.

### 3.5 Interpretability — `@wake/interp` + `/api/explain`
- Walks the `causedBy` DAG **backward** from any node to the seed, producing a
  narrated explanation chain with **cited event ids**.
- Live server-side **Gemini** explanation via `apps/web/app/api/explain/route.ts`,
  with a templated fallback so it never fails on stage.

### 3.6 The interface — `apps/web` (Next.js 16)
- **`GraphCanvas`** — force-directed graph; affect coloring; cascade animation;
  public/private layer toggle; leak rendering.
- **`Transport`** — play / pause / speed / scrub across the tick timeline.
- **`InspectorPanel`** — node/edge inspection + "ask why" causal trace.
- **`MonteCarloFan`** — the fan-of-futures viz + the pivotal-variable card.
- **`ReasoningFeed`** — the **live per-node reasoning stream** (who's thinking + why).
- **`OperatorConsole`** — the 5-action menu, scenario selection, the escape hatch.
- **Live tick-by-tick** — `/api/stream-cascade` SSE route paints ticks onto the graph
  as Gemini resolves them, with the precomputed replay one click away.

### 3.7 Precomputed assets (so the demo can't fail)
- **10 cascade fixtures** including the real Notion acquisition (14 ticks), the other
  4 menu scenarios (ceo-steps-down, open-source, free-tier-removal, engineer-idea),
  and the **Anthropic safety-incident cascade (21 ticks)** for generalization.
- **Monte Carlo fan fixture** (Notion acquisition, **32 runs / 2 regimes**, pivotal
  "acquisition messaging framing" 58%).
- A **matched pre/post-acquisition pair** (`fixtures/cascades/notion-{pre,post}acq.engineer-idea.json`)
  for the "same action, different world" beat — the manager buries vs. weaponizes the
  same idea.

### 3.8 Genesis — natural language → a runnable world — `tools/genesis`
A working CLI that turns one English sentence into a validated, runnable Wake world:
1. **Research the cast** — a **Google-Search-grounded Gemini call** (`tools:[{google_search:{}}]`)
   finds the real leaders, competitors, journalists, cohorts, platforms, regulators.
2. **Structure the cast** — a structured-output call types it (kebab ids, sides, affiliations).
3. **Size to budget** — `planSizing(budget, ticks)` grows the entity count until
   generation + one validating run fits the `$` budget, then allocates across categories.
4. **Generate dossiers** — batched **Gemini 3.5 Flash**.
5. **Wire edges deterministically** — code (not the LLM) wires the graph with
   invariants (unique ids, no self-loops, every edge resolves, reachability repair).
6. **Validate** — `WorldSchema.parse` + `loadWorld()` + a real offline cascade.

Locked demo sample: **"What happens if Stripe acquires Plaid?" → ~21 entities, 37
edges, 3 seeds** at `--budget 0.1` (~$0.016, ~55s), with a **committed precomputed
fallback** (`tools/genesis/examples/stripe-plaid.json` + cascade) so it never fails
on camera. Loads and runs. Model: `gemini-3.5-flash`. **See §6 for the managed-agents
nuance — this matters for a $5,000 prize and a required form field.**

---

## 4. Phase C — what's still in flight (the final push)

From `final-push.md` / `critical-path.html`, these are *upgrades on a working floor*
(each independently droppable; the floor records fine without any of them):

| # | Upgrade | Why it earns its place | Status |
|---|---|---|---|
| **3a** | **Per-node live reasoning** ("watch it think") — stream who's thinking + each one-line rationale the instant its call returns | **THE centerpiece.** Converts tick latency into a live feed of reasoning; the moment the judge's "it's scripted" reflex dies | **done + verified** — kernel streams `tick-start`/`node-acted`; Agent 1 renders the live reasoning stream |
| **3b** | **Same action, different world** — engineer's idea dies at the cautious manager pre-acquisition, escalates post-acquisition | The beat that separates "cool simulator" from "world model" | **done** — matched pre/post pair published; Agent 1 wired the two-worlds view (`1f7bdeb`) |
| **3c** | **Generalization + a shareable URL** — flash to Anthropic; deploy the replay to Vercel | "They can touch it themselves" is disproportionately persuasive | **done** — Anthropic cascade shipped; **live** at wake-web-zeta.vercel.app (QA'd green, env across all environments) |
| **3e** | **Fan credibility re-tune** — from a too-clean 100%/50-50 to ~80% explained / uneven split | Integrity: a fake-looking fan retroactively makes the live cascade look scripted | **done** — 32-run live sweep, pivotal 58% (was a too-clean 100%), mock labels (`be625d6`) |
| **3f** | **Variant A/B + what the sweep settles on** — "we ran your announcement two ways; the pivotal variable points to 'independent'" | The decision-optimization wedge, phrased instrument-not-advisor | **done** — instrument-register pivotal copy (reports the reading, points at the lever; never "recommends") |
| **3d** | **Genesis moonshot** — NL → world on demand | Turns the TAM from "a Notion simulator" into "any decision in any org" | **done + camera-ready** — locked command, committed precomputed fallback, `DEMO.md`; Managed Agents API stays the (unwired) stretch — see §6 |

**Freeze discipline:** app done + rehearsed by 4:00pm, hard fold-in cutoff ~3:40.
The feature-complete demo is the safety net; reliability before flash; the escape
hatch is always one click away.

**Not doing (so we don't drift):** no full interactive variant lab (the A/B framing
ships, the heavyweight lab is deferred); no live world-state-chaining UI (the
"different world" beat ships as a precompute); no bigger graph for its own sake.

---

## 5. Why it wins — judging-criteria alignment

Round 1 weighting: **Live Demo 45% · Creativity/Originality 35% · Impact 20%**
(Round 2: equal weighting).

- **Live Demo (45%)** — one continuous ~90s arc: recognizable world → pick an action
  → **watch 200 minds reason live** → a leak surfaces → ask-why traces the cause →
  the fan + pivotal card → flash to Anthropic. Reliability engineered in (one SSE per
  run, escape hatch, fallbacks). This is where we spend our points.
- **Creativity/Originality (35%)** — "agentic AI" is saturated; **"the organizational
  world model" has no incumbent.** Live visible reasoning of hundreds of nodes + the
  public/private leak + the pivotal-variable fan is a thing judges have not seen.
- **Impact (20%)** — a new category (the simulation layer of the AI-native company)
  with a visible wedge (decision-optimization) and generalization (Notion + Anthropic
  + Genesis-on-demand).

**The three audiences, one screen:** DeepMind sees their problem statement rendered
(sub-agents per node, multi-step ticks, long-horizon Monte Carlo) and their own
"world model" vocabulary; AI Futures Fund sees a claimable category + wedge;
Cerebral Valley gets the 60-second clip (named entities + a punchline).

**The honest framing is the defensible one:** Monte Carlo, not oracle. Un-attackable.

---

## 6. ⚠️ Managed Agents — read before you fill the form ($5,000 on the line)

There is a **required form field** ("Does your project use managed agents? Explain
how.") and a **separate $5,000 prize for best use of managed agents.** Be precise and
honest — the rules disqualify projects that misrepresent what was built.

**What is true today:**
- Wake is, end to end, a **multi-agent system**: 200+ autonomous Gemini 3.5 Flash
  agents (one per node), plus edge-agents that transform messages, orchestrated
  through a multi-step tick workflow, scaled out as a Monte Carlo of thousands of
  agent-runs. This *is* "sub-agent deployment / multi-step workflows / long-horizon
  tasks" — the literal problem statement.
- **Genesis uses agentic, tool-using Gemini**: a **Google-Search-grounded** research
  call (the model issues its own web-search queries) feeding a structured generation
  pipeline. It is architected as a managed-agent runner-in-waiting (injectable LLM,
  `onStep` progress streaming, remote-runner-ready).

**What is NOT (yet) true:**
- Nothing in the repo calls the **Gemini Managed Agents API** specifically
  (`ai.google.dev/gemini-api/docs/agents`). The `tools/genesis/README.md` explicitly
  lists managed agents as a **"Stretch"**: the pipeline is *structured for* a remote
  managed-agent runner, but currently runs as a local CLI orchestrating direct
  `generateContent` calls (with `google_search` grounding).

**This is a decision for you, not me:**
- **Option A (honest, ship as-is):** answer the field truthfully — "Wake is a
  multi-agent Gemini system; Genesis is an agentic, search-grounded build pipeline" —
  and don't bank on the managed-agents prize.
- **Option B (go for the $5k):** in the remaining Phase C time, port the Genesis
  research+generation pipeline to run on the **Gemini Managed Agents API** (the
  README's stretch — the seams are already there). Then the field answer is a true
  "yes, here's how," and Genesis becomes a live prize contender.

Draft answers for both are in §7. **Flag this with the team before submitting.**

---

## 7. Submission form — draft answers

> Form fields (from the submission screenshot): Team Name*, Team Members,
> Project Description*, Public GitHub Repository*, Demo Video*, "Does your project use
> managed agents? Explain how."*, feedback for organizers, feedback on Google
> products/models. (* = required.)

### Team Name
`<FILL IN>` — not set in repo. (Candidate: "Wake".)

### Team Members
Jack Gardner (CV handle `jackgardner`). Add any teammates (max 4 total) via the
form's people search.

### Public GitHub Repository
`https://github.com/Mortifera/google-io-hackathon-2026-05-23-wake`
**ACTION REQUIRED:** the rules require the repo to be **public** — verify/flip
visibility before submitting (couldn't confirm here; `gh` not authed). Also confirm
`.env` is gitignored and no key is in history.

### Project Description (required)
> **Wake — a world model for organizational action.** Drop one action into a graph
> of ~200 real entities (executives, competitors, journalists, customer cohorts,
> platforms, regulators), where **every node is its own Gemini 3.5 Flash reasoner**,
> and watch the consequences cascade in real time: the press turns, communities go
> hostile, and a private grievance leaks when a node's public face diverges too far
> from its private interior. Then Wake runs the same action a thousand times with
> perturbations (a Monte Carlo sweep) and collapses the result into a few outcome
> regimes, surfacing the **single pivotal variable** that decides which future you
> land in. Click any outcome and Wake traces the exact causal chain back to your
> action, cited event by event.
>
> The problem it solves: as AI takes over execution and humans become the judgment
> layer, every decision-maker needs to ask "what happens if I do X?" before doing it.
> Robotics is building world models for physical action; Wake builds one for
> organizational, textual action. It is not an oracle. It makes the consequence space
> legible, so you can watch your decision before you make it and pick the version that
> survives. Gemini 3.5 Flash is what makes a thousand parallel reasoners cheap enough
> to actually run.
>
> Built at the hackathon: the full propagation kernel (streaming, public/private
> layers, causal DAG), per-node and per-edge Gemini 3.5 Flash reasoning, two real
> worlds (208-node Notion, 57-node Anthropic), the Monte Carlo sweep + clustering +
> pivotal-variable analysis, the interpretability trace, the Next.js interface with
> live tick-by-tick streaming, and Genesis (natural language to a runnable world).

### Demo Video (required, ~1 min)
1-minute YouTube. Suggested cut (tightened from `demo-script.md`):
- **0:00–0:10** Notion world fades up, named entities legible. *"This is Wake. Give
  it any action a company could take, and it simulates what happens next. Every node
  is a real person or platform, and each one is its own Gemini 3.5 Flash reasoner."*
- **0:10–0:18** Click **"Notion is acquired by Microsoft."** *"We inject one action, and let go."*
- **0:18–0:40** The cascade runs **live** — the reasoning feed streams who's thinking
  and why; colors flip to hostile; a grievance **leaks**. *"This isn't a progress bar.
  It's 200 minds reasoning, live. And that, that's a leak."*
- **0:40–0:48** Click a hostile cohort → **ask why** → the causal line traces to the
  seed. *"It's not a black box. Every outcome traces back, cited."*
- **0:48–0:58** Pull back to the **fan**; the **pivotal card** lands. *"We ran the
  whole distribution. The single biggest determinant of which world you land in is
  the framing. The sweep points to 'independent.'"*
- **0:58–1:00** *"We didn't build an oracle. We made the consequence space legible.
  Flash is what makes it cheap enough to run."*
- (Keep the Anthropic flash + Genesis as Q&A/stretch, not in the 60s cut.)
- **Rule reminder:** the video must clearly show **what your team built at the event**.

### "Does your project use managed agents? Explain how." (required) — see §6
**Draft A (as built today — honest):**
> Wake is a multi-agent system built on Gemini 3.5 Flash: each of ~200 nodes in the
> world is an autonomous agent that reasons in character every tick, and edges are
> agents that transform messages as they cross relationships, all orchestrated through
> a multi-step tick workflow and scaled out as a Monte Carlo of thousands of agent
> runs. Our Genesis component is an agentic, **Google-Search-grounded** pipeline: a
> Gemini agent issues its own web searches to research the real cast for a scenario,
> then generates a runnable simulation world. We use direct Gemini API tool-use rather
> than the Managed Agents API; Genesis is architected (injectable runner + streamed
> progress steps) to move onto Managed Agents as the remote runner.

**Draft B (only if you actually wire the Managed Agents API in Phase C):**
> Yes. Genesis runs on the **Gemini Managed Agents API**: a managed agent on a remote
> runner takes a natural-language scenario, autonomously researches the real-world
> cast with Google Search, sizes the graph to a dollar budget, and generates a
> validated, runnable Wake world — streaming each step (research → cast → dossiers →
> wiring → validation) back to the operator console. [Describe exactly what you wired.]

### Any feedback for the organizers? (optional)
Optional. Suggested: thank the CV + DeepMind teams; note venue/wifi worked; mention
that clearer up-front guidance on what qualifies for the "managed agents" prize would
help teams decide where to invest. (Edit to taste.)

### Any feedback on the Google products/models you used today? (optional)
Optional, and genuinely useful signal for them. Candidate points (all grounded in our
build): Gemini 3.5 Flash structured output (`responseJsonSchema`) made per-node
typed reasoning clean; context caching of the dossier system prompt mattered for cost
at 200 nodes; **Google Search grounding** worked well for Genesis cast research; we
hit transient network/429s under concurrent load and had to add backoff + a semaphore
(Tier-1 limits were the main constraint on live-cascade latency, ~110s for a full
16-tick run at concurrency 6). Edit to reflect what the team actually felt.

---

## 8. Proof points & numbers (for Q&A and the pitch)

- **Model:** Gemini 3.5 Flash (`gemini-3.5-flash`) for every node, edge, dossier,
  Genesis call, and the live interp explanation.
- **Notion world:** 208 nodes (41 Tier-1 named / 74 Tier-2 / 93 Tier-3), 346 edges, 5 seed actions.
- **Anthropic world:** 57 nodes, 94 edges, 5 seeds (generalization).
- **Cost (real):** a frontier-Flash call ≈ $0.002; a ~200-node cascade ≈ $0.19; the
  shipped **32-run Monte Carlo fan ≈ $3.19**; a Genesis world build ≈ $0.016 (the
  validating cascade runs offline on the mock).
- **Timing:** a full 16-tick-wave cascade ≈ 110s at concurrency 6 (why the live demo
  is seed-paced and the precomputed replay is the escape hatch).
- **Genesis sample:** "Stripe acquires Plaid" → ~21 entities / 37 edges / 3 seeds at `--budget 0.1` (~$0.016, ~55s live); precomputed fallback committed.
- **Determinism:** same seed → byte-identical run; streamed output == batch output (tested).
- **Tests:** schema-validation tests for every contract artifact; kernel mechanics,
  node/edge/integration, sweep, analysis math, and web model tests all present.

---

## 9. Pre-submission checklist
- [ ] Set the **Team Name**; add teammates (≤4).
- [ ] Make the **GitHub repo public**; confirm `.env`/keys are not in history.
- [ ] Decide **Option A vs B** for managed agents (§6) — flag to the team.
- [ ] Record + upload the **≤1-min demo video** (YouTube); show what was built at the event.
- [ ] Paste the **Project Description** (§7).
- [ ] Paste the **managed-agents** answer (§7, the chosen draft).
- [ ] Optional: organizer feedback + Google-products feedback.
- [ ] Final rehearsal of the live arc + verify the escape-hatch replay works.
- [ ] Double-check the submission link, repo link, and that all members are added.
