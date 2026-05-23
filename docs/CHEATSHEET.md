# Wake — one-page cheatsheet (keep open while recording + submitting)

**Live:** https://wake-web-zeta.vercel.app · **Repo:** github.com/Mortifera/google-io-hackathon-2026-05-23-wake ⚠️ *confirm it's PUBLIC*
**Model:** Gemini 3.5 Flash everywhere · Full detail: `docs/demo-script.md`, `docs/SUBMISSION.md`

---

## 🎬 The 60-second narration (say this; [bracketed] = operator action)

**0:00** *"This is Wake — a world model for organizational action. Two hundred real people and platforms, and **every node is its own Gemini 3.5 Flash reasoner**."*
[graph up]

**0:08** *"We drop in one action — and let go."*
[**O** → **"Notion is acquired by Microsoft"** → **Run Live**]

**0:16** *"This isn't a progress bar — it's **two hundred minds reasoning, live**. You can read who's thinking and why, one rationale at a time… and that — that's a **leak**: a node's private interior diverged too far from its public face and surfaced."*

**0:38** *"It's not a black box. Every outcome traces back to your action — cited, event by event."*
[click a hostile cohort → **Ask why**]

**0:48** *"Then we ran it **thirty-two times** with the world perturbed. The futures settle into two regimes — consumer backlash in three of four runs, competitors capitalizing in the rest — and the single dial that most decides which one you land in is the **acquisition messaging framing**: it accounts for **58%** of the spread."*
[**Futures** view]

**0:58** *"We didn't build an oracle. We made the consequence space legible — so you can watch your decision before you make it. **Flash is what makes it cheap enough to run.**"*

**Extensions (longer cut / Q&A):** Two-worlds beat ("same action, same manager, opposite intent — because the world changed"); Anthropic world (generalization); Genesis ("one sentence → a runnable world").

---

## ⌨️ Operator keys
- **O** — operator console / action menu · **1–5** — switch scenarios
- Each scenario: **Run Live** (Gemini SSE) or **Replay** (precomputed, identical)
- **Public / Private** — dual-layer toggle · **Ask why** — causal trace on any node/event
- **Futures** — the fan + pivotal card · **Two worlds** — beat #2

## 🛟 Safety nets (if live stalls)
- Switch any scenario to **Replay** — byte-identical precomputed cascade, one click.
- Backup machine path: the **live URL** above (QA'd green, matches localhost).
- Genesis: if the live build is slow on camera, cut to the committed `tools/genesis/examples/stripe-plaid.json`.

## 🔢 Numbers (for Q&A)
- Notion world: **208 nodes / 346 edges / 5 seeds** · Anthropic: 57 nodes
- Fan: **32 runs**, pivotal **"acquisition messaging framing" 58%**, regimes Consumer backlash (24 / 75%) / Competitor wins (8 / 25%)
- Live full cascade ≈ **110s** @ concurrency 6 (why Live is seed-paced; Replay is the escape hatch)
- Genesis: one sentence → ~21 entities, **~$0.016**, ~55s · a ~200-node cascade ≈ $0.19

## 🗣️ Say-it-this-way (honesty guardrails)
- "The sweep **settles** into…", "the pivotal variable **points to**…" — **never** "Wake recommends" / "you should."
- Both fan regimes are negative — don't imply a clean "good" path. Honest read: *"risky in most futures; the lever you control is the framing."*
- Don't lean hard on "competitors win" verbally — that regime's actual gainer is a creator cohort.

---

## 📝 Submission form — paste-ready

**Team Name:** `Wake` (or your choice) · **Members:** Jack Gardner (+ up to 3)
**Repo:** https://github.com/Mortifera/google-io-hackathon-2026-05-23-wake *(make PUBLIC first)*
**Demo Video:** the ≤60s cut above (YouTube; must show what was built at the event)

**Project Description:**
> **Wake — a world model for organizational action.** Drop one action into a graph of ~200 real entities (executives, competitors, journalists, customer cohorts, platforms, regulators), where **every node is its own Gemini 3.5 Flash reasoner**, and watch the consequences cascade in real time: the press turns, communities go hostile, and a private grievance leaks when a node's public face diverges too far from its private interior. Then Wake runs the same action many times with perturbations (a Monte Carlo sweep) and collapses the result into a few outcome regimes, surfacing the **single pivotal variable** that decides which future you land in. Click any outcome and Wake traces the exact causal chain back to your action, cited event by event. It is not an oracle — it makes the consequence space legible, so you can watch your decision before you make it. Gemini 3.5 Flash is what makes a thousand parallel reasoners cheap enough to actually run.

**"Does your project use managed agents?"** (Draft A — honest; we did NOT wire the Managed Agents API):
> Wake is a multi-agent system built on Gemini 3.5 Flash: each of ~200 nodes is an autonomous agent that reasons in character every tick, edges are agents that transform messages as they cross relationships, all orchestrated through a multi-step tick workflow and scaled out as a Monte Carlo of thousands of agent runs. Genesis is an agentic, **Google-Search-grounded** pipeline: a Gemini agent issues its own web searches to research the real cast for a scenario, then generates a runnable world. We use direct Gemini API tool-use rather than the Managed Agents API; Genesis is architected (injectable runner + streamed progress) to move onto Managed Agents as the remote runner.

## ✅ Before you hit submit
- [ ] Repo is **PUBLIC** · [ ] Team name set + members added
- [ ] Video uploaded (≤1 min, shows what was built at the event)
- [ ] Project Description + managed-agents answer pasted
- [ ] `.env` clean — verified (never committed) ✓
