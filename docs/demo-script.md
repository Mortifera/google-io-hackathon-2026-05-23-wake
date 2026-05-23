# Wake — demo script (~2:40, for the 4pm video)

Speaker = narrator. Operator = drives the UI (operator console / keyboard).
Beats marked **[stretch]** are cut first if time/stability is tight.
Numbers in〈angle〉are filled from the live data once the precompute lands.

---

**0:00–0:15 — Open**
- Operator: Wake interface up; the Notion world graph fades in (208 nodes; named
  entities legible — Ivan Zhao, Casey Newton, Linear, Sequoia, productivity Twitter).
- Speaker: *"This is Wake. Give it any action a company could take — and it
  simulates what happens next. To the company, to its market, to its whole world.
  Every node here is a real person or platform, and each one is its own reasoner."*

**0:15–0:30 — The action**
- Operator: open the action menu, click **"Notion is acquired by Microsoft."**
  The seed lands on the Notion node; the clock starts.
- Speaker: *"We inject one action — and let go."*

**0:30–1:15 — The cascade**
- The wave propagates: Notion pushes its messaging → **Alex Heath / The
  Information / Casey Newton** react → **Twitter** amplifies → **Reddit, Discord,
  productivity Twitter** turn hostile (watch the colors flip to red) → **Sequoia**
  weighs an IPO threat → a private grievance **leaks to Blind**.
- Operator: toggle the **dual layer** — public face vs. private interior; the
  divergence count climbs, and that's what triggers the leak.
- Speaker (light, naming beats): *"Watch the press pick it up… here's Twitter
  turning… and that — that's a leak. A private divergence got too big and surfaced."*

**1:15–1:30 — Why? (the interpretability money-shot)**
- Operator: click a hostile cohort → **"Ask why."** The graph dims; a glowing line
  traces backward through the causal chain to the seed.
- Speaker: *"It's not a black box. Every outcome traces back —* 〈e.g. "this cohort
  turned hostile because Heath's coverage at tick 1 was amplified into the
  community, matching their fear of consolidation"〉*— cited, event by event."*

**1:30–2:05 — The fan (THE LINE)**
- Operator: pull back. The single run becomes one strand in 〈48 / "a thousand"〉,
  colored by outcome: **Smooth integration · Full-blown backlash · Competitors
  capitalize.**
- The **pivotal card** surfaces.
- Speaker: *"We didn't predict one future. We ran the whole distribution. And the
  single biggest determinant of which world you land in — 〈framing: whether the
  messaging leads with 'independent' or 'integrated'〉. That one dial explains
  〈X%〉 of the outcomes."*

**2:05–2:20 — Generalization [stretch]**
- Operator: switch worlds → **Anthropic**. Same engine, new world.
- Speaker: *"And it isn't bespoke to Notion — point it at any organization."*

**2:20–2:40 — Close**
- Speaker: *"This is the first world model for organizational action. It's only
  possible because Flash makes a million parallel reasoners cheap enough to
  actually run. We didn't build an oracle. We made the consequence space legible —
  so you can watch your decision before you make it."*

---

## Q&A killer move (if invited)
*"Pick any node. Pick any small change. We'll re-run and show you what's
different."* (Only if confident — frame outputs as "watch how the world adjusted,"
not "see how right we are." It's a Monte Carlo, not an oracle.)

## Safety / escape hatch
The canonical run (`notion-world.acquisition.json`) is one click in the operator
console — if the live API ever stalls, play the canned cascade; it's identical.

## Live Wire [stretch, only if rock-solid]
Mid-cascade, inject a real breaking headline → Tier-1 nodes ingest it and shift
behavior live. The strongest proof these nodes *reason* rather than replay a script.
