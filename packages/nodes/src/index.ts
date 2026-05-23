import { z } from "zod";
import {
  EventTypeSchema,
  TickOutputSchema,
  type TickFn,
  type TickOutput,
  type Event,
} from "@wake/contracts";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";

export { buildSystemPrompt, buildUserPrompt } from "./prompt";

/**
 * What we ask the model to return. Looser than TickOutput: the model names the
 * target/type/content of each outgoing event, and the kernel fills in the
 * authoritative id / source / time / causedBy (provenance). State fields are all
 * optional — the node only reports what changed.
 */
const ModelEventSchema = z.object({
  type: EventTypeSchema,
  target: z.string(),
  channel: z.string().optional(),
  content: z.string(),
  rationale: z.string().optional(),
});

const ModelTickOutputSchema = z.object({
  beliefs: z.string().optional(),
  publicFace: z.string().optional(),
  privateInterior: z.string().optional(),
  commitments: z.array(z.string()).optional(),
  mood: z
    .object({
      attention: z.number().min(0).max(1),
      sentiment: z.number().min(-1).max(1),
      urgency: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
  outgoing: z.array(ModelEventSchema).default([]),
  rationale: z.string(),
});

/** The zod schema the LLM client should turn into structured-output instructions. */
export const NODE_OUTPUT_SCHEMA = ModelTickOutputSchema;

/**
 * Per-node behaviour: one Flash call turning (dossier, state, inbox, neighbors,
 * clock) into (stateDelta, outgoing events, rationale). The kernel injects this.
 */
export const tickFn: TickFn = async (input, llm) => {
  const { node, state, clock, neighbors } = input;

  const { data } = await llm.complete<unknown>({
    system: buildSystemPrompt(input),
    user: buildUserPrompt(input),
    schema: ModelTickOutputSchema,
    temperature: 0.7,
    cacheKey: node.id,
  });

  const model = ModelTickOutputSchema.parse(data);

  const channelFor = new Map(neighbors.map((n) => [n.id, n.character]));
  const outgoing: Event[] = model.outgoing.map((o) => ({
    id: "", // kernel assigns
    type: o.type,
    source: node.id,
    target: o.target,
    channel: o.channel ?? channelFor.get(o.target) ?? "direct",
    content: o.content,
    time: clock, // kernel re-asserts
    causedBy: null, // kernel assigns
    ...(o.rationale ? { rationale: o.rationale } : {}),
  }));

  const stateDelta: TickOutput["stateDelta"] = {
    ...(model.beliefs !== undefined ? { beliefs: model.beliefs } : {}),
    ...(model.publicFace !== undefined ? { publicFace: model.publicFace } : {}),
    ...(model.privateInterior !== undefined
      ? { privateInterior: model.privateInterior }
      : {}),
    ...(model.commitments !== undefined
      ? { commitments: model.commitments }
      : {}),
    // mood is all-or-nothing in the schema, so merge partial onto current mood
    ...(model.mood !== undefined
      ? { mood: { ...state.mood, ...model.mood } }
      : {}),
  };

  return TickOutputSchema.parse({
    stateDelta,
    outgoing,
    rationale: model.rationale,
  });
};
