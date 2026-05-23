# L9 — Integration / operator / precompute

**Folder:** `tools/` + the wiring across packages &middot; **Depends on:**
everything &middot; **This is the convergence worker** — it runs at the checkpoints.

## Mission
Wire the real system together and make the demo bulletproof. You operate the
integration checkpoints (CP1–CP4) with L0.

## What to build
- **The bridge:** glue kernel + nodes (tickFn) + edges (edgeTransform) + llm +
  world into a single `runCascade` call. A Next API route in `apps/web` (e.g.
  `app/api/cascade/route.ts`) that the operator console hits to run/stream a
  cascade is the natural seam to the viz.
- **Action-menu curation:** finalize the 5 on-stage seed actions and make them
  one-click in an **operator console** (the speaker's teammate drives it).
- **Monte Carlo precompute:** a `tools/precompute.ts` script that runs N branches
  and writes `MonteCarloResult` + the representative cascades to disk for the fan
  view. **This spends real money — coordinated/budgeted, not solo** (see
  `AGENTS.md` §3, `PLAN.md` budget).
- **Escape hatch:** a "play canned cascade" path identical to live, one click
  away, in case the live API fails on stage. Record real runs to `fixtures/` for this.
- **Rehearsal:** run the 3-minute arc end-to-end ≥5 times; fix every break; time
  the narration to the cascade pacing.

## Pre-approved
Wiring in `tools/` and `apps/web/app/api`; running everything against the **mock**;
dry-running the demo with canned data.

## Needs coordination
- The checkpoints themselves (CP1–CP4) and any **live** Monte Carlo precompute
  (cost) — coordinate with L0 and the human.
- Touching another worker's package to integrate → ask them or pair, don't rewrite.

## Done-when
The full demo runs end-to-end twice, the escape hatch is indistinguishable from
live, and the operator console drives the curated menu. Pushed.
