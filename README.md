# Wake

**A world model for organizational action.**

> Watch your decision before you make it.

Wake is a graph-based simulator. Take any organizational action — a product
announcement, an acquisition, a layoff, an internal proposal, a tweet — and
watch its consequences propagate through a model of the surrounding world.

Internal employees, external journalists, competitors, customers, Twitter
audiences, LinkedIn followers, regulators, VCs: each is a **node** with its own
state, beliefs, public face, and private interior. Each relationship is an
LLM-mediated **channel** that filters, distorts, amplifies, or kills information
as it travels. You inject an action at one or a few seed nodes; the simulator
runs forward in simulated time and shows the cascade visibly — which nodes act,
what they say publicly versus what they think privately, where the wave stops,
and what the final graph looks like once the dust settles.

Then it does it again, a thousand times, with small perturbations, and shows you
the **distribution of possible futures** and the single variable that most
determines which one you land in.

Wake does not predict the future. It makes the **consequence space** of an
action legible.

---

## Why now

Building this needed three things at once: enough intelligence per node that
each entity's reasoning is worth reading, enough speed that a graph can tick
forward in seconds, and enough cost-efficiency that thousands of parallel runs
are financially possible. Frontier models had the intelligence but not the speed
or cost; small models had the speed but not the intelligence. **Gemini 3.5
Flash** is the first model to satisfy all three constraints simultaneously,
which makes a million parallel reasoners cheap enough to actually run.

## Architecture at a glance

Three layers:

1. **Graph layer** — the substrate. Pre-built worlds (Notion first) of
   ~200–500 nodes: named leadership, employee archetypes, journalists,
   competitors, customer cohorts, and platforms (Twitter, LinkedIn, HN, Blind).
   Edges have direction, weight, and character.
2. **Simulation kernel** — the engine. Each node's tick is a single Flash call:
   `(node_state, inbox, world_clock) → (state_delta, outgoing_events, rationale)`.
   Load-bearing edges are LLM-mediated channels; light edges are deterministic
   rules. Propagation is wave-like; time-stepping is variable. Monte Carlo runs
   re-run the cascade N times and cluster the outcomes.
3. **Interface** — what the audience sees. A force-directed graph that animates
   the cascade, a public/private dual-layer toggle, the Monte Carlo "fan" view,
   and an interpretability panel that traces *why* any outcome happened.

See [`VISION.md`](./VISION.md) for the full product spec and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the node/edge enumeration.

## What this is for

Built for the Google DeepMind / AI Futures Fund hackathon (2026-05-23). The demo
is the argument: a recognizable company's world reacts to a recognizable action,
with named entities, visible cascades, and a punchline.

## Status

Greenfield. Kernel, graphs, prompts, and visualization to come.

## Name

*Wake* — the trail of disturbance left behind a moving object; the thing every
action leaves behind in the world. Also: the act of waking a world up to what
just happened.

## License

[MIT](./LICENSE) © 2026 Jack Gardner
