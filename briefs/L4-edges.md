# L4 — Per-edge behavior

**Folder:** `packages/edges` &middot; **Depends on:** `@wake/contracts`, an
`LLMClient` (mock) &middot; **Build against:** `MockLLMClient`.

## Mission
Implement `edgeTransform: EdgeTransform` (the stub in `src/index.ts`):
`(event, source, target, edge, llm) → Event | null`. Edges are what make a
journalist's coverage feel different from a tweet, and a complaint reach a friend
differently than it reaches customer success.

## What to build
- **Light edges (`edge.llmMediated === false`):** cheap deterministic transforms
  driven by `edge.character` and `edge.weight` — amplify/attenuate reach, add a
  delay, or drop below a weight threshold. No LLM call. (The stub already passes
  these through; replace with real rules.)
- **Load-bearing edges (`llmMediated === true`):** one Flash call that filters /
  distorts / amplifies / reframes the event for the target, or returns `null` to
  kill it. Implement the ~6 archetypes in `EDGE_ARCHETYPES`:
  `journalist->audience`, `employee->manager`, `customer->cohort`,
  `competitor->strategy`, `platform-amplification`, `friend->friend`.
- Each archetype is a distinct prompt template keyed by `edge.character`. The
  output is a transformed `Event` (validate with `EventSchema`); preserve
  `causedBy` provenance (the kernel sets ids, but keep the chain intact).

## Pre-approved
Everything in your folder; iterate on the archetype prompts against the mock.

## Needs coordination
CP2 (live Gemini) is coordinated. If the mini world uses an edge `character` not
in your set, coordinate with L5 (world data) on the vocabulary.

## Done-when
The same input event visibly differs across at least the 6 archetypes; light
edges apply deterministic rules; outputs validate; test + pushed.
