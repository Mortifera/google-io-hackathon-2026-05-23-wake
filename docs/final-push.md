# Wake — the push to the demo

*What we're building toward in the final ~90 minutes (NOW ≈ 2:30pm → freeze 4:00pm).
Standalone statement of the vision and the plan. No agent prompts — just the shape
of the thing and how we get there.*

---

## 0. Where we already are

Feature-complete on the core. All of this works and is verified end-to-end:

- The **kernel** — a real propagation-wave simulator: variable time-stepping,
  activation thresholds, attention-budget saturation, a full `causedBy`
  provenance DAG, deterministic seeding, and a **streaming** mode (`runCascadeStream`).
- **Per-node and per-edge behaviour** on Gemini 3.5 Flash — nodes reason in
  character (public face vs. private interior), edges filter/distort/amplify/kill.
- A **208-node Notion world** and a **57-node Anthropic world**, both from real
  public-source dossiers.
- The **Monte-Carlo sweep** → a real fan of 16 futures, clustered, with a
  genuine **pivotal variable** ("framing is the fork in the road").
- **Interpretability** — click any node → the real causal chain traces back to
  the seed, narrated, with cited event ids.
- The **interface** — force-directed graph, cascade animation with scrub, the
  public/private dual layer with emergent leaks, the operator console + 5-action
  menu, the Monte-Carlo fan, the escape hatch.
- **Live tick-by-tick streaming** — Gemini visibly resolving the cascade onto the
  graph in the running app (verified: SSE → graph paints ticks as they land).

So the question is no longer "can we build it." It's **"how good can we make the
thing a judge actually experiences in 90 seconds?"** Everything below is an
*upgrade on a working floor.*

---

## 1. The demo we want — what the judge experiences

One continuous arc, ~90 seconds of breathtaking material, then conversational depth:

1. **A world they recognize.** The graph fades up — Ivan Zhao, Casey Newton, Ben
   Thompson, Linear, "productivity Twitter," Sequoia — calm, familiar. They lean in.
2. **An action they pick.** "Microsoft acquires Notion." The seed lands.
3. **The world reasons, live and visible.** Not a progress bar — *200 minds
   thinking*. You watch *who* is deliberating and read *why* as each resolves:
   "Casey: frame it as consolidation → posts to Twitter," "Ivan: protect the
   craft → reassures the org." The wave propagates; the press turns; the
   power-users go hostile; a private grievance crosses the public/private gap and
   **leaks**. This is the moment that kills the "it's just a scripted swarm"
   reflex — you can see it isn't scripted.
4. **The same action, a different world.** The killer intellectual beat: the
   engineer's idea that **dies at her cautious manager pre-acquisition** *escalates
   to leadership post-acquisition* — because the world changed shape, and the same
   action means different things in different worlds. Nobody has to explain it.
5. **The thousand futures + the recommendation.** Pull back: the single run
   becomes a sheaf of futures, two clean regimes. We frame it as *"we ran your
   announcement two ways"* and the card that travels surfaces the dial **and the
   call**: *"the single thing that decides your fate is whether you lead with
   'independent' or 'integrated' — so lead with 'independent.'"* That's not a
   prediction; it's a **decision made legible, and a recommendation made.**
6. **It generalizes.** Flash to Anthropic — same engine, a different world.
7. **You can touch it.** A shareable URL the judges open themselves afterward.
8. **The moonshot (if it lands).** Type *any* company in plain language → an agent
   researches it and **builds the world on the spot.**

The closing line is the whole thesis: *"We didn't predict the future. We made the
consequence space legible — so you can watch your decision before you make it.
It's only possible because Flash makes a thousand parallel reasoners cheap enough
to actually run."*

---

## 2. Why it wins — the three judges, one screen

We're at a hybrid sophistication stage: "agentic AI" is saturated (no promise is
believed), but "the organizational world model" has no incumbent. So we **identify,
not promise** — we name a desire every decision-maker carries quietly ("I want to
know what happens to my decisions once I let go of them") and let them recognize it.

- **DeepMind** want to *feel* what Flash makes possible and see their agentic bet
  vindicated. The **live, visible reasoning** of hundreds of nodes + the
  **interpretability trace** is literally their problem statement rendered: sub-agents
  per node/edge, multi-step workflows as ticks, long-horizon scale as the Monte
  Carlo. And "world model" is *their* research vocabulary — it reframes us from a
  swarm to a research-tier primitive.
- **AI Futures Fund** want a real *category* and to be first to it. "The
  simulation layer of the AI-native company" + a visible **wedge**
  (decision-optimization: which framing avoids the backlash) + **generalization**
  (Notion *and* Anthropic, and Genesis → *any* org) is the company they can claim
  they discovered.
- **Cerebral Valley** want the clip. The fan + the pivotal card + the live
  reasoning is a 60-second screen-grab with named entities and a punchline.

The honest framing is also the defensible one: **Wake is a Monte Carlo over
imagined futures, not an oracle.** It's allowed to be wrong about any single future;
what it claims — the consequence-space, the pivotal variable, where outcomes
diverge — is the softer, truer, un-disprovable claim.

---

## 3. The upgrades we're adding (and why each earns its place)

Each is a meaty, independent, *droppable* piece. The floor demo records fine
without any of them; each one folded in makes it sharper.

### 3a. Per-node live reasoning — "watch it think"
Today the live run streams one event *per tick*, so a tick is ~16s of silence then
a burst. The fix turns the wait into the show: stream **who is thinking now** and
**each node's one-line rationale the instant its call returns**. The dead air
becomes a live feed of reasoning. This is the single highest-leverage thing for the
DeepMind "it's really reasoning" moment — it converts a latency liability into the
spectacle. *(Kernel emits finer-grained events; the viz renders a thinking-pulse +
a reasoning ticker.)*

### 3b. Same action, different world — the intellectual centerpiece
The vision's sharpest idea: run the *same* action in two *shapes* of world and watch
it diverge. We take the acquisition cascade's **final state** and use it as the
**initial conditions of a "post-acquisition" world** — managers now carry the
stress and Microsoft-alignment of the world that just happened — then run the
engineer's idea in both. Pre-acquisition it dies at the cautious manager;
post-acquisition the same idea escalates. The point lands with zero narration: *the
world changed shape, so the same action means something different.* This is the beat
that separates "a cool simulator" from "a world model." *(Pure kernel/tooling: a
world-mutation function + two precomputed cascades.)*

### 3c. Generalization beat + a URL they can open
"Same engine, any world": a live flash to the Anthropic world, plus the
precomputed replay **deployed to a shareable link** judges can play with after the
pitch. The replay is static and rock-solid to deploy — near-zero serverless risk —
and "they can touch it themselves" is disproportionately persuasive.

### 3d. Genesis — the category-defining moonshot (isolated)
A Gemini **Managed Agent** on a remote box takes a natural-language scenario,
**researches** the entities that actually matter, and uses **Flash** to generate a
valid Wake world on demand — with budget/ticks in, a cost estimate out, and the
graph sized to maximize fidelity within budget. This is the moment the TAM stops
being "a Notion simulator" and becomes "**describe any decision in any org and
watch its consequence space, on demand.**" It's fully decoupled from the demo's
critical path — a bonus reveal if it lands, a vision slide if it doesn't.

### 3e. Credibility re-tune of the fan
The current fan reads *too* clean (framing explains 100%, a perfect 50/50 split) —
a skeptic smells synthetic. A light re-tune to ~80% explained variance with a
slightly uneven split makes the punchline more believable without weakening it.

### 3f. The decision made explicit — variant A/B + a recommendation
The fan *already is* a variant comparison (its two clusters are the two framings),
but it's framed implicitly as "16 futures." Make the wedge explicit, cheaply: read
the fan as **"we ran your announcement two ways — independent vs. integrated"** and
surface a **recommended variant** ("lead with 'independent' — it avoids the backlash
regime entirely"). This is the move that turns Wake from "watch consequences" into
"**here's which way to do it**" — the AIFF decision-optimization wedge, on screen, in
one line. It's a `recommendation` field + a copy/narration change, *not* the full
interactive variant/sequence lab (that stays a future extension).

---

## 4. Principles of execution

1. **The record is sacred.** The app must be done + rehearsed by 4:00. We freeze
   the build at a hard **fold-in cutoff (~3:40)** and rehearse whatever's polished.
2. **Floor + droppable upgrades.** The feature-complete demo is the safety net.
   Every upgrade above is independently cut-able; none can break the floor.
3. **Reliability before flash.** The live path must not fail on stage — one SSE
   connection per run, an escape hatch one click away, fallback on any error.
4. **Maximize parallelism with meaty pieces.** Five workers, five substantial,
   non-colliding tracks. Integration happens through committed JSON/fixtures and
   the frozen contracts, not by reaching into each other's folders.
5. **Keep the bottleneck unblocked.** The viz (one folder, one owner) is the
   constraint. Push all heavy logic into the kernel (separate owner, no collision)
   so the viz only ever *renders* — never waits on logic it has to write itself.
6. **Honesty is the moat.** We never claim prediction. "Monte Carlo, not oracle"
   is both the truth and the thing that makes the demo un-attackable.

---

## 5. The plan — Gantt + critical path

`█ build · ▓ rehearse/verify · ▒ isolated · ░ QA/slack · ▲ fold-in cutoff`
```
                 2:30     2:50     3:10     3:30    3:40▲   3:50  →4:00 FREEZE
Orchestrator     █per-node█ █world-mutation + 2nd-beat precompute█ █submission+run-of-show█ ▓
Agent 1 (viz)    █dupSSE+seeds█ █per-node REASONING render████ █2nd-beat+pacing█ ▓rehearse
Agent 2 (world)  █Anthropic beat (cascade+switch)███ █Vercel deploy (replay)███ ░QA
Agent 3 (genesis)▒▒▒▒▒▒ Gemini Managed Agents — NL→world, decoupled, use-if-ready ▒▒▒▒▒▒
Agent 4 (anlys)  █credibility re-tune█ ░QA full arc + (stretch) Anthropic fan░  ▓rehearse
```

**Critical path:**
- *Hard* path to a recordable demo (already mostly done): `Agent 1 reliability →
  clean run-through → rehearse → freeze 4:00`.
- Two short upgrade-chains, each with the heavy half on the kernel (me) so the viz
  is never blocked: ① `per-node events → reasoning render`; ② `world-mutation +
  precompute → 2nd-beat register`.
- Off-path / parallel: Anthropic + Vercel deploy (Agent 2), credibility (Agent 4),
  Genesis (Agent 3, fully decoupled).
- **Bottleneck:** the viz (Agent 1). Mitigation: one meaty build for them
  (reasoning render) + small wiring; all logic pre-built in the kernel.

---

## 6. What each worker is driving toward (descriptors, not prompts)

- **Orchestrator** — *simulation depth that makes it a world model, not a viz:*
  per-node live-reasoning events; the world-mutation engine + the "same action,
  different world" precompute; the submission package (headline, run-of-show, repo)
  + a fast demo live mode.
- **Agent 1** — *the demo surface, mesmerizing + bulletproof:* live-reasoning
  render, reliability (one SSE per run, escape hatch), the 2nd-beat scenario,
  motion/pacing, and the rehearsal run-of-show.
- **Agent 2** — *generalization + reach:* the Anthropic beat (real cascade + world
  switch) and a shareable Vercel deployment of the replay.
- **Agent 3** — *the moonshot, isolated:* Genesis via Gemini Managed Agents — NL →
  research → Flash-generated world; decoupled, use-if-ready.
- **Agent 4** — *credibility + the wedge:* the fan credibility re-tune; the
  **variant A/B recommendation** (a `recommendation` derived from the existing sweep
  — "lead with 'independent'"); a QA pass of the full arc; (stretch) an Anthropic
  Monte-Carlo fan.

---

## 7. Explicitly not doing (so we don't drift)
- No full interactive "variant lab" UI (edit/sequence arbitrary variants live) —
  *but* the variant A/B framing + a recommended-variant callout **is in** (3f); only
  the heavyweight interactive lab is deferred to a future extension.
- No live world-state-chaining UI — the "different world" beat ships as a precompute,
  not an interactive chain.
- No bigger graph for its own sake — fidelity over node count; generalization
  (Anthropic, Genesis) beats a 1000-node Notion.

---

## 8. The bigger picture
The demo is a slice of the real thing: **the simulation layer of the AI-native
company.** If AI takes over orchestration and humans become the judgment layer,
any orchestrator has to ask "what happens if I take action X?" before taking it —
that's a world model. Robotics is solving it for physical action; nobody is solving
it for organizational, *textual* action. The extensions (decision-optimization /
variant lab, Genesis-on-demand, the durable Vercel-Workflow precompute) aren't side
quests — they're the product: **optimize the decision before you make it, for any
org, within your budget.** Today we ship the proof of concept; the pitch names the
rest.
