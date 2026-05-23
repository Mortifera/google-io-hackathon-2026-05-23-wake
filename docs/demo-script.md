# Wake — demo script (recording-ready)

The narration matches **what's actually built and on `main`**. Numbers are real
(no placeholders). Two cuts below: a **≤60s submission cut** (primary — the rules
cap the video at ~1 min) and a **fuller ~2-min live run-of-show** (for an in-person
demo / Q&A). Operator = drives the UI; Speaker = voiceover.

**Escape hatch (always):** every scenario has a **Replay** mode (precomputed,
identical) one click from **Live**. If the live API stalls mid-record, switch to
Replay — the cascade is byte-identical. Record with Replay if you want zero risk;
record Live for the "it's really thinking" energy. Recommend: **Live for the cascade,
with a Replay take in the can as backup.**

---

## A. The ≤60-second submission cut (primary)

**0:00–0:08 — What it is**
- Operator: Notion world graph up; named entities legible (Ivan Zhao, Casey Newton,
  Linear, Sequoia, productivity Twitter).
- Speaker: *"This is Wake — a world model for organizational action. Two hundred real
  people and platforms, and **every node is its own Gemini 3.5 Flash reasoner**."*

**0:08–0:16 — The action**
- Operator: open the action menu (**O**) → **"Notion is acquired by Microsoft"** →
  **Run Live**. The seed lands; the clock starts.
- Speaker: *"We drop in one action — and let go."*

**0:16–0:38 — The centerpiece: watch it think (LIVE)**
- The graph pulses node-by-node; the **Reasoning Stream** fills in real time — each
  node's one-line rationale appears the instant its Gemini call returns. Colors flip
  toward hostile; a private grievance **leaks** to a platform node.
- Speaker: *"This isn't a progress bar — it's two hundred minds reasoning, live. You
  can read **who's** thinking and **why**, one rationale at a time… and that — that's
  a **leak**: a node's private interior diverged too far from its public face and
  surfaced."*

**0:38–0:48 — Why? (interpretability)**
- Operator: click a hostile cohort → **Ask why**. The graph dims to a glowing causal
  line back to the seed.
- Speaker: *"It's not a black box. Every outcome traces back to your action — cited,
  event by event."*

**0:48–0:58 — The fan + the pivotal (honest)**
- Operator: open the **Futures** view — the run becomes 32 strands collapsing into
  outcome regimes; the **pivotal card** lands.
- Speaker: *"Then we ran it thirty-two times with the world perturbed. The futures
  settle into two regimes — **consumer backlash** in three of four runs, **competitors
  capitalizing** in the rest — and the single dial that most decides which one you land
  in is the **acquisition messaging framing**: it accounts for **58%** of the spread."*

**0:58–1:00 — Close**
- Speaker: *"We didn't build an oracle. We made the consequence space legible — so you
  can watch your decision before you make it. Flash is what makes it cheap enough to
  run."*

---

## B. The fuller ~2-min live run-of-show (in-person / extended cut)

Everything in A, expanded, plus the two beats that separate "cool simulator" from
"world model":

**+ Dual layer (after the cascade, ~15s)**
- Operator: toggle **Public / Private**. The interiors and the divergence meter show;
  point at the node that leaked.
- Speaker: *"Each node has a public face and a private interior. When they diverge too
  far, the grievance leaks — we don't script that, it emerges."*

**+ Two worlds — "same action, different world" (~20s) — the world-model beat**
- Operator: open the **Two worlds** scenario. The *same* engineer's-idea action runs
  in two worlds side-by-side; both light the same chain (Maya → AI features team →
  Engineering Manager → VP of AI). It pins the **Engineering Manager** and shows his
  private reasoning in each:
  - **Independent Notion:** *"the VP's confirmation is the perfect shield… safely
    locked away"* → he **buries** it.
  - **Notion-as-Microsoft-subsidiary:** *"a force multiplier for Microsoft's platform…
    I get all the credit"* → he **weaponizes** it.
- Speaker: *"Same action. Same manager. Opposite intent — because the **world** changed.
  That's the difference between a simulator and a world model."*

**+ Generalization — Anthropic (~10s) [cuttable]**
- Operator: a second world (Anthropic safety-incident cascade) — same engine.
- Speaker: *"None of this is bespoke to Notion. Point it at any organization."*

**+ Genesis — the closer (~25s) [cuttable; see `tools/genesis/DEMO.md`]**
- Operator (terminal): `pnpm exec tsx tools/genesis/genesis.ts "What happens if Stripe
  acquires Plaid?" --budget 0.1 --ticks 8` — watch the build steps stream (research the
  real cast → size to budget → dossiers → wire edges → world.json). (If it's slow on
  camera, cut to the committed `examples/stripe-plaid.json`.)
- Speaker: *"And the world doesn't have to be hand-built. One sentence, about two
  cents, and Gemini researches the real cast and generates a runnable world. **Same
  engine, any world, one sentence.**"*

---

## Operator cheat-sheet
- **O** — operator console / action menu. **1–5** — switch scenarios.
- Each scenario has **Run Live** (SSE, Gemini) and **Replay** (precomputed).
- **Public / Private** toggle for the dual layer. **Ask why** on any node/event.
- **Futures** view for the fan + pivotal card. **Two worlds** for beat #2.

## Honest-framing guardrails (say it this way)
- "The sweep **settles** into…", "the pivotal variable **points to**…" — never "Wake
  **recommends**" or "you should." It's an instrument, not an advisor.
- Both fan regimes are negative outcomes — don't imply a clean "good" path exists. The
  honest read is "this is risky in most futures; the lever you control is the framing."
  (If Agent 4's re-validation confirms a direction, you may add "independent framing
  shifts more runs out of the worst regime" — only if the data supports it.)

## How to read the Futures fan (Agent 4's explainer — for narration / Q&A)
The fan shows 32 independent runs of the same acquisition event settling into two
outcome regimes — **Consumer backlash (75%)** and **Competitor wins (25%)** —
confirming this action skews the world negative regardless of framing. The pivotal
card surfaces **acquisition messaging framing** as the strongest separating signal
(**58%** of cross-regime variance): how Notion frames the deal explains more than
half of which future you land in, with the remaining 42% left to dynamics the sweep
can't disentangle. Wake reports the math, not a recommendation — when the data
doesn't produce a clean lever, the card says so explicitly, and that honesty is the
moat. (Note: the "Competitor wins" regime's max-delta gainer is actually a creator
cohort, not a literal competitor — don't lean hard on "competitors win" verbally.)

## Real numbers (for Q&A)
- Model: **Gemini 3.5 Flash** for every node, edge, dossier, Genesis call, and the
  live "ask why."
- Notion world: **208 nodes, 346 edges, 5 seeds.** Anthropic: 57 nodes.
- Live full cascade ≈ **~110s** at concurrency 6 (why Live is seed-paced; Replay is
  the escape hatch). The **fan**: 32 runs, **$3.19**, pivotal "acquisition messaging
  framing" **58%**, regimes Consumer backlash (24) / Competitor wins (8).
- Genesis: one sentence → ~21 entities, **~$0.016**, ~55s live (precomputed fallback
  committed). Live URL: **https://wake-web-zeta.vercel.app**.
