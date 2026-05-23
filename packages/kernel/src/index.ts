import {
  CascadeSchema,
  type World,
  type NodeDef,
  type EdgeDef,
  type NodeState,
  type Event,
  type Tick,
  type StateSnapshot,
  type DivergencePoint,
  type Cascade,
  type TickFn,
  type TickOutput,
  type EdgeTransform,
  type LLMClient,
  type Neighbor,
} from "@wake/contracts";
import { makeIdGen } from "@wake/util";
import { mapStream } from "@wake/util";

export { loadWorld } from "./loadWorld";

export interface RunOptions {
  /** Deterministic seed; Monte Carlo passes base+i per branch. */
  seed?: number;
  /** Sampling temperature handed to the LLM (raise it for MC divergence). */
  temperature?: number;
  /** Max in-flight LLM calls per tick. */
  concurrency?: number;
  /** Hard cap on ticks (safety). */
  maxTicks?: number;
  /** Explicit perturbation recorded in cascade.meta (for Monte Carlo). */
  perturbation?: Record<string, unknown>;
}

export interface RunDeps {
  llm: LLMClient;
  /** Injected from @wake/nodes — the kernel never imports node code. */
  tickFn: TickFn;
  /** Injected from @wake/edges. */
  edgeTransform: EdgeTransform;
}

// How long (in world-clock units) an event takes to traverse a given edge.
// Variable time-stepping emerges from these: fast channels cluster ticks early,
// slow ones (an employee deciding, a customer churning) stretch later.
const EDGE_DELAY: Record<string, number> = {
  "company->journalist": 15,
  "journalist->audience": 30,
  "platform-amplification": 30,
  "internal-leadership": 30,
  "leadership->report": 45,
  "employee->manager": 60,
  "competitor->strategy": 30,
  "customer->cohort": 60,
  "friend->friend": 45,
  direct: 30,
};
function edgeDelay(character: string): number {
  return EDGE_DELAY[character] ?? 30;
}

// Saturation: each action spends a slice of the node's attention budget.
const ATTENTION_COST = 0.34;

function applyDelta(st: NodeState, d: Partial<NodeState>): NodeState {
  return {
    ...st,
    ...d,
    mood: { ...st.mood, ...(d.mood ?? {}) },
    history: d.history ?? st.history,
    commitments: d.commitments ?? st.commitments,
  };
}

function defaultEdge(source: string, target: string): EdgeDef {
  return {
    id: `${source}->${target}`,
    source,
    target,
    direction: "one-way",
    weight: 0.5,
    character: "direct",
    llmMediated: false,
  };
}

// Where a leaked private grievance surfaces (a platform/channel node).
function pickLeakTarget(world: World): string | null {
  const platform =
    world.nodes.find((n) => /twitter|blind|reddit|hacker/i.test(n.id)) ??
    world.nodes.find((n) => n.fn === "channel");
  return platform ? platform.id : null;
}

interface Delivery {
  time: number;
  event: Event;
  intensity: number;
}

/**
 * A streamed cascade event: one "tick" per tick as it resolves (for live
 * on-screen rendering), then a final "done" carrying the full validated
 * Cascade. Consumed by the live SSE endpoint and by `runCascade` (batch path).
 */
export type StreamEvent =
  | {
      /** Emitted at the start of a tick: the nodes about to reason. The viz
       *  puts these into a "thinking" state (pulse) while the tick computes. */
      type: "tick-start";
      tick: number;
      active: { id: string; label: string }[];
    }
  | {
      /** Emitted the instant a node's tick call returns — its one-line reason.
       *  Streamed one-by-one so the live run shows continuous reasoning. */
      type: "node-acted";
      tick: number;
      nodeId: string;
      label: string;
      rationale: string;
      outgoing: number;
    }
  | {
      type: "tick";
      tick: Tick;
      snapshot: StateSnapshot;
      divergence: DivergencePoint;
    }
  | { type: "done"; cascade: Cascade };

/**
 * Run one cascade forward, **streaming each tick as it resolves**. This is the
 * foundation of the live demo: a consumer can render each tick the moment it
 * lands instead of waiting for the whole run.
 *
 * Deterministic: same `seed` + deterministic tickFn/edgeTransform → same cascade.
 */
export async function* runCascadeStream(
  world: World,
  seedActionId: string,
  deps: RunDeps,
  opts: RunOptions = {},
): AsyncGenerator<StreamEvent> {
  const { llm, tickFn, edgeTransform } = deps;
  const concurrency = opts.concurrency ?? 8;
  const maxTicks = opts.maxTicks ?? 40;
  const nextId = makeIdGen("e");

  const nodeMap = new Map<string, NodeDef>(world.nodes.map((n) => [n.id, n]));
  const nodeOrder = new Map<string, number>(
    world.nodes.map((n, i) => [n.id, i]),
  );

  // Per-node mutable state (deep-cloned so the world definition is untouched).
  const states = new Map<string, NodeState>();
  for (const n of world.nodes) states.set(n.id, structuredClone(n.initialState));

  // Edge lookup + each node's addressable neighbors (its out-edges).
  const edgeByPair = new Map<string, EdgeDef>();
  const outNeighbors = new Map<string, Neighbor[]>();
  for (const e of world.edges) {
    edgeByPair.set(`${e.source}->${e.target}`, e);
    const arr = outNeighbors.get(e.source) ?? [];
    arr.push({
      id: e.target,
      label: nodeMap.get(e.target)?.label ?? e.target,
      character: e.character,
    });
    outNeighbors.set(e.source, arr);
  }

  // Accumulating inboxes + incoming intensity + dedup set per node.
  const inbox = new Map<string, Event[]>();
  const intensity = new Map<string, number>();
  const seen = new Map<string, Set<string>>();
  const leaked = new Set<string>();

  const pending: Delivery[] = [];
  const schedule = (d: Delivery): void => {
    let i = pending.length;
    while (i > 0 && (pending[i - 1] as Delivery).time > d.time) i--;
    pending.splice(i, 0, d);
  };
  const deliver = (event: Event, inten: number): void => {
    const target = event.target;
    if (!nodeMap.has(target)) return;
    const s = seen.get(target) ?? new Set<string>();
    if (s.has(event.id)) return; // dedup — never deliver the same event twice
    s.add(event.id);
    seen.set(target, s);
    const box = inbox.get(target) ?? [];
    box.push(event);
    inbox.set(target, box);
    intensity.set(target, (intensity.get(target) ?? 0) + inten);
  };

  const eventDag: Event[] = [];
  const ticks: Tick[] = [];
  const stateTimeline: StateSnapshot[] = [];
  const divergence: DivergencePoint[] = [];

  // Inject the seed action.
  const seedAction = world.seeds.find((s) => s.id === seedActionId);
  if (!seedAction) throw new Error(`seed action not found: ${seedActionId}`);
  const seedEvents: Event[] = [];
  for (const target of seedAction.targets) {
    const ev: Event = {
      id: nextId(),
      type: "action",
      source: "world",
      target,
      channel: "seed",
      content: seedAction.payload,
      time: 0,
      causedBy: null,
      rationale: "Injected action.",
    };
    seedEvents.push(ev);
    eventDag.push(ev);
    schedule({ time: 0, event: ev, intensity: 1 });
  }

  let tickIndex = 0;
  let firstTick = true;

  while (pending.length > 0 && tickIndex < maxTicks) {
    const clock = (pending[0] as Delivery).time;

    // Variable time-stepping: process every delivery due at this instant.
    while (pending.length > 0 && (pending[0] as Delivery).time === clock) {
      const d = pending.shift() as Delivery;
      deliver(d.event, d.intensity);
    }

    // Which nodes act now: enough accumulated signal + attention left.
    const active: NodeDef[] = [];
    for (const [id, box] of inbox) {
      if (box.length === 0) continue;
      const node = nodeMap.get(id);
      if (!node) continue;
      const st = states.get(id) as NodeState;
      if (st.attentionBudget > 0 && (intensity.get(id) ?? 0) >= node.activationThreshold) {
        active.push(node);
      }
    }
    active.sort(
      (a, b) => (nodeOrder.get(a.id) ?? 0) - (nodeOrder.get(b.id) ?? 0),
    );

    if (active.length === 0 && !firstTick) {
      // A delivery landed but nobody crossed threshold; let signal accumulate.
      continue;
    }

    // Announce who's reasoning this tick (live "what" — the viz pulses them).
    yield {
      type: "tick-start",
      tick: tickIndex,
      active: active.map((n) => ({ id: n.id, label: n.label })),
    };

    // Fan out one tick call per active node, bounded by concurrency, and stream
    // each node's rationale the instant it returns (live "why"). Results are
    // collected in INPUT order so the cascade output stays deterministic
    // (stream == batch); only the live event ordering is completion-order.
    const outputs = new Array<{ node: NodeDef; box: Event[]; out: TickOutput }>(
      active.length,
    );
    for await (const { item: node, result: out, index } of mapStream(
      active,
      concurrency,
      (node) =>
        tickFn(
          {
            node,
            state: states.get(node.id) as NodeState,
            inbox: inbox.get(node.id) ?? [],
            clock,
            neighbors: outNeighbors.get(node.id) ?? [],
          },
          llm,
        ),
    )) {
      outputs[index] = { node, box: inbox.get(node.id) ?? [], out };
      yield {
        type: "node-acted",
        tick: tickIndex,
        nodeId: node.id,
        label: node.label,
        rationale: out.rationale,
        outgoing: out.outgoing.length,
      };
    }

    const tickEvents: Event[] = firstTick ? [...seedEvents] : [];
    const activeNodeIds: string[] = [];
    const snapStates: Record<string, NodeState> = {};

    for (const { node, box, out } of outputs) {
      const prev = states.get(node.id) as NodeState;
      const merged = applyDelta(prev, out.stateDelta);
      merged.active = true;
      merged.attentionBudget = Math.max(0, merged.attentionBudget - ATTENTION_COST);
      merged.history = [
        ...merged.history,
        ...box.map((e) => `${e.source}: ${e.content}`),
      ].slice(-8);
      states.set(node.id, merged);
      activeNodeIds.push(node.id);
      snapStates[node.id] = merged;

      const cause = box.length > 0 ? (box[box.length - 1] as Event).id : null;
      inbox.set(node.id, []);
      intensity.set(node.id, 0);

      // Emit + traverse edges.
      for (const raw of out.outgoing) {
        if (!nodeMap.has(raw.target)) continue;
        const edge =
          edgeByPair.get(`${node.id}->${raw.target}`) ??
          defaultEdge(node.id, raw.target);
        // Kernel is authoritative for id / source / time / causedBy (provenance).
        const ev: Event = {
          ...raw,
          id: nextId(),
          source: node.id,
          time: clock,
          causedBy: cause,
        };
        const transformed = await edgeTransform(
          ev,
          node,
          nodeMap.get(raw.target) as NodeDef,
          edge,
          llm,
        );
        if (!transformed) continue; // event died on this edge
        const out2: Event = {
          ...transformed,
          id: ev.id,
          source: node.id,
          target: raw.target,
          time: clock,
          causedBy: cause,
        };
        eventDag.push(out2);
        tickEvents.push(out2);
        schedule({
          time: clock + edgeDelay(edge.character),
          event: out2,
          intensity: edge.weight,
        });
      }

      // Emergent leak: strong private negativity under pressure surfaces
      // publicly. Threshold kept high so leaks are rare and dramatic.
      if (
        merged.mood.sentiment <= -0.6 &&
        merged.mood.urgency >= 0.5 &&
        !leaked.has(node.id)
      ) {
        leaked.add(node.id);
        const leakTarget = pickLeakTarget(world);
        if (leakTarget && leakTarget !== node.id) {
          const leakEv: Event = {
            id: nextId(),
            type: "emergent",
            source: node.id,
            target: leakTarget,
            channel: "blind",
            content: `Private frustration from ${node.label} surfaces anonymously.`,
            time: clock,
            causedBy: cause,
            rationale: "Private divergence grew too large and leaked.",
          };
          eventDag.push(leakEv);
          tickEvents.push(leakEv);
          schedule({ time: clock + 30, event: leakEv, intensity: 0.8 });
        }
      }
    }

    // Divergence proxy: nodes privately negative (drives the dual layer + leaks).
    let div = 0;
    for (const st of states.values()) if (st.mood.sentiment <= -0.4) div++;
    divergence.push({ tick: tickIndex, count: div });

    ticks.push({ clock, activeNodeIds, events: tickEvents });
    stateTimeline.push({ tick: tickIndex, states: snapStates });

    // Stream this tick to live consumers (SSE endpoint / viz).
    yield {
      type: "tick",
      tick: ticks[ticks.length - 1] as Tick,
      snapshot: stateTimeline[stateTimeline.length - 1] as StateSnapshot,
      divergence: divergence[divergence.length - 1] as DivergencePoint,
    };

    tickIndex++;
    firstTick = false;
    if (eventDag.length > 2000) break; // safety
  }

  const finalState: Record<string, NodeState> = {};
  for (const [id, st] of states) {
    st.active = false;
    finalState[id] = st;
  }

  const cascade: Cascade = {
    meta: {
      worldId: world.id,
      seedActionId,
      seed: opts.seed ?? 1,
      ...(opts.perturbation ? { perturbation: opts.perturbation } : {}),
    },
    ticks,
    eventDag,
    stateTimeline,
    divergence,
    finalState,
  };
  // Validate our own output against the contract before handing it on.
  const validated = CascadeSchema.parse(cascade);
  yield { type: "done", cascade: validated };
}

/**
 * Run a cascade to completion (batch path). Thin consumer of `runCascadeStream`
 * — the precompute, tests, and analysis use this; behaviour is unchanged.
 */
export async function runCascade(
  world: World,
  seedActionId: string,
  deps: RunDeps,
  opts: RunOptions = {},
): Promise<Cascade> {
  let cascade: Cascade | undefined;
  for await (const ev of runCascadeStream(world, seedActionId, deps, opts)) {
    if (ev.type === "done") cascade = ev.cascade;
  }
  if (!cascade) throw new Error("cascade produced no result");
  return cascade;
}
