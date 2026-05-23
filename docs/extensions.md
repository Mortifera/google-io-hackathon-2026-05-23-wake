# Wake — extensions backlog

Ideas beyond the core demo. **Do none of these until the safe demo (CP4) is
locked.** Status: ✅ done · 🟦 planned for today's slack · 💡 future / if-way-ahead.

---

## 🟦 1. Live tick-by-tick streaming (today's Phase B)
The hero cascade runs **live on screen**, Gemini resolving each tick onto the
graph — not a replay. The strongest "it's really reasoning, not a script" proof.
- Kernel streams ticks as they resolve; viz renders per-tick; a streaming route
  (SSE / ReadableStream) carries them. Orchestrator (kernel) + Agent 1 (viz) +
  Agent 3 (route).
- **Escape hatch:** the precomputed identical cascade stays one click away.
- **Pacing caveat (real number):** a full-world cascade is ~16 sequential
  tick-waves and measured **~110s** at concurrency 6. Too long for a 90s slot, so:
  seed-limit the live cascade (fewer nodes), raise concurrency, or use snappy
  per-tick animation. Go/no-go at CP4.

## 💡 2. Vercel deployment (serverless, shareable)
The app is already Next.js 16 and the `/api/explain` route already proves live
server-side Gemini in production — so this is incremental, not from scratch.
Sequence (each step independently shippable):
1. **Precomputed replay — trivial, rock-solid.** Fixtures (Cascade +
   MonteCarloResult) are static; the viz reads/replays them. Near-zero serverless
   risk, instantly shareable. **Always ship this baseline.**
2. **Live single cascade — a streaming Function.** ~16 tick-waves / ~99 calls
   fits a Vercel Function (300s timeout, Fluid Compute = full Node.js). Add the
   SSE/ReadableStream route (the same "cascade-streaming" piece as Phase B).
3. **Precompute as a Vercel Workflow — the right tool.** The Monte Carlo is N long
   cascades of many LLM calls = a durable, step-based job. **Per-step retries +
   crash-safety directly fix the failure we hit** (a transient ECONNRESET killed
   the whole sweep and lost all completed runs). As durable steps, one bad call
   retries instead of nuking the batch. Optionally make each *tick* a step for
   live-cascade durability too.
4. **API-key override.** Ship our key as the default server env var; allow an
   optional per-request override (header/field, never logged, falls back to
   default). Optionally route via **Vercel AI Gateway** for provider fallback +
   observability.

**Caveats:** keep the **fan precomputed/static** — never let a judge clicking
"run" trigger 48 live cascades (cost + rate-limit blowup); judges run a *single*
live cascade, the thousand-futures fan stays a revealed artifact. Live reliability
still rides on Gemini rate limits (multi-user hits them harder than our single
local run → the precomputed escape hatch matters even more when deployed). Bundle
`worlds/*.json` into the function (already wired via aliases/transpilePackages).

## 💡 3. Live Wire — exogenous event injection
Mid-cascade, inject a real breaking headline (`POST /inject`) broadcast to Tier-1
inboxes on the next tick; the network visibly re-reasons. The best on-stage "holy
shit" + the strongest screenwriter-trap kill. Needs the streaming kernel (shares
Phase B plumbing) + an inject endpoint.

## 💡 4. Genesis Agent — natural-language → a whole simulation, self-assembled
**The full product vision.** A user types what they want to simulate in plain
language ("what happens if Stripe acquires Plaid?", "how does my org react to a
return-to-office mandate?") and a **Gemini Managed Agent on a remote Linux box**
builds the world:
1. **Research first** (Search/tools) — identify the entities that actually matter
   for an *accurate* sim: the named leaders, competitors, journalists, cohorts,
   platforms, regulators relevant to THIS scenario. The agent *decides* the cast.
2. **Generate** with **Gemini 3.5 Flash** — write the per-node dossiers, edges,
   and seed action(s) into a valid Wake-schema `world.json` (the exact pipeline
   Agents 2/L5 ran by hand for Notion/Anthropic).
3. **Hand back** the artifact → drag-drop into the UI → the graph rebuilds; run it.

**Budget-aware sizing (the sharp bit):** the user gives a **budget + ticks/steps**;
we **estimate cost** from our real numbers (≈ active-nodes-per-tick × ticks ×
~$0.002/call; a 207-node acquisition cascade was ~85 calls / $0.19, a 16-run fan
~$1) and **size the graph to maximize fidelity within budget** — more named Tier-1
nodes vs. archetype aggregates, more MC runs, more ticks, traded off automatically.

Turns the pitch from "a Notion simulator" into "**describe any decision in any
org and watch its consequence-space, on demand, within your budget**." Higher
effort (Managed Agents deploy + the cost model), but it's the category-defining
version. Lower priority than landing the core demo.

---

## 💡 5. Action-variant lab (decision optimization) — the killer product turn
Today Wake shows the consequence space of *one* action. Make the **trigger action
user-controllable** and runnable as live experiments across variants, so the
question shifts from "what happens?" to "**which way should I do it?**":
- **Variants of the same action:** reword the announcement 10 ways; joint
  announcement vs. solo; choose the channel; choose the framing dial.
- **Sequenced actions:** do community brand-work in the most-hostile cohorts
  *first*, *then* launch — and measure whether it de-risks the outrage.
- **Compare fans side by side** and surface **which variant** minimizes backlash /
  maximizes the target outcome → a recommended variant.
This turns Wake from "watch what happens" into "find the best way to do it" — a
decision-optimization tool, the strongest product direction. **Backend already
exists**: the Monte Carlo sweep engine (perturbation → fan); this exposes it as a
user-facing variant/sequence explorer with side-by-side fan comparison.

## 💡 6. Node & edge introspection (the reasoning, not just the trace)
Open any node → read its actual **system prompt / dossier** (what's driving it) +
its **per-tick rationale** ("why I did this"); open any edge → see its
**channel-transform prompt** and how it distorted a message. Today the inspector
shows the causal DAG trace; this shows the *reasoning behind* each decision.
Mostly near-term: per-event `rationale` is already captured by the kernel and
dossiers live in the world — largely a richer inspector panel (+ optionally a live
"explain this node's reasoning" Flash call).

## ✅ Already shipped (were on the wishlist)
- **Butterfly Trace** (interpretability causal chain) — the "ask why" money-shot:
  real `causedBy` DAG trace + cited ids + cinematic backward animation, with a
  live server-side Gemini explanation (`/api/explain`) and templated fallback.
- **Generalization / second world** — `worlds/anthropic` (57 nodes) exists; same
  engine, different world. (A real Anthropic *cascade* fixture would make the
  on-stage generalization beat live — small follow-up.)

## Recommended order (post-CP4, with remaining slack)
Phase B live streaming → Live Wire → Vercel deploy (precomputed first) → Genesis.
