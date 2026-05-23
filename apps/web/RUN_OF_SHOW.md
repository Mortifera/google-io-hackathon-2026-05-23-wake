# Wake — demo run-of-show (~90s)

The on-stage arc for `@wake/web`: the beats, the operator's keys, the talking
points, and the safety nets. Default URL opens on the precomputed **acquisition**
cascade and autoplays.

## Pre-flight
- One browser tab on the demo URL; **one** dev/prod server (no stray ports).
- Operator console toggles with **O**. The **escape hatch** always returns to the
  canonical precomputed run — use it if anything looks wrong.
- Live mode needs the Gemini key in `apps/web/.env`; without it the stream/interp
  silently fall back to precomputed + the templated trace.

## The arc

**0:00 — Open (the film).** Page loads the 207-node Notion world; the acquisition
cascade autoplays. *"A world model of an organization. We inject one action —
Microsoft acquires Notion — and let 200+ minds react."* The wave propagates; nodes
recolour calm → alarmed → hostile → churning; the emergent leak fires (magenta
vignette); leak-pressure climbs.

**0:20 — Ask why (interpretability money-shot).** Click a churning node (a
power-user cohort / the leaker). The graph dims; the causal chain ignites backward
tick-by-tick. Beat 1 = instant DAG trace; Beat 2 (~1s) = live Gemini prose, badge
flips to **live · Gemini**. *"Every outcome is traceable to its cause — cited
events, not a black box."*

**0:35 — Dual layer (the leak).** Toggle **Private**. The backchannel appears —
private messages, the anonymous leak — and the leak-pressure meter. *"Public face
vs private interior; when they diverge far enough, it leaks."*

**0:50 — Live (the centerpiece: watch the minds think).** O → **Run live**. The
stream opens; each tick the active nodes pulse *thinking*, and the **Reasoning
Stream** fills with each node's one-line rationale as its Gemini call returns.
*"This is live — every mind reasoning, one by one, in real time."* Space aborts;
the escape hatch is one key away if it stalls.

**1:10 — Futures (the punchline).** **Futures** tab. The single run becomes 16,
fanning into outcome clusters; the **pivotal-variable** card names the fork.
*"Run it 16 times — the outcome forks on framing."*

**1:25 — Close.** Back to **Cascade**. *"One action, a world of consequences —
simulated, explained, and replayable."*

## Safety nets
- **Escape hatch** (operator console): jumps to the canonical precomputed run.
  Always works, even mid-live-stream.
- The **live stream auto-falls-back** to precomputed on error/stall (45s watchdog).
- All **5 scenarios are precomputed** (number keys 1–5), so any can be replayed
  instantly if a live run is risky on the venue network.

## Keys
`O` operator console · `space` play / pause (aborts a live run) · `←` / `→` step ·
`1`–`5` scenario · `Esc` deselect / close.

## Pacing notes
- Precomputed acquisition cascade: ~24s end-to-end at 1×. Use **2×** to compress,
  **0.5×** to linger on the leak beat.
- A full-world **live** run is ~110s; reserve it for the "watch the minds think"
  beat. For a tight slot, seed-limit the live run (decision pending at CP4).
- The cascade clock is act-paced (eased per tick), so the rhythm reads the same at
  any speed.
