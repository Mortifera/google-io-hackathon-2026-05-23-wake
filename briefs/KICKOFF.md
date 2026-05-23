# Parallel agent kickoff prompts

Copy one block into a fresh Claude Code instance opened in the repo root. Each is
self-contained. The "core" agent (kernel + nodes + edges) is run separately and
produces the real `Cascade` that everyone integrates against at the checkpoints.

Common preamble (already encoded in each prompt): read `AGENTS.md`, `PLAN.md`, and
your brief; stay in your folder; build against fixtures/mock; you may spend up to
~$20 on live Gemini; commit + push to `main` continuously; do not touch
`packages/contracts` or other folders.

---

## L8 — Visualization (`apps/web`) — highest demo value

```
You are the L8 (Visualization) worker on Wake, a TypeScript pnpm monorepo (the visualization is half the demo). Before writing code, read these files in full: AGENTS.md, PLAN.md, briefs/L8-viz.md, and apps/web/AGENTS.md (this is Next.js 16 — it has breaking changes; check node_modules/next/dist/docs/ as needed). Your folder is apps/web. Build the force-directed graph, cascade animation + scrub timeline, public/private dual-layer toggle, the Monte Carlo fan + pivotal-variable card, and the interpretability panel — all driven entirely by the JSON in fixtures/ (zero kernel dependency; app/page.tsx already renders them). Make it look like a film of a real system: spend disproportionate time on colour, motion, easing, pacing. You are pre-approved to: work autonomously in apps/web, add front-end deps (pick sigma.js or cytoscape.js for the graph), run `pnpm --filter @wake/web dev` / `build`, QA with screenshots, spend up to ~$20 on live Gemini, and commit+push to main continuously (always `git pull --rebase` before pushing; if pnpm-lock.yaml conflicts, take either side then re-run `pnpm install`). Do NOT edit packages/contracts, fixtures/, or other workers' folders. Stop and surface at the CP1 (swap fixture for real cascade) and CP3 (wire live interp) checkpoints. Start now: `pnpm install`, then `pnpm --filter @wake/web dev`.
```

## L5 — World data / Notion graph (`worlds/notion`) — needed for a real demo

```
You are the L5 (World data) worker on Wake, a TypeScript pnpm monorepo. Read in full: AGENTS.md, PLAN.md, briefs/L5-world.md, ARCHITECTURE.md (use its "Node enumeration" as your checklist), and worlds/notion/mini.json (the 8-node toy — study its shape; do NOT edit it, it's a shared fixture). Your job: produce worlds/notion/world.json — the real ~200-node Notion world — that validates against WorldSchema in @wake/contracts and loads via loadWorld() from @wake/kernel. Tiered: ~30-50 Tier-1 named nodes (leadership, major journalists, competitors, influencers) with rich ~200-token dossiers curated hardest; ~60-100 Tier-2 archetypes (customer cohorts by use-case, employee archetypes, communities); the rest Tier-3 aggregates. Add edges with character keys from EDGE_ARCHETYPES and llmMediated set, plus the 5 curated seed actions. Dossiers are composites from public sources — never fabricate quotes; mark uncertainty. You're pre-approved to: work autonomously in worlds/notion, scrape/research public sources (WebFetch/WebSearch), spend up to ~$20 on live Gemini (e.g. to help summarize dossiers), and commit+push to main continuously (`git pull --rebase` before push; regenerate pnpm-lock.yaml on conflict). Do NOT edit packages/contracts, mini.json, or other folders. Write a small test that loads world.json and parses it with WorldSchema. Done when world.json validates and the Tier-1 nodes read as recognizably true. Start now: `pnpm install`, then study mini.json and WorldSchema.
```

## L2 — LLM client / Gemini Flash (`packages/llm`, file `src/gemini.ts`)

```
You are the L2 (LLM client) worker on Wake, a TypeScript pnpm monorepo. Read in full: AGENTS.md, PLAN.md, briefs/L2-llm.md, GEMINI_RATE_LIMITS.md, and packages/llm/src/{gemini.ts,mock.ts}, plus packages/contracts/src/llm.ts. Your job: implement GeminiLLMClient in packages/llm/src/gemini.ts so it satisfies the LLMClient contract — call Gemini 3.5 Flash (key in .env as GEMINI_API_KEY; add @google/genai as a dep), request structured output from args.schema (it's a zod schema — convert to JSON schema; add zod-to-json-schema), validate the response and retry on invalid JSON, cache the system prompt keyed by args.cacheKey and report usage.cached, retry with backoff on 429/5xx, and fill usage.{inTokens,outTokens,cached,costUsd}. Only edit src/gemini.ts (and package.json deps) — the mock in src/mock.ts belongs to the contracts owner; leave it the default. You're pre-approved to: work in packages/llm, add deps, spend up to ~$20 on live Gemini smoke tests, and commit+push to main continuously (rebase before push; regenerate lockfile on conflict). Never log full API keys; never commit .env. Do NOT edit packages/contracts or other folders. Write a smoke-test script and a mock-based test. Done when GeminiLLMClient returns schema-valid structured output for a sample prompt and both clients satisfy LLMClient. Start now: `pnpm install`, copy .env.example to .env if needed (the real .env already has the key), read src/llm.ts.
```

## L6 — Monte Carlo analysis (`packages/analysis`) — the punchline

```
You are the L6 (Analysis) worker on Wake, a TypeScript pnpm monorepo. Read in full: AGENTS.md, PLAN.md, briefs/L6-analysis.md, packages/analysis/src/index.ts, and packages/contracts/src/{cascade.ts,montecarlo.ts}. Implement analyze(cascades, {worldId, seedActionId}) -> MonteCarloResult: fingerprint each cascade.finalState into a numeric outcome vector; hierarchically cluster the vectors (hand-rolled, small N, no scipy) into 3-4 OutcomeClusters with human labels + a representativeRunId per cluster; compute the pivotal variable (the perturbation dimension from cascade.meta.perturbation whose variation best explains cluster membership) with a real explainedVariance and a plain-English description. Build entirely against the fixtures: generate synthetic cascade sets by perturbing fixtures/cascades/notion-acquisition.json (vary finalState sentiments) to fake clusters — zero kernel dependency. You're pre-approved to: work in packages/analysis, add deps, and commit+push to main continuously (rebase before push; regenerate lockfile on conflict). Do NOT edit packages/contracts, fixtures/, or other folders. Write a test that validates output with MonteCarloResultSchema. Done when analyze() produces sensible clusters + a pivotal variable from a set of cascades. Start now: `pnpm install`, then read montecarlo.ts and the fixture.
```

## L7 — Interpretability (`packages/interp`)

```
You are the L7 (Interpretability) worker on Wake, a TypeScript pnpm monorepo. Read in full: AGENTS.md, PLAN.md, briefs/L7-interp.md, packages/interp/src/index.ts, packages/contracts/src/{interp.ts,cascade.ts,event.ts}, and fixtures/cascades/notion-acquisition.json (it has a rich DAG: e1->e2->e5->e8->e9, plus the leak e6->e10). Implement explain(cascade, question, llm) -> Explanation: trace backwards through cascade.eventDag via causedBy chains from the events relevant to the question, then make ONE Flash call that narrates the cause in a grounded paragraph citing upstream event ids (every citedEventId must exist in the DAG). Build and test entirely against the fixture cascade (zero kernel dependency); use MockLLMClient with a responder, and you may use up to ~$20 of live Gemini to validate quality. You're pre-approved to: work in packages/interp, add deps, and commit+push to main continuously (rebase before push; regenerate lockfile on conflict). Do NOT edit packages/contracts, fixtures/, or other folders. Write a test for a sample question (e.g. "why did productivity Twitter turn hostile?"). Done when it returns a grounded paragraph with valid citedEventIds. Start now: `pnpm install`, then read the fixture and interp.ts.
```

## L4 — Per-edge behavior (`packages/edges`) — only if NOT taken by the core agent

```
You are the L4 (Per-edge behavior) worker on Wake, a TypeScript pnpm monorepo. Read in full: AGENTS.md, PLAN.md, briefs/L4-edges.md, packages/edges/src/index.ts, and packages/contracts/src/{edge.ts,event.ts,world.ts}. Implement edgeTransform(event, source, target, edge, llm) -> Event | null: for light edges (edge.llmMediated === false) apply cheap deterministic rules driven by edge.character and edge.weight (amplify/attenuate/delay/drop); for load-bearing edges run one Flash call per the 6 archetypes in EDGE_ARCHETYPES (journalist->audience, employee->manager, customer->cohort, competitor->strategy, platform-amplification, friend->friend), each a distinct prompt that filters/distorts/amplifies/reframes the event for the target or returns null to kill it. Validate outputs with EventSchema; preserve causedBy. Build against MockLLMClient (with a responder); up to ~$20 live Gemini for quality checks. You're pre-approved to: work in packages/edges, add deps, commit+push to main continuously (rebase before push; regenerate lockfile on conflict). Do NOT edit packages/contracts or other folders. Write a test showing one input event differs across the 6 archetypes. Start now: `pnpm install`, then read edge.ts.
```
