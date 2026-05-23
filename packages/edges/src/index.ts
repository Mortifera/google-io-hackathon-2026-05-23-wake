import { z } from "zod";
import { EDGE_ARCHETYPES, type EdgeTransform, type Event } from "@wake/contracts";

export { EDGE_ARCHETYPES } from "@wake/contracts";

/**
 * What we ask the LLM to return when an event crosses a load-bearing edge: the
 * version of the message the recipient actually receives, or `drop` if it dies.
 */
const ModelEdgeOutputSchema = z.object({
  drop: z.boolean().default(false),
  content: z.string(),
  rationale: z.string().optional(),
});
export const EDGE_OUTPUT_SCHEMA = ModelEdgeOutputSchema;

// How each archetype distorts information. Matched by exact key first, then by
// substring of the edge's `character`, so worlds can use richer character names
// (e.g. "company->journalist") and still inherit sensible behaviour.
const ARCHETYPE_GUIDANCE: Record<string, string> = {
  "journalist->audience":
    "A journalist's published take reaching a wide audience. Sharpen the angle, " +
    "lead with what's striking, may sensationalize — but stay credible.",
  "employee->manager":
    "An employee's message filtered upward to a manager. Make it palatable and " +
    "hedged; soften bad news; frame to protect the sender's standing.",
  "customer->cohort":
    "A customer's sentiment spreading laterally through a cohort. Emotional, " +
    "fast, grievance-amplifying; shared frustrations get louder.",
  "competitor->strategy":
    "A market signal interpreted by a competitor's strategy function. Read it " +
    "for threats and openings; opportunistic and calculating.",
  "platform-amplification":
    "A platform amplifying a post. Reward the hottest, most polarizing framing; " +
    "flatten nuance; add momentum.",
  "friend->friend":
    "A lateral, trusted aside between peers. Low reach, high believability, " +
    "casual tone.",
  "company->journalist":
    "An official corporate message reaching a journalist. On-message and " +
    "polished; may understate problems.",
  "internal-leadership":
    "A message among leadership. Candid, strategic, sets direction.",
  "leadership->report":
    "A directive flowing from leadership down to a report. Authoritative; " +
    "establishes priorities and expectations.",
};
const DEFAULT_GUIDANCE =
  "Relay the message to the recipient, lightly adapting tone; preserve meaning.";

function guidanceFor(character: string): string {
  const exact = ARCHETYPE_GUIDANCE[character];
  if (exact) return exact;
  for (const key of Object.keys(ARCHETYPE_GUIDANCE)) {
    if (character.includes(key)) return ARCHETYPE_GUIDANCE[key] as string;
  }
  // also match on the bare archetype list (e.g. "journalist" inside a character)
  for (const a of EDGE_ARCHETYPES) {
    if (character.includes(a.split("->")[0] as string)) {
      return ARCHETYPE_GUIDANCE[a] ?? DEFAULT_GUIDANCE;
    }
  }
  return DEFAULT_GUIDANCE;
}

// Deterministic transforms for cheap (non-LLM) edges. Light edges mostly relay,
// with a touch of channel character; very weak edges drop the event.
function lightTransform(event: Event, character: string, weight: number): Event | null {
  if (weight < 0.25) return null; // too weak to carry
  if (character.includes("platform") || character.includes("amplif")) {
    return { ...event, content: `Trending — ${event.content}` };
  }
  if (character.includes("friend")) {
    return { ...event, content: `(heard from a friend) ${event.content}` };
  }
  return event;
}

/**
 * Per-edge behaviour: filter / distort / amplify / kill an event as it crosses
 * an edge. Load-bearing edges (`llmMediated`) get a Flash call per archetype;
 * light edges use deterministic rules. Returns `null` if the event dies here.
 * The kernel injects this and stays authoritative for id/source/time/causedBy.
 */
export const edgeTransform: EdgeTransform = async (
  event,
  source,
  target,
  edge,
  llm,
) => {
  if (!edge.llmMediated) {
    return lightTransform(event, edge.character, edge.weight);
  }

  const system = [
    "You are an information channel between two entities in a model of an",
    "organization's world. You decide what version of a message actually",
    "reaches the recipient as it travels this channel.",
    "",
    `Channel: ${edge.character}. ${guidanceFor(edge.character)}`,
    "",
    "Transform the message accordingly — filter, distort, amplify, sharpen, or",
    "soften it. If it simply would not travel this channel, set drop=true.",
    'Output JSON only: { "drop": boolean, "content": string, "rationale"?: string }',
  ].join("\n");

  const user = [
    `From: ${source.label} (${source.fn})`,
    `To: ${target.label} (${target.fn})`,
    `Original [${event.type}]: ${event.content}`,
    "Return the JSON object only.",
  ].join("\n");

  const { data } = await llm.complete<unknown>({
    system,
    user,
    schema: ModelEdgeOutputSchema,
    temperature: 0.6,
    cacheKey: `edge:${edge.character}`,
  });

  const model = ModelEdgeOutputSchema.parse(data);
  if (model.drop) return null;
  return {
    ...event,
    content: model.content,
    ...(model.rationale ? { rationale: model.rationale } : {}),
  };
};
