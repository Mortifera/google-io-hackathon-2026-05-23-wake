# Orchestrator plan — to 4pm (live)

Updated ~12:25pm. Build start 10:40am · **Target finish (record video) 4:00pm** · Submit 5:00pm.
Visual: [`critical-path.html`](./critical-path.html).

## The one goal I'm running now (until the CP3 checkpoint)

> **Make the Monte-Carlo punchline real.** Tune node prompts (treat the seed as
> established fact), build the sweep engine (perturbation dimensions → divergent
> runs), precompute ~56 real cascades over the 207-node world, run them through
> Agent 4's `analyze()`, and publish a real `MonteCarloResult` + representative
> cascades to `fixtures/` — keeping `main` green throughout.
>
> **I stop when the real fan + pivotal variable exist as committed fixtures** —
> that's the CP3 checkpoint where we review the agents' work and fold it in.

## Status (what's done)

- **Orchestrator core** — kernel, nodes, edges, interp ✅ green, validated on real Flash.
- **CP2 ✅** — real cascade over the 207-node world: 16 ticks, 123 events, $0.22.
  Published as `fixtures/cascades/notion-world.acquisition.json`.
- **Agent 1** (viz) ✅ done · **Agent 2** (world, 207 nodes) ✅ · **Agent 3** (llm)
  ✅+hardened · **Agent 4** (analysis) ✅+hardened. All reviewed green.

## My task sequence

1. **Prompt tuning (~15m):** nodes treat the seed `action` from `world` as fact
   (CP2 drifted to "deny the rumor"); raise the leak threshold so leaks are punchy.
2. **Sweep engine (~45m):** `sweep()` over perturbation dims
   (`framing: independent|integrated`, `pressClimate`, `competitorSpeed`),
   each run tagged in `meta.perturbation`.
3. **Precompute (~40m, ~$10–15):** ~56 real cascades (capped ticks for cost) →
   `analyze()` → real fan + pivotal variable → publish to `fixtures/montecarlo/`.
4. **Escape-hatch:** lock the real cascade + MC as demo-safe committed artifacts.
5. Then support **CP3**, and build **Live Wire** only if rock-solid by ~3:15.

## Agent assignments

- **Agent 1** (viz): CP1 (re-point at the real world cascade) → operator console +
  5-action menu → **CP3** (fan + dual-layer + interp causal-trace animation) → CP4.
- **Agent 2** (world): Suleyman one-field fix → sharpen the 5 seed payloads / help
  Agent 3 → QA the live app once CP1 lands.
- **Agent 3** (llm): second world `worlds/anthropic/` (generalization flex) **+
  integration firefighter** (drop it to help if CP3/CP4 snags).
- **Agent 4** (analysis): demo-grade cluster labels + pivotal sentence on realistic
  data + micro-tests → at CP3 run `analyze()` on my precompute → hand MC to Agent 1.

## Timeline

| Time | Orchestrator | Agent 1 | Agent 2 | Agent 3 | Agent 4 |
|------|-------------|---------|---------|---------|---------|
| 12:20–1:00 | tune → sweep engine | CP1 → operator console | Suleyman → seeds | 2nd world | label/pivotal polish |
| 1:00–1:45 | precompute ~56 ($10-15) | operator + action menu | 2nd world help | 2nd world | analyze prep |
| 1:45–2:30 | publish MC + escape-hatch | CP3: fan + dual-layer + trace | QA live app | firefight / 2nd world | CP3 analyze → hand MC |
| 2:30–3:15 | support CP3 → CP4 integrate | CP3 → CP4 | QA / polish | firefight | verify fan |
| 3:15–3:45 | Live Wire (if solid) | rehearsal | rehearsal QA | standby | standby |
| 3:45–4:00 | rehearse ×N | drive operator | — | — | — |
| **4:00** | 🎥 record | | | | |

## Checkpoints

- **CP1** — viz shows the real full-world cascade (Agent 1, ~1 line). *Ready now.*
- **CP3** — fan + pivotal + interp panel wired (Orchestrator precompute + Agent 4
  analyze + Agent 1 viz). **The review/fold-in checkpoint.**
- **CP4** — integrate + rehearse → record.

## Extensions (only if comfortably ahead)
Butterfly Trace ≈ already built (polish the visual at CP3). **Live Wire**
(exogenous injection) = best stretch / screenwriter-trap kill. Genesis Agent =
very-end TAM flex.
