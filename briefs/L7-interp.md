# L7 — Interpretability

**Folder:** `packages/interp` &middot; **Depends on:** `@wake/contracts`, an
`LLMClient` &middot; **Build against:** the fixture cascade (no kernel dependency).

## Mission
Implement `explain: Explain` (the stub in `src/index.ts`):
`(cascade, question, llm) → Explanation`. Answer any "why did X happen" by tracing
the event DAG and narrating the cause with cited event ids.

## What to build
- **DAG trace-back:** from the question, find the relevant node/event(s) in
  `cascade.eventDag`, then walk `causedBy` chains backwards to assemble the
  upstream story. (The cascade already carries full provenance — you consume it,
  you don't rebuild it.)
- **Narrative call:** one Flash call that turns the traced chain into a
  paragraph-long, specific explanation citing the upstream events by id. Populate
  `Explanation.{answer, citedEventIds}`; every cited id must exist in the DAG.
- Keep it grounded — cite real events, don't invent.

## Pre-approved
Everything in your folder; build and test entirely against
`fixtures/cascades/notion-acquisition.json` (it has a rich DAG: e1→e2→e5→e8→e9,
and the leak e6→e10).

## Needs coordination
CP3 wires the panel into the viz (L8 calls `explain`). Coordinate the request/
response shape with L8 there.

## Done-when
A "why" question on the fixture (e.g. "why did productivity Twitter turn hostile?")
returns a grounded paragraph with valid `citedEventIds`; test green; pushed.
