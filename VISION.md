# Wake — a world model for organizational action

## What this is, in one paragraph

Wake is a graph-based simulator that lets you take any organizational action — a
product announcement, an acquisition, a layoff, an internal proposal, a tweet —
and watch its consequences propagate through a model of the surrounding world.
Internal employees, external journalists, competitors, customers, Twitter
audiences, LinkedIn followers, regulators, VCs: each is a node with its own
state, beliefs, public face, and private interior. Each relationship is itself an
LLM-mediated channel that filters, distorts, amplifies, or kills information as
it travels. You inject an action at one or a few seed nodes and the simulator
runs forward in simulated time, showing the cascade visibly — which nodes act,
what they say publicly versus what they think privately, where the wave of
information stops, and what the final graph state looks like once the dust has
settled. Then it does it again, a thousand times, with small perturbations to
initial conditions, and shows you the distribution of possible futures and the
single variable that most determines which world you end up in. It is, in the
most ambitious framing, a textual world model for human organizations.

## Why we're building this

There is a category of question that knowledge workers ask constantly and have no
good tool for. If we ship this feature, will anyone care? If I bring this idea to
my manager, will it survive the chain of people it has to pass through? If we
announce this acquisition, what does the world look like in three months? If we
pivot to AI agents, do our existing customers churn before the new ones arrive?
Today these questions are answered by gut, by analogies to other companies, by
Twitter polls, by expensive consultants who substitute their own gut for yours.
None of it scales, none of it branches, none of it shows you the world you're
imagining acting on.

The reason no one has built this yet is not that nobody wanted it. It's that
until very recently, the substrate didn't exist. You needed three things
simultaneously: enough intelligence per node that each entity's reasoning was
worth reading, enough speed that a graph could tick forward in seconds rather
than hours, and enough cost-efficiency that thousands of parallel runs were
financially possible. Frontier models had the intelligence but not the speed or
cost; small models had the speed but not the intelligence. Gemini 3.5 Flash is
the first model to land in the corner where all three constraints are
simultaneously satisfied — frontier-class agentic and reasoning benchmarks at 4x
output speed and a price point that makes million-call workloads tractable. The
model is the first one that makes this category of product actually possible to
ship.

That's the thing we want the DeepMind judges to feel without us having to argue
for it. **The demo is the argument.**

## The audience

We are pitching to three audiences in the same room with different motivations.

- **Google DeepMind** want to see what Flash makes possible. Beneath that:
  vindication of the agentic positioning bet — proof, in the form of a demo they
  can screenshot and send internally, that they were right to reposition Flash
  from a cheap chatbot to the substrate of the agentic era. Wake is built
  directly out of the words in their problem statement. Sub-agent deployment is
  the per-node and per-edge LLMs. Multi-step workflows are the cascade ticks.
  Long-horizon tasks at scale are the Monte Carlo runs over simulated months.

- **AI Futures Fund partners** want to see a real company emerge from the
  hackathon. Beneath that: to be the one who saw it first. They are also
  exhausted by the same agent-swarm-fact-checker-deep-researcher demo. Wake is a
  category they have not yet seen pitched: simulation as a product surface, with
  a graph of real entities as the substrate — "the simulation layer of the
  AI-native company."

- **Cerebral Valley** want the demo that gets attention. Beneath that: cultural
  relevance. Wake's clip has the property they need: a single sixty-second clip
  in which the audience watches a recognizable company's world react to a
  recognizable action, with named entities, visible cascades, and a punchline.

We operate at a hybrid sophistication stage. The headline category — "agentic
AI" — is saturated; nobody believes a new promise. The subcategory we claim —
the organizational world model — has no incumbent. So we don't promise ("Wake
helps you make better decisions"); we identify ("watch your action propagate
through the world") and let the audience recognize the desire it names: *I want
to know what happens to my decisions once I let go of them.*

## What we're claiming, and what we're not

Wake does not predict the future. What Wake does is make the **consequence
space** of an action legible. Given the world as it is and an action you propose,
here are the trajectories that world might take. Some are confident — clusters
of futures that converge despite perturbation. Some are highly sensitive — small
changes in initial conditions flip the outcome wildly. The most honest and most
useful output isn't "this is what happens"; it's "here is the distribution, and
here is the pivotal variable."

This honesty is also the differentiation. Every prediction startup that pretended
to be an oracle eventually was wrong and died. Wake pretends to be a Monte Carlo
over imagined futures and is wrong about specific futures in a way nobody minds,
because that's what a Monte Carlo is for. The thing it claims to be right about —
the consequence space, the pivotal variables, the structure of where outcomes
diverge — is a softer and more defensible claim.

Wake is also **not** a fact-checker, a critic, a fact-finder, or a researcher.
Those all collapse into existing categories. Wake is structurally different
because its output is not a verdict but a world. You don't get told something is
true or false; you get to watch what happens.

## The three layers

### 1. The graph layer

For the hackathon, we pre-build two or three worlds and let the judge pick which
to demo against. Candidates: Notion, Linear, Stripe, Anthropic, Cursor. **Default
to Notion plus one other.** Notion is the strongest single choice: a known cast
(Ivan Zhao, Akshay Kothari), a recognizable competitive landscape (Linear, Coda,
Microsoft Loop), an active community, and an audience the judges have prior
beliefs about.

Each pre-built world has ~200–500 nodes:

- A few dozen **internal entities** (named C-suite, key managers, named
  engineers, anonymized employee archetypes by team).
- A few dozen **external named entities** (journalists, influencers, competitor
  leaders, VCs known to comment publicly).
- A few hundred **archetypal community nodes** ("productivity Twitter
  power-user", "skeptical HN commenter", "enterprise IT buyer",
  "switching-from-competitor" cohort).
- **Platforms as nodes**: Twitter, LinkedIn, Hacker News, the company blog,
  internal Slack, Discord. Each platform has its own behavioral character,
  modeled as an LLM prompt that biases propagation.

**Edges** have direction, weight, and character. A journalist → audience edge is
one-way, high-amplification, biased toward sensational framings. An employee →
manager edge is two-way, filtered, biased toward palatable framings. A customer →
customer-cohort edge is lateral, fast, biased toward shared grievances. The
load-bearing edges are small LLM-mediated channels; the lighter edges
(friend-of-friend, generic-follower-to-influencer) are deterministic rules with
parameters.

Building these graphs is concrete data work, ownable by one engineer on day one:
scrape public sources (company blog, leadership Twitter/LinkedIn, public
statements, Glassdoor for tone, G2/Capterra reviews, recent press), summarize
each named entity into a ~200-token dossier capturing voice, recent positions,
known relationships, decision patterns, biases. The dossiers are the cached
system prompts for each node.

### 2. The simulation kernel

The kernel is the thing that has to be solid because everything depends on it.

A **tick** is one step of simulated time. Tick granularity is variable — early
in a cascade ticks are minutes; later they are hours or days. The simulator
advances time non-uniformly: when activity is high, ticks are short; when
activity quiets, ticks accelerate to the next interesting event.

Each node has **state**: current beliefs (compressed text); mood/disposition
(structured — attention, sentiment, urgency); public face; private interior;
recent history (last N events); standing commitments. Each node also has an
**inbox** of received-but-unacted events, tagged by source, time, and channel.

A node's **tick function** is a single Flash call:

```
(node_state, inbox, world_clock) → (state_delta, outgoing_events, rationale)
```

Output is structured JSON. State delta is a specific set of field updates.
Outgoing events are typed (`public_post`, `private_message`, `decision`,
`action`) with explicit targets and content. Rationale is a one-sentence
first-person explanation that surfaces in the interpretability layer.

The cached system prompt is the dossier plus the schema. Non-cached input per
tick is just current state + inbox + world clock (~600–1000 tokens). Output is
~300–500 tokens. Cost basis: roughly half a cent per tick per node, most input
cached.

**Edges** are not free either. When an event traverses a load-bearing edge:

```
(event, source_node, target_node, edge_character) → (transformed_event | null)
```

Cheap edges skip the LLM call and apply deterministic rules.

**Propagation is wave-like.** Tick 1: the seed event arrives at 1–2 nodes. Tick
2: their outgoing events reach immediate neighbors (5–30 nodes). Tick 3: 100+ in
the next ring if virulent, or a handful if it died on impact. Saturation happens
naturally — nodes ignore events they've already heard, audiences have attention
budgets that deplete, journalists have a daily story limit. Most cascades resolve
in 5–15 ticks, with a long tail of delayed effects handled by variable
time-stepping.

**Monte Carlo:** re-run the same simulation N times. Sampling temperature gives
natural divergence at decision points, plus optional explicit perturbations (the
journalist is on vacation; a competitor CEO had a bad morning; an unrelated news
story dominates the cycle). After K ticks across N branches, cluster the N final
graph states (node-state vectors + hierarchical clustering) and surface the three
or four most distinct clusters.

**Pivotal variable analysis:** for each perturbation dimension, look at which
clusters its variation correlates with. The dimension whose variation explains
the most cluster-level variance is the pivotal variable. Output: "across these
thousand futures, the single biggest determinant of whether you end up in the
success cluster vs. the failure cluster is whether your launch framing emphasizes
X or Y."

### 3. The interpretability layer

After any run, the entire cascade is a **DAG of events** with full provenance.
Each event knows its source node, target node, originating event, time, and the
rationale string the originator emitted. The interpretability layer is a Flash
call that takes any "why did X happen" question, traces back through the DAG, and
returns a paragraph-long narrative explanation citing specific upstream events.

Nearly free to build, triples the demo's punch. Example: *"Why did the
productivity-Twitter cohort turn hostile?"* → *"Because @journalist3 published a
piece framing the announcement as 'enshittification', which @influencer7
amplified at tick 6, reaching this cohort at tick 8 and matching their
pre-existing concern about acquisitions."* This is the moment the demo crosses
over from "interesting visualization" to "they actually built something real."

### The interface

The graph visualization is the carrier wave for the whole experience.

- **Default view:** force-directed layout, named nodes labeled (archetypes are
  small unlabeled dots), colored by current state (calm, attentive, excited,
  alarmed, hostile, churning). Edges faint by default. When an event traverses an
  edge it lights up briefly; the receiving node pulses. When a node acts it emits
  a small burst along its outgoing edges.
- **Clock + timeline** along the bottom, scrubbable backward and forward.
- **Dual-layer view (public vs. private):** a toggle that splits the graph. Switch
  between "what the public sees" and "what's actually happening". When divergence
  between layers is large at enough nodes, the simulator flags it and may emit
  emergent events: a leak, a Blind post, an internal screenshot on Twitter.
- **Monte Carlo fan view (the punchline):** after the live cascade resolves, the
  camera pulls back and the single trajectory becomes one strand in a sheaf of a
  thousand, colored by outcome cluster. The pivotal-variable card surfaces. This
  card is the line that goes on Twitter.
- **Interpretability panel** on the side: click any node or event and ask why.

Stack: sigma.js or cytoscape.js, skinned with care; Three.js if a designer can do
it justice. It should look like a film of a real system, not programmer art.
Color palette, motion, easing, and pacing deserve disproportionate time.

## The demo arc, second by second

On-stage demo is 3 minutes plus 1–2 minutes Q&A. Design for 90 seconds of
breathtaking material; the rest is conversational depth.

- **0:00–0:15** — Clean screen, company logo (Notion) and the Wake interface.
  "This is Wake. It simulates what happens when a company takes an action — to
  itself, to its market, to its world." The graph fades up: 200+ nodes, named
  where recognizable, calm baseline. Judges see Ivan Zhao, journalists they know,
  "productivity Twitter", "Linear" as a competitor node. They lean in.
- **0:15–0:30** — Action menu: five topology-changing options ("Notion is
  acquired by Microsoft", "Notion ships a free unlimited tier", "Notion's CEO
  steps down", "Notion open-sources its core platform", "An engineer DMs their
  manager with a product idea"). Operator clicks the Microsoft acquisition. Seed
  event appears at the Notion-corporate node. World clock begins.
- **0:30–1:30** — The cascade runs visibly. Journalists fire (one bullish, one
  neutral, one hostile); amplification through Twitter; customers shift color;
  competitors update (Linear's leadership turns alert); internal Slack divergence
  grows; a leak fires to Blind and propagates back to Twitter; enterprise churn
  begins; the cascade calms. Speaker narrates lightly.
- **1:30–2:00** — Camera pulls back. The single trajectory becomes one of a
  thousand. The fan resolves into three clusters: "muted positive integration"
  (most futures), "consumer backlash" (sharp), "competitor wins" (smaller). The
  pivotal-variable card surfaces: "the single biggest determinant is whether the
  acquisition messaging leads with 'independent' or 'integrated'." **This is the
  line.**
- **2:00–2:30** — Second action, now in the post-acquisition world: "engineer DMs
  their manager with a product idea". Pre-acquisition it would have died at the
  manager; post-acquisition it escalates to the CEO node because Microsoft
  strategic alignment is now a relevant axis. The point lands without us making
  it: the same action means different things in different worlds.
- **2:30–3:00** — Close. "This is the first organizational world model. It's only
  possible because Flash makes a million parallel reasoners cheap enough to
  actually run. We didn't predict any specific future. We made the consequence
  space legible."

**Q&A killer move:** invite a judge to propose their own counterfactual. "Pick
any node. Pick any small change. We'll re-run and see what's different." If the
audience-proposed counterfactual produces a cascade that feels right despite no
one having programmed those specific dynamics, the demo is over and we've won.

## Build plan, hour by hour

Six and a half hours of build time after kickoff. Be ambitious but ruthless about
scope.

- **0–1h** — Kernel scaffolding and graph schema. Lock node/event/edge formats,
  the tick loop, parallel execution against the Vertex API, deterministic seeding
  for branching, structured-output validation, test fixtures.
- **0–2h (parallel)** — Graph population. Scrape and structure Notion's world.
  Build dossiers, edges, seed prompts. Aim for 200 nodes with care, not 1000
  hastily.
- **1–3h** — Per-node behavior. The hardest single piece. Eval loop: seed the
  graph with a known historical Notion event's pre-state, run forward, check
  whether the simulated cascade resembles what actually happened. Success
  criterion is qualitative resemblance, not perfect match.
- **2–4h** — Per-edge behavior. ~6 edge archetypes (journalist→audience,
  employee→manager, customer→cohort, competitor→strategy, platform-amplification,
  friend→friend), prompt each, parameterize the lights.
- **2–5h** — Visualization. Graph view, cascade animation, dual-layer toggle,
  Monte Carlo fan, interpretability panel. Disproportionate attention; this wins
  the demo.
- **3–5h** — Interpretability layer. Event-DAG accumulator + the trace-back Flash
  call.
- **4–6h** — Integration, action-menu curation, pre-baked Monte Carlo precompute,
  operator console.
- **5–6.5h** — Rehearsal and failure-mode handling. Run end-to-end five times.
  Build a "play canned cascade" escape hatch identical to the live run. Time the
  narration. Cut anything that doesn't earn its time.

Submission video at 5pm: the same 90-second arc, recorded clean. Public repo with
kernel, graphs, prompts.

## What can go wrong, and the defense

- **The simulator says something visibly stupid.** Defense: dossier quality for
  load-bearing named nodes. Curate and pre-test with canned actions.
- **The cascade looks the same regardless of the action.** Defense: make the
  state model respond to action *content*. De-risk by evaling against historical
  events early.
- **The cascade dies too fast or runs too long.** Defense: variable time-stepping
  and saturation rules. Aim for 8–12 ticks of meaningful activity on stage.
- **The visualization is unclear.** Defense: the design pass. Judges should follow
  what's happening without narration.
- **The live API fails.** Defense: a pre-recorded cascade indistinguishable from
  live, one click away.
- **A Q&A counterfactual produces a weird result.** Defense: invite only when
  confident; frame as "look at how the world adjusted", not "see how right we
  are." Being a Monte Carlo, not an oracle, is the protection.
- **We get classified as a "basic agent swarm".** Defense: pitch language. "World
  model for organizations", not "agents in a graph." "World model" places the
  project in DeepMind's own research vocabulary.

## Naming and framing

**Wake.** The trail of disturbance left behind a moving object. The thing every
action leaves behind in the world. Also: the act of waking a world up to what
just happened. Short, evocative, web-searchable.

Subtitle: *a world model for organizational action.*

Pitch sentence: "This is a world model for organizations. Give it any action and
it shows you how the world reacts, branching across thousands of possible
futures, grounded in a graph of real people and real platforms. It's only
possible because Flash makes a million parallel reasoners cheap enough to actually
run."

Identification headline candidates (we identify, we don't promise):

- **"Watch your decision before you make it."** (strongest)
- "Every action leaves a wake. See yours."
- "What happens if you ship it?"

## The bigger picture

Wake is the simulation layer of the AI-native company. If AI takes over
orchestration and humans become the judgment and taste layer, then any AI
orchestrator needs to ask "what happens if I take action X?" before taking it.
That's a world model. Robotics is solving this for physical embodied action;
nobody is solving it for organizational textual action. Wake is the first
instance of that primitive.

The sharper version: every person in that room has had a good idea die in a
meeting they weren't in, or watched a launch flop they thought would land, or
made a strategic call the world reacted to in a way they didn't expect. Wake is
the tool that, if it works, makes that experience less common. The whole product
is the audience watching their own world react to their own decision. Everything
else is in service of that.

## Open question to settle next

The eval methodology. Which specific historical Notion event do we seed the graph
with (Notion AI launch 2023? Notion Calendar launch?), and what counts as
"resemblance" between the simulated cascade and what actually happened? That
answer is the difference between shipping a world model and shipping a
screenwriter.
