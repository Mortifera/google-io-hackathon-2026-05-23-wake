# L8 — Visualization

**Folder:** `apps/web` (Next.js 16 + React 19) &middot; **Depends on:**
`@wake/contracts` &middot; **Build against:** the fixtures — already wired.

> ⚠️ Read `apps/web/AGENTS.md`: this is Next.js 16, which has breaking changes
> from older versions. Check `node_modules/next/dist/docs/` before writing code.

## Mission
The visualization is half the demo. Build the graph view, cascade animation,
dual-layer toggle, Monte Carlo fan, and interpretability panel. It must read like
a film of a real system, not programmer art — spend disproportionate time on
colour, motion, easing, and pacing.

## Starting point (already done)
`app/page.tsx` renders the fixture `Cascade` + `MonteCarloResult` via the
`@fixtures/*` path aliases. `pnpm --filter @wake/web dev` runs it;
`pnpm --filter @wake/web build` passes. Everything you need is in those two JSON
shapes — **zero dependency on the kernel.**

## What to build
- **Force-directed graph:** named Tier 1 nodes labeled, archetypes as small dots;
  colour by state (calm/attentive/excited/alarmed/hostile/churning); faint edges.
  (Pick a lib — sigma.js or cytoscape.js; Three.js only if you can make it land.
  Add it to `apps/web` deps yourself.)
- **Cascade animation + scrub:** play `cascade.ticks` over time — edges light up
  on traversal, receiving nodes pulse, acting nodes burst. A bottom clock/timeline
  scrubbable backward/forward (drive everything off `stateTimeline`).
- **Dual layer (public/private):** a toggle between `publicFace` and
  `privateInterior`; show the rising `divergence` count; surface emergent leaks.
- **Monte Carlo fan:** pull back so the single trajectory becomes one strand in a
  sheaf coloured by `clusters`; show the pivotal-variable card (`mc.pivotal`).
- **Interpretability panel:** click a node/event → ask why → render the
  `Explanation` (calls L7's `explain`; until wired, stub the response).

## Pre-approved
Everything in `apps/web`; add front-end deps; run dev/build; QA your own work
(there's a `gstack`/`browse` skill for headless screenshots).

## Needs coordination
CP1 swaps the fixture for the kernel's real cascade JSON. CP3 wires the live
`explain` call. Both are coordinated hand-offs.

## Done-when
Renders the fixture cascade with motion and the fan view; reads as a real system;
`build` passes; pushed.
