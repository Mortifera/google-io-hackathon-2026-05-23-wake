# L1 — Simulation kernel

**Folder:** `packages/kernel` &middot; **Depends on:** `@wake/contracts`,
`@wake/util` &middot; **Build against:** `MockLLMClient` + `worlds/notion/mini.json`.

## Mission
Implement `runCascade(world, seedActionId, deps, opts) → Cascade` (the stub in
`src/index.ts`). The kernel is the engine everything else depends on, so it must
be solid and **import only `@wake/contracts` and `@wake/util`** — node and edge
behaviour arrive via `deps` (dependency injection).

## What to build
- **Tick loop** with **variable time-stepping**: short ticks when activity is
  high, jump the clock to the next scheduled event when things quiet down.
- **Inbox routing:** an event emitted toward a target lands in that target's
  inbox; the target acts on its next tick if its `activationThreshold` is met.
- **Activation & saturation:** only nodes whose incoming signal clears their
  threshold act; deplete `attentionBudget`; ignore already-heard events. This is
  what makes the cascade a wave that dies out (aim 8–12 ticks of real activity).
- **Parallel execution:** fan out active-node tick calls with `mapWithConcurrency`
  (`opts.concurrency`).
- **Edge traversal:** when an event crosses an edge, run `deps.edgeTransform`; a
  `null` result kills the event on that edge.
- **Provenance:** every emitted event gets a fresh id and `causedBy` set to the
  triggering event → builds `eventDag`. Record `stateTimeline` snapshots and the
  public/private `divergence` count per tick.
- **Determinism:** seed the run from `opts.seed` (use `@wake/util` `makeRng`); the
  same seed must reproduce the same cascade (given a deterministic LLM). Monte
  Carlo passes `base+i` per branch.
- **Emergent events:** when divergence crosses a threshold, optionally emit a
  leak (`type: "emergent"`).

## Produces
A `Cascade` (validate it with `CascadeSchema` in a test).

## Pre-approved
Everything in your folder; run with the mock; add a `tsx` script
(`packages/kernel/src/run.ts`) to dump a cascade JSON for the viz.

## Needs coordination
Don't import `@wake/nodes`/`@wake/edges` directly (keep injection). CP1 is the
hand-off where the viz consumes your real cascade — coordinate the JSON shape there.

## Done-when
Mini world + MockLLM (with a simple responder) → a `CascadeSchema`-valid cascade
of ~5–12 ticks; deterministic under a fixed seed; test green; pushed.
