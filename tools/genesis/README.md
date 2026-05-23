# Genesis — natural language → a runnable Wake world

> Type a scenario in plain English; get a validated `world.json` the existing Wake
> kernel can run.

```bash
pnpm exec tsx tools/genesis/genesis.ts "What happens if Stripe acquires Plaid?" \
  --budget 1 --ticks 12
```

Genesis turns a one-line scenario into a full Wake `World` — researched cast,
per-node dossiers, wired edges, and seed actions — then **proves it** by loading
the result through `@wake/kernel` and running a cascade. It's the "author a new
world without hand-writing it" capability: the same thing Agent 2 did by hand for
`worlds/notion` and `worlds/anthropic`, automated.

## The flow (matches the design mock)

1. **Researching the cast** — a Google-Search-grounded Gemini call finds the real
   leaders, competitors, journalists, cohorts, platforms, and regulators.
2. **Deciding which entities matter** — a structured call turns that research into
   a typed cast (kebab ids, sides, affiliations).
3. **Sizing the graph to budget** — the budget → cost → size loop: a `$` budget and
   tick count pick how many named Tier-1 nodes vs. archetype cohorts vs. aggregates
   to maximize fidelity within spend.
4. **Generating dossiers · Gemini 3.5 Flash** — batched; Tier-1 from public facts
   (uncertainty marked, no invented quotes), Tier-2/3 as composite archetypes.
5. **Writing edges & channels** — deterministic wiring (code, not the LLM, so the
   graph is always valid) using `worlds/notion`'s character vocabulary.
6. **Assembling world.json** — `WorldSchema.parse` + `loadWorld()` + a real cascade.

## Why the LLM picks the cast but code wires the graph

Asking an LLM for graph structure invites dangling edges and unreachable nodes.
So Genesis splits responsibility: **the model chooses the cast** (the hard,
knowledge-heavy part), and **deterministic code wires the edges** with invariants
enforced — unique ids, no self-loops, every edge resolves, every non-root node has
an inbound path (a reachability pass repairs any orphan). The output is guaranteed
to parse and run; only the prose quality depends on the model.

Load-bearing (`llmMediated`) edges use only the canonical archetypes L4's
`edgeTransform` understands (`journalist->audience`, `competitor->strategy`,
`internal-leadership`, `company->journalist`, …); light edges may use any
descriptive character.

## Budget model (`budget.ts`)

A frontier-Flash call is ≈ **$0.002**. A cascade activates ~half the graph
(attention saturates), so one run ≈ `entities × $0.001` — a ~200-node run ≈ $0.19,
a small 16-run Monte-Carlo fan ≈ ~$1. `planSizing(budget, ticks)` grows the entity
count until generation + one validating run fits the budget, then allocates across
the cast categories. Generation itself (research + dossiers + seeds) is ~8–15
cheap calls; the **validating cascade runs offline** (MockLLM), so a `genesis`
build costs only the generation calls (~$0.05).

## Files

| file | role |
|---|---|
| `genesis.ts` | CLI orchestrator + write + validate |
| `pipeline.ts` | `buildWorld(scenario, opts, llm, onStep)` — pure, injectable |
| `llm.ts` | grounded research + structured generation (REST Gemini), injectable |
| `cast.ts` | research → typed, normalized cast |
| `budget.ts` | budget → cost → graph-size |
| `wire.ts` | cast → `World` (deterministic edges + reachability repair) |
| `dossiers.ts` | batched Flash dossiers |
| `validateRun.ts` | `WorldSchema.parse` + offline cascade through the kernel |
| `genesis.test.ts` | offline pipeline test (fake LLM, zero network) |

Output worlds are written to `tools/genesis/out/<worldId>.json`.

## Isolation

Self-contained, like `worlds/`: not a workspace package; imports `@wake/*` by
relative path; run with `tsx`/`vitest`. Touches nothing in `apps/web` or the
existing packages.

## Stretch — toward Gemini Managed Agents

The pipeline is already structured for a **remote runner**: `buildWorld` takes an
injected `GenesisLLM` and emits `onStep` progress events. A managed-agent version
would run the research + generation on a remote Linux runner (Gemini with tools),
streaming the same `onStep` steps back to the operator console — the UI in the
design mock (NL prompt + budget slider + estimated-cost readout + build-progress
panel + cast summary). The local CLI here is the working core; the remote runner
and the web UI are the next layers. **A working NL → valid, runnable `world.json`
is the win; the rest is upside.**
