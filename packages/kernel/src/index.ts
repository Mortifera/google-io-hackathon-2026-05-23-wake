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
  type EdgeTransform,
  type LLMClient,
  type Neighbor,
} from "@wake/contracts";
import { makeIdGen } from "@wake/util";
import { mapWithConcurrency } from "@wake/util";

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
 * Run one cascade forward. Returns a schema-valid `Cascade` (the seam consumed
 * by the viz, interp, and analysis layers).
 *
 * Deterministic: given the same `seed` and a deterministic `tickFn`/`edgeTransform`
 * (e.g. the MockLLMClient), the same cascade is produced every time — which is
 * what makes Monte Carlo branching reproducible.
 */
export async function runCascade(
  world: World,
  seedActionId: string,
  deps: RunDeps,
  opts: RunOptions = {},
): Promise<Cascade> {
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

    // Fan out one tick call per active node, bounded by concurrency.
    const outputs = await mapWithConcurrency(active, concurrency, async (node) => {
      const st = states.get(node.id) as NodeState;
      const box = inbox.get(node.id) ?? [];
      const out = await tickFn(
        {
          node,
          state: st,
          inbox: box,
          clock,
          neighbors: outNeighbors.get(node.id) ?? [],
        },
        llm,
      );
      return { node, box, out };
    });

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
  return CascadeSchema.parse(cascade);
}
