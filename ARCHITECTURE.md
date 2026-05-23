# Wake — graph architecture

This document enumerates the candidate graph: node categories, the tiering
strategy, and relationship types. It is deliberately exhaustive — easier to prune
than to invent. The worked example uses the **Notion ← Microsoft acquisition**
scenario.

## Framing

- **The graph isn't symmetric between Notion and Microsoft.** Notion is the focal
  company and gets deep instrumentation — named individuals, specific teams,
  specific customer cohorts. Microsoft is a gravitational mass: model the few
  leaders/divisions that matter and let the rest be a single "Microsoft mass"
  node with aggregate behaviors.
- **Node function types.** Some nodes are **actors** (originate events), some are
  **audiences** (receive and react), some are **channels** (propagate, often with
  transformation), some are **artifacts** (exist and accumulate state but don't
  act — the product, the brand, the cap table). Most are hybrids, but the
  dominant function shapes the tick behavior.
- **Common fields on every node.** Identity (the dossier); current state (mood,
  attention, beliefs, recent history); public face vs. private interior;
  relationships (edge IDs); an **activity threshold** (how much incoming signal it
  takes to make this node act on a tick). The threshold controls cascade depth —
  high-threshold nodes act only when something big enough hits them.

## Node enumeration

### Internal — Notion

- **Leadership tier (highest fidelity):** Ivan Zhao (CEO/co-founder), Simon Last
  (co-founder/CTO), Akshay Kothari (COO), CFO, CPO, named VPs with public writing.
  These are judged hardest by the audience and deserve the most dossier work.
- **Middle management (funnel nodes):** director-of-engineering, head-of-design,
  head-of-marketing, head-of-sales, head-of-customer-success, VP-of-AI,
  head-of-platform. Mostly anonymized archetypes labeled by function. The
  engineer-with-an-idea scenario lives or dies here.
- **Individual contributors:** named exemplars (e.g. the platform engineer who
  tweets about Postgres) plus archetype clusters — core platform engineering, AI
  features team, growth engineering, design, marketing, sales, customer success.
  Each archetype has a composite identity, an averaged mood, and an attrition
  risk. Post-acquisition they react differently (AI team excited about compute;
  platform team nervous about Azure migration; design team fearing
  aesthetic-by-committee).
- **Artifacts (passive):** the product (shape, limitations, roadmap); the brand
  (positioning, perceived character); the codebase (size, debt, language choices);
  customer contracts (enterprise vs. prosumer vs. free, churn-risk profile).

### Internal — Microsoft (acquiring side)

- Satya Nadella (CEO), Mustafa Suleyman (CEO Microsoft AI — plausible executive
  sponsor), Rajesh Jha (EVP, Office — the Loop-overlap question sits here),
  Power Platform leadership, the acquiring BU's leadership (M365 or Microsoft AI),
  corp-dev/M&A team, the board (aggregated, low activation threshold).
- **Interacting properties (internal politics):** Microsoft Loop (direct internal
  competitor — strong opinions about buying its competition), Office/Teams,
  OneNote, Copilot for M365, Power Apps.
- **Aggregated archetypes:** a single "Microsoft mass employee" node with
  engineering/sales/marketing/IT sub-clusters (mostly audience + LinkedIn
  amplifiers); a dedicated "Microsoft sales force" node (post-acquisition they
  decide whether to lead with Notion or Loop — that determines distribution).

### External — competitors

Linear (Karri Saarinen), Coda, ClickUp, Asana, Airtable, Obsidian (would gain
users in some scenarios), Roam, Cursor / AI-native productivity tools,
Salesforce/Slack, Google Workspace leadership. Each has internal leadership, a
product node, a customer-base node, and a sales reaction.

### External — journalists and analysts (load-bearing)

Casey Newton (Platformer), Alex Heath (The Verge), Eric Newcomer, Kara Swisher,
TechCrunch cluster, Bloomberg enterprise reporters, The Information enterprise
team, Ben Thompson (Stratechery). Analysts: Gartner collaboration-tools team,
Forrester. These shape the narrative that reaches enterprise buyers.

### External — influencers and commentators

Named tech-Twitter voices (@swyx, @dhh, @paulg), publicly-commenting VCs (Brad
Gerstner, Bill Gurley, Keith Rabois), prominent founders. Clusters: "AI Twitter",
"developer Twitter", "enterprise SaaS Twitter", the "skeptical-of-Microsoft-
acquisitions" cluster (remember Skype), the "LinkedIn thought-leader" cluster
(more synergy-coded, more positive on acquisitions).

### External — customers (by cohort)

- **Enterprise** (seat licenses; procurement + IT react differently from end
  users). Named-customer subset (companies that publicly use Notion) whose
  public stay/leave propagates.
- **SMB** (founder-driven adoption, faster to switch).
- **Prosumer** (individual paying power-users, vocal on Twitter).
- **Free-tier** (huge base, low individual signal, aggregate sentiment matters).
- **By use case:** students, writers, engineers-as-wiki, designers-for-specs,
  ops-as-CRM. Different sensitivities (students don't care about compliance;
  enterprise IT cares enormously about Microsoft data policy).

### External — the latent customer base

The M365 installed base (gainable); the "tried Notion and bounced" cohort; the
"considered Notion, went with Confluence/Coda/Linear" cohort. This is where growth
lives, and the acquisition changes the calculus.

### External — regulators and policy actors

FTC (does the deal even close?), EU Commission (friendly post-Activision), UK CMA.
Slow-tick, high-threshold nodes with enormous downstream state-change when they
act.

### External — investors and financial actors

Notion's investors (Sequoia, Index, Coatue — they vote on the deal, with
differing incentives); Microsoft shareholders (mostly index funds, low
activation, but stock price moves propagate); Notion employees with vested equity
(huge personal stake, drives Twitter/Blind); the broader VC cohort (recalibrates
portfolio comps based on the deal).

### External — developer ecosystem

Notion API users and integration partners (Zapier, Make, Slack integrations),
businesses built on the API; Microsoft's developer ecosystem; the overlap and the
margin-squeeze divergence.

### External — adjacent communities

Hacker News (its own beast, 500-comment thread), Reddit (r/Notion,
r/productivity, r/sysadmin each react differently), #buildinpublic, IndieHackers.

### Channels and platforms (nodes too)

Twitter (amplification + algorithmic bias), LinkedIn (professional-positivity
bias, slower), Hacker News (technical, skeptical, fast), Reddit subreddits, Blind
(the leak channel — where internal divergence emerges), the Notion blog (slow),
Microsoft PR (big, fast), press-release wire services, industry newsletters, the
Microsoft earnings call (a future event the cascade must account for).

## Tiering

Fidelity is distributed, not uniform. Total population matters less than the
distribution of fidelity.

- **Tier 1 (~30–50):** full dossiers, careful prompts, individual identity. Named
  individuals, major companies, major journalists, major influencers. Audience
  judges quality here.
- **Tier 2 (~60–100):** archetype-level dossiers shared across instances of the
  same type, with state diverging per instance. Customer cohorts by use-case,
  employee archetypes, community clusters.
- **Tier 3 (as many as wanted):** pure aggregations with simple parameterized
  behaviors. Mass audiences as counts with sentiment vectors; slow entities.

## Relationship enumeration

- **Hierarchical:** reports-to (employee→manager→VP→CEO), within-team peer, board
  oversight, investor-to-company. Different propagation rules — info up the chain
  gets filtered, lateral peer info is distorted by gossip, board info is rare and
  high-impact.
- **Competitive:** Notion ↔ Linear (asymmetric: Linear watches Notion closely),
  Notion ↔ Microsoft Loop (mutual existential threat), Microsoft AI ↔ Loop
  (internal competition that becomes acute). Fire on one side acting and trigger
  reactive planning on the other.
- **Customer:** company-buys-from-Notion (varies by tier),
  individual-uses-Notion, customer-evangelizes-Notion (the loud ones),
  customer-considers-leaving (latent, flips when triggered). Variable strength.
- **Information-flow (each with a transformation function):**
  journalist→audience (one-way, high amplification, sensational),
  influencer→followers (faster, more variable), friend→friend (lateral, low
  reach, high believability), employee→press leak (rare, high-impact, fires when
  internal divergence is high), analyst→enterprise-buyers (slow, formal, high
  credibility, measured).
- **Following/attention:** person-follows-account-on-platform. Weak edges that
  batch — an influencer with 100K followers fires one edge into a "followers of
  @X" audience node, not 100K edges.
- **Membership:** person-is-member-of-cohort. A named customer may belong to
  "enterprise" + "AI-curious" + "Bay Area tech" + "follows @ivanzhao". State is
  influenced by what reaches any membership.
- **Geographic/cultural:** same-office cohorts (gossip more), same-time-zone (who
  hears first), same-national-context (regulators/press react differently).
- **Equity/financial:** holds-equity-in-Notion, vesting-status (unvested behave
  differently from vested), investor-to-LP, Microsoft quarterly-earnings
  pressure.
- **Temporal (built-in lag):** enterprise renewal on a 12-month cycle; vesting
  cliff on a 4-year cycle. Wake handles these with **delayed-event injection** —
  an event fires now but its consequence on a specific edge is scheduled for a
  future tick.

## Worked example — "an engineer DMs their manager with an idea"

The point is to show the *same action* propagating differently before and after
the acquisition.

**Cast.** "Maya" (senior engineer, AI features team); her manager (mid-tier,
deliberately *cautious, status-protective, recently promoted* — this character
creates the pre-acquisition death-of-idea); the skip-level (director of AI
engineering, more ambitious); the VP of AI/Product; the CPO; Ivan Zhao; lateral
peers; the area PM; adjacent teams.

**The idea must be specific.** Not "an idea" but: *"use AI to auto-generate
connections between Notion pages based on semantic similarity."* Concrete enough
that tick functions can reason about it. The cautious manager hears "another AI
feature" and parks it; the post-acquisition manager hears "AI feature that
demonstrates Office-style cross-document linking" and escalates.

**Pre-acquisition cascade (~20s, recognizably true).** Maya pings her manager on
Slack. The manager-edge filters it (cautious, doesn't want half-baked ideas up
the chain). The manager's tick produces "thanks, let me think about it" and parks
it — no outgoing event, no escalation. The cascade dies at tick 2. Maya's private
state → "discouraged"; her public state stays neutral. There is some lateral
spread (Maya mentions it to a peer at lunch → PM → designer) that fades. Every
engineer in the room has lived this.

**The acquisition reshapes the graph between beats.** New nodes appear (Microsoft
acquiring division, Mustafa Suleyman, Loop leadership now in conflict). Some
internal nodes are removed or rewired (some senior leaders leave; reporting
structures change; the CPO may be replaced by a Microsoft-side equivalent). The
"strategic priority" axis of every internal manager updates: pre-acquisition it
was "ship Notion AI v3, improve mobile, defend against Linear"; post-acquisition
it is "demonstrate value to Microsoft, find synergies with Copilot, justify the
price." This topology change is shown on screen — nodes shifting, edges rewiring,
new nodes arriving.

**Post-acquisition cascade (~30s, survives with effort).** Maya proposes the same
idea. The manager's state has changed — now under explicit pressure to show
"Notion–Microsoft synergy stories" to justify headcount. Maya's idea matches the
priority axis. The manager escalates to skip-level with Microsoft-relevant
framing; skip-level re-frames and escalates to the VP; the VP, who now has a
regular meeting with Mustafa Suleyman, mentions it. The cascade continues 5–8
ticks and reaches a director-level node at Microsoft AI, becoming a small project.
It shouldn't be too clean — some ticks where a director asks "is this really
Microsoft-aligned?" and Maya clarifies. Combined with the lateral spread, the idea
reaches critical mass.

Same engineer, same idea, two different cascades. The world changed shape, and the
same action has different consequences in different shapes of world.

## Budget allocation (working figure: $1,000)

- **Iteration:** many small runs against an ~80-node graph, single trajectories,
  focused on getting per-node and per-edge prompts right. ~$2–4/run. Budget
  $200–300 → 50–100 test cascades.
- **Canned demo (private judging):** ~150 nodes, single pre-recorded trajectory +
  a small ~100-run Monte Carlo. ~$50–100. Plays if anything fails live.
- **Stage pitch (top six):** ~250 nodes, full live cascade + a 500-run
  pre-computed Monte Carlo for the punchline. ~$200–400. The demo that wins.
- **Reserve:** $200–300 for scope expansion or re-running rehearsal twice.

If the budget is much larger (~$10K), the right move is **not** a bigger Notion
graph — it's running the same demo across two or three companies (Notion,
Anthropic, our own startup) so judges see generalization. Three high-quality
cascades against different worlds beats one cascade against an artificially huge
graph.

## Open question to settle next

The eval: which historical Notion event to seed (Notion AI launch 2023? Notion
Calendar?), and what counts as "resemblance" between the simulated and the real
cascade. That answer is the difference between a world model and a screenwriter.
