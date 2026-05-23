import type {
  Cascade,
  Event,
  NodeFunction,
  NodeState,
  NodeStateMap,
  Tier,
  World,
} from "@wake/contracts";

/* ------------------------------------------------------------------ *
 * View models.
 *
 * The viz is driven entirely by the fixture JSON. A `Cascade` carries the
 * dynamics (events, state timeline, divergence) but not the static graph
 * shape (labels, tiers, edges) — that lives in the `World`. We merge the two
 * here. Everything degrades gracefully: if no World is supplied (e.g. a future
 * cascade from a world we don't have loaded) the graph is reconstructed from
 * the event stream alone.
 * ------------------------------------------------------------------ */

export interface GraphNode {
  id: string;
  label: string;
  tier: Tier;
  fn: NodeFunction;
  dossier?: string;
  initialState?: NodeState;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  character: string;
  llmMediated: boolean;
  direction: "one-way" | "two-way";
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Turn an id like "prod-twitter" into "Prod Twitter" when no label exists. */
function humanize(id: string): string {
  return id
    .split(/[-_]/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** A neutral fallback state for nodes the timeline hasn't snapshotted yet. */
function defaultState(): NodeState {
  return {
    beliefs: "",
    mood: { attention: 0.2, sentiment: 0, urgency: 0.1 },
    publicFace: "",
    privateInterior: "",
    history: [],
    commitments: [],
    attentionBudget: 1,
    active: false,
  };
}

export function buildGraphModel(cascade: Cascade, world?: World): GraphModel {
  const nodeById = new Map<string, GraphNode>();

  if (world) {
    for (const n of world.nodes) {
      nodeById.set(n.id, {
        id: n.id,
        label: n.label,
        tier: n.tier,
        fn: n.fn,
        dossier: n.dossier,
        initialState: n.initialState,
      });
    }
  }

  // Ensure every node referenced by the cascade exists (skip the synthetic
  // "world" seed origin, which is rendered off-graph).
  const ensure = (id: string) => {
    if (id === "world" || nodeById.has(id)) return;
    nodeById.set(id, { id, label: humanize(id), tier: 2, fn: "actor" });
  };
  for (const id of Object.keys(cascade.finalState)) ensure(id);
  for (const e of cascade.eventDag) {
    ensure(e.source);
    ensure(e.target);
  }

  const edgeById = new Map<string, GraphEdge>();
  if (world) {
    for (const e of world.edges) {
      edgeById.set(e.id, {
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight,
        character: e.character,
        llmMediated: e.llmMediated,
        direction: e.direction,
      });
    }
  } else {
    // No world: synthesize edges from observed event hops.
    for (const e of cascade.eventDag) {
      if (e.source === "world" || e.source === e.target) continue;
      const id = `${e.source}->${e.target}`;
      if (!edgeById.has(id)) {
        edgeById.set(id, {
          id,
          source: e.source,
          target: e.target,
          weight: 0.6,
          character: e.channel,
          llmMediated: true,
          direction: "one-way",
        });
      }
    }
  }

  return {
    nodes: [...nodeById.values()],
    edges: [...edgeById.values()],
  };
}

/* ------------------------------------------------------------------ *
 * Cascade model — resolved, per-tick state + indexes for fast lookup.
 * ------------------------------------------------------------------ */

export interface CascadeModel {
  worldId: string;
  seedActionId: string;
  ticks: Cascade["ticks"];
  /** ticks[i].clock — the world-clock value at each tick. */
  clocks: number[];
  /** Full resolved NodeStateMap at each tick index (carry-forward applied). */
  resolvedStates: NodeStateMap[];
  /** Divergence count at each tick index. */
  divergenceByTick: number[];
  maxDivergence: number;
  eventDag: Event[];
  eventById: Map<string, Event>;
}

export function buildCascadeModel(
  cascade: Cascade,
  graph: GraphModel,
): CascadeModel {
  const nTicks = cascade.ticks.length;
  const clocks = cascade.ticks.map((t) => t.clock);

  // Seed the running state from world initial states (or defaults).
  const running: NodeStateMap = {};
  for (const n of graph.nodes) {
    running[n.id] = structuredClone(n.initialState ?? defaultState());
  }

  // Index snapshots by tick index.
  const snapsByTick = new Map<number, NodeStateMap>();
  for (const snap of cascade.stateTimeline) snapsByTick.set(snap.tick, snap.states);

  const resolvedStates: NodeStateMap[] = [];
  for (let k = 0; k < nTicks; k++) {
    const snap = snapsByTick.get(k);
    if (snap) {
      for (const [id, st] of Object.entries(snap)) {
        running[id] = structuredClone(st);
      }
    }
    resolvedStates.push(structuredClone(running));
  }
  // Overlay the explicit finalState onto the last tick — it is the canonical
  // end-of-run state for every node and is richer than the sparse timeline.
  if (nTicks > 0) {
    for (const [id, st] of Object.entries(cascade.finalState)) {
      resolvedStates[nTicks - 1][id] = structuredClone(st);
    }
  }

  const divByTick = new Array<number>(nTicks).fill(0);
  for (const d of cascade.divergence) {
    if (d.tick >= 0 && d.tick < nTicks) divByTick[d.tick] = d.count;
  }
  // carry forward divergence so it never visually resets between sparse points
  for (let k = 1; k < nTicks; k++) {
    if (cascade.divergence.every((d) => d.tick !== k)) divByTick[k] = divByTick[k - 1];
  }

  const eventById = new Map<string, Event>();
  for (const e of cascade.eventDag) eventById.set(e.id, e);

  return {
    worldId: cascade.meta.worldId,
    seedActionId: cascade.meta.seedActionId,
    ticks: cascade.ticks,
    clocks,
    resolvedStates,
    divergenceByTick: divByTick,
    maxDivergence: Math.max(1, ...divByTick),
    eventDag: cascade.eventDag,
    eventById,
  };
}

/* ------------------------------------------------------------------ *
 * Playback resolution.
 * Playback position `p` runs across tick indices [0, nTicks-1]; the fractional
 * part is the eased "act sub-progress" used to animate the current tick's
 * events. We expose both the discrete tick (for text) and an interpolated
 * world clock (for the readout).
 * ------------------------------------------------------------------ */

export interface PlaybackFrame {
  /** Continuous position in [0, nTicks-1]. */
  p: number;
  /** Current "act" (tick index whose events are animating). */
  act: number;
  /** Eased progress within the act, 0..1. */
  sub: number;
  /** Nearest tick index, used for textual state. */
  tick: number;
  /** Interpolated world clock. */
  clock: number;
}

export function resolveFrame(model: CascadeModel, p: number): PlaybackFrame {
  // Playback runs across [0, nTicks] so every act — including the last — gets
  // its full [i, i+1) animation window; p === nTicks parks on the final frame
  // with the last act fully played.
  const nTicks = model.ticks.length;
  const lastIdx = Math.max(0, nTicks - 1);
  const clamped = Math.max(0, Math.min(nTicks, p));
  const act = Math.min(lastIdx, Math.floor(clamped));
  const sub = Math.min(1, clamped - act);
  const tick = Math.min(lastIdx, Math.round(clamped));
  const c0 = model.clocks[act] ?? 0;
  const c1 = model.clocks[Math.min(lastIdx, act + 1)] ?? c0;
  return { p: clamped, act, sub, tick, clock: c0 + (c1 - c0) * sub };
}
