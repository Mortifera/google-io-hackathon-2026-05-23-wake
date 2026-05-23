# L5 — World data (Notion)

**Folder:** `worlds/notion` &middot; **Depends on:** the `World` schema in
`@wake/contracts` only — this is mostly independent data work. **Build against:**
nothing; you produce JSON.

## Mission
Produce `worlds/notion/world.json` — the real ~200-node Notion world — that
validates against `WorldSchema` and loads via `loadWorld()` (in `@wake/kernel`).
`worlds/notion/mini.json` (8 nodes) already exists as the toy; you build the full one.

## What to build
- **Tiered nodes (~200 total):** ~30–50 Tier 1 (named leadership, major
  journalists, major competitors, major influencers) with full ~200-token
  dossiers; ~60–100 Tier 2 (customer cohorts by use-case, employee archetypes,
  community clusters) with shared archetype dossiers; the rest Tier 3 aggregates.
  Use `ARCHITECTURE.md` → "Node enumeration" as the checklist.
- **Dossiers** = voice, recent public positions, known relationships, decision
  patterns, biases. Composites from public sources (blog, leadership
  Twitter/LinkedIn, Glassdoor tone, G2/Capterra, press). **Curate the Tier 1
  named nodes hardest** — the audience judges quality there.
- **Edges** with direction, weight, `character` (use L4's `EDGE_ARCHETYPES`
  vocabulary), and `llmMediated` set (load-bearing = true).
- **Seed actions** = the curated on-stage action menu (acquisition, free tier, CEO
  steps down, open-source, engineer-DMs-manager).

## Pre-approved
Everything in `worlds/notion`; scraping/structuring; writing the JSON.

## Needs coordination
- Don't edit `mini.json` casually — other workers build against it (it's a shared
  fixture). Add the full world as a new file.
- Coordinate the edge `character` vocabulary with L4.

## Done-when
`world.json` validates against `WorldSchema`, loads in the kernel, and the Tier 1
nodes read as recognizably true. Pushed.

## Gotchas
- Don't impersonate or fabricate quotes; dossiers are composites, mark uncertainty.
- ~200 careful nodes beat ~1000 hasty ones.
