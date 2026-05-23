import { z } from "zod";
import { NodeStateSchema } from "./state";

/** Fidelity tier. 1 = full dossier, 2 = shared archetype, 3 = aggregate. */
export const TierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type Tier = z.infer<typeof TierSchema>;

/** Dominant function of a node (most nodes are hybrids; this picks the lead). */
export const NodeFunctionSchema = z.enum([
  "actor", // originates events
  "audience", // receives and reacts
  "channel", // propagates, often transforming
  "artifact", // accumulates state but does not act
]);
export type NodeFunction = z.infer<typeof NodeFunctionSchema>;

export const NodeDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  tier: TierSchema,
  fn: NodeFunctionSchema,
  /** Cached system-prompt material (~200 tokens): voice, positions, biases. */
  dossier: z.string(),
  initialState: NodeStateSchema,
  /** How much incoming signal it takes to make this node act. Controls depth. */
  activationThreshold: z.number().min(0),
});
export type NodeDef = z.infer<typeof NodeDefSchema>;

export const EdgeDefSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  direction: z.enum(["one-way", "two-way"]),
  weight: z.number(),
  /** Archetype key, e.g. "journalist->audience". Drives the transform. */
  character: z.string(),
  /** true = load-bearing LLM channel; false = deterministic light rule. */
  llmMediated: z.boolean(),
});
export type EdgeDef = z.infer<typeof EdgeDefSchema>;

/** A curated, injectable action (an item on the on-stage action menu). */
export const SeedActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Node ids the action is injected at. */
  targets: z.array(z.string()),
  /** The action content delivered to the seed node(s). */
  payload: z.string(),
});
export type SeedAction = z.infer<typeof SeedActionSchema>;

/** The static graph definition. Produced by `worlds/*`, consumed by the kernel. */
export const WorldSchema = z.object({
  id: z.string(),
  label: z.string(),
  nodes: z.array(NodeDefSchema),
  edges: z.array(EdgeDefSchema),
  seeds: z.array(SeedActionSchema),
});
export type World = z.infer<typeof WorldSchema>;
