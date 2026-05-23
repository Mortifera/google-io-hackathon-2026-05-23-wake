# L3 — Per-node behavior

**Folder:** `packages/nodes` &middot; **Depends on:** `@wake/contracts`, an
`LLMClient` (use the mock) &middot; **Build against:** `MockLLMClient` + the mini
world dossiers.

## Mission
Implement `tickFn: TickFn` (the stub in `src/index.ts`):
`(TickInput, LLMClient) → TickOutput`. This is the heart of the simulator — the
prompt that turns `(node.dossier, state, inbox, clock)` into a `stateDelta`, typed
`outgoing` events, and a one-sentence `rationale`.

## What to build
- **Prompt assembly:** system prompt = the node's `dossier` + the output schema
  (cacheable, pass `cacheKey`); user prompt = current `state` + `inbox` + `clock`.
- **Structured output:** request a `TickOutput`-shaped JSON; validate with
  `TickOutputSchema`; outgoing events must be typed and have explicit targets.
- **Behaviour that responds to action *content*, not just "an event happened"** —
  this is the #1 failure mode. The cautious manager parks a vague idea but
  escalates one that matches a live priority; a journalist amplifies a juicy
  framing but ignores a dull one.
- **Tier-aware depth:** Tier 1 nodes reason richly; Tier 2/3 can be lighter.
- **Public vs private:** set `publicFace` and `privateInterior` separately so the
  dual layer and leaks work.

## The eval (your real success criterion)
Seed the graph with the *pre-state* of a known historical Notion event and run
forward; check the simulated cascade qualitatively resembles what really happened.
Build a small eval harness in `packages/nodes` (against the mock first, then a few
real calls). "Resemblance to history," not exact match.

## Pre-approved
Everything in your folder; iterate on prompts; run evals against the mock.

## Needs coordination
CP2 (switch to live Gemini + the full Notion world) is coordinated. Picking the
specific historical eval event is a shared decision (see the open question in
`VISION.md`).

## Done-when
A known event's cascade reads as plausible; `TickOutput` always validates; a test
+ eval harness exist; pushed.
