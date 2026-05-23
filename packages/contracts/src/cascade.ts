import { z } from "zod";
import { EventSchema } from "./event";
import { NodeStateMapSchema } from "./state";

/** One step of (variable-length) simulated time. */
export const TickSchema = z.object({
  /** World-clock time at the start of this tick. */
  clock: z.number(),
  /** Nodes that acted this tick (for the propagation-wave animation). */
  activeNodeIds: z.array(z.string()),
  /** Events emitted during this tick. */
  events: z.array(EventSchema),
});
export type Tick = z.infer<typeof TickSchema>;

/** A snapshot of node states at a tick (for scrubbing and the dual layer). */
export const StateSnapshotSchema = z.object({
  tick: z.number(),
  /** May be a subset (only changed nodes); consumers carry forward. */
  states: NodeStateMapSchema,
});
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;

/** Public/private divergence count over time → leak triggers + the dual layer. */
export const DivergencePointSchema = z.object({
  tick: z.number(),
  count: z.number(),
});
export type DivergencePoint = z.infer<typeof DivergencePointSchema>;

export const CascadeMetaSchema = z.object({
  worldId: z.string(),
  seedActionId: z.string(),
  /** Deterministic seed for this run (enables reproducible branching). */
  seed: z.number(),
  /** Optional explicit perturbation applied to this run. */
  perturbation: z.record(z.string(), z.unknown()).optional(),
});
export type CascadeMeta = z.infer<typeof CascadeMetaSchema>;

/**
 * The output of one simulation run. THE seam between the kernel and the
 * viz / interpretability / analysis layers.
 */
export const CascadeSchema = z.object({
  meta: CascadeMetaSchema,
  ticks: z.array(TickSchema),
  /** Every event, with `causedBy` chains — the provenance DAG. */
  eventDag: z.array(EventSchema),
  /** Per-tick state snapshots for replay/scrub and the dual layer. */
  stateTimeline: z.array(StateSnapshotSchema),
  divergence: z.array(DivergencePointSchema),
  /** Final state of every node, used for Monte Carlo clustering. */
  finalState: NodeStateMapSchema,
});
export type Cascade = z.infer<typeof CascadeSchema>;
