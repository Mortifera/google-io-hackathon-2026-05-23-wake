# worlds/anthropic — the Anthropic world (generalization demo)

A second world, built with the same approach as `worlds/notion`, so the demo can
show Wake generalizing across companies (ARCHITECTURE.md: three high-quality
cascades against different worlds beat one giant graph). ~57 nodes; validates
against `WorldSchema`; loads via `@wake/kernel` `loadWorld()`.

Focal storylines (the seed menu): a public **Claude safety incident**, a
**mega funding round**, a **safety co-founder departing**, new **frontier-AI
regulation**, and a **major model launch**.

## Files

| File | What it is |
|------|------------|
| `world.json` | The deliverable. ~57-node tiered world. Generated; committed. |
| `build.ts` | Generator: nodes/edges/seeds, self-checks, writes `world.json`. |
| `dossiers.t1.ts` | Curated dossiers (Tier-1 + the 3 ideological-community clusters). |
| `dossiers.bulk.json` | Tier-2/3 dossiers from Gemini Flash; override layer. |
| `gen-dossiers.ts` | Calls `gemini-3.5-flash` to (re)generate `dossiers.bulk.json`. |
| `validate.ts` | Schema + integrity checks (CLI + shared by the test). |
| `world.test.ts` | Vitest: loads via `loadWorld()`, runs `checkWorld()`. |

## Regenerate / validate

```bash
pnpm exec tsx worlds/anthropic/build.ts        # rebuild world.json (offline)
pnpm exec tsx worlds/anthropic/validate.ts     # schema + integrity check
pnpm exec vitest run --config worlds/anthropic/vitest.config.ts
# optional, a couple of cents of live Flash — refresh the bulk dossiers:
pnpm exec tsx worlds/anthropic/gen-dossiers.ts && pnpm exec tsx worlds/anthropic/build.ts
```

`build.ts` works offline: without `dossiers.bulk.json` it uses the first-pass
drafts inlined in `build.ts`. Curated ids (in `dossiers.t1.ts`) are always used
verbatim and skipped by the Flash lane.

## Tiering

- **Tier 1 (~27):** Anthropic leadership (Dario/Daniela Amodei, Jared Kaplan,
  Tom Brown, Chris Olah, Jack Clark, Mike Krieger), Amazon/Google as investors,
  rival labs (OpenAI, Google DeepMind, xAI, Meta, Mistral, DeepSeek, Microsoft
  AI, SSI), and AI journalists/influencers — curated dossiers, current to
  May 2026.
- **Tier 2 (~18):** Anthropic research/policy/product archetypes (alignment,
  interpretability, frontier red-team, policy, employees, API/Claude Code/
  enterprise/consumer users), regulators (US AISI, EU AI Act, Congress),
  AI Twitter, Hacker News, the talent pool, and three curated ideological
  clusters (AI-safety/EA, e/acc, x-risk/pause).
- **Tier 3 (~12):** aggregates — subreddits, newsletter readers, follower
  masses, regional Claude user masses, enterprise verticals.

Dossiers are composites from public sources; specific figures are hedged
("reportedly"), uncertainty is marked, and no quotes are fabricated
(AGENTS.md §4). Edge vocabulary matches `worlds/notion`: load-bearing
(`llmMediated`) edges use only the canonical `EDGE_ARCHETYPES` plus the
mini.json-blessed keys; light edges may use any descriptive character.
