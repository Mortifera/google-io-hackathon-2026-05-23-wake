import type { TickInput } from "@wake/contracts";

/**
 * System prompt = the node's cached identity (dossier) + its job + the output
 * contract. This is the cacheable half (keyed by node id) so the per-call cost
 * is just the user prompt below.
 */
export function buildSystemPrompt(input: TickInput): string {
  const { node } = input;
  return [
    `You are simulating a single entity in a model of an organization's world.`,
    ``,
    `## Who you are`,
    `Name: ${node.label}`,
    `Role: ${node.fn} (tier ${node.tier})`,
    `Dossier: ${node.dossier}`,
    ``,
    `## Your job each tick`,
    `You receive recent events (your inbox) and your current state. Decide, IN`,
    `CHARACTER, how you react. Stay true to the dossier — voice, biases, and`,
    `decision patterns. React to the *content* of events, not just that something`,
    `happened: ignore what wouldn't move you; act on what genuinely would.`,
    ``,
    `Distinguish what you SAY publicly (publicFace) from what you actually THINK`,
    `(privateInterior); they may diverge.`,
    ``,
    `Only emit events to the people/channels listed as your neighbors, and only`,
    `when you would really act. It is fine to emit nothing.`,
    ``,
    `## Output (JSON only)`,
    `{`,
    `  "beliefs": string?,            // updated compressed beliefs`,
    `  "publicFace": string?,         // what you'd say externally now`,
    `  "privateInterior": string?,    // what you actually think now`,
    `  "commitments": string[]?,      // things you've publicly committed to`,
    `  "mood": { "attention"?: 0..1, "sentiment"?: -1..1, "urgency"?: 0..1 }?,`,
    `  "outgoing": [ { "type": "public_post"|"private_message"|"decision"|"action",`,
    `                  "target": <neighbor id>, "content": string, "rationale"?: string } ],`,
    `  "rationale": string            // one first-person sentence: why you did this`,
    `}`,
  ].join("\n");
}

/** User prompt = the volatile per-tick inputs (state, inbox, neighbors, clock). */
export function buildUserPrompt(input: TickInput): string {
  const { state, inbox, neighbors, clock } = input;
  const inboxLines =
    inbox.length === 0
      ? "  (empty)"
      : inbox
          .map(
            (e) =>
              `  - [${e.type} via ${e.channel}] ${e.source}: ${e.content}`,
          )
          .join("\n");
  const neighborLines =
    neighbors.length === 0
      ? "  (none)"
      : neighbors
          .map((n) => `  - ${n.id} (${n.label}) — channel: ${n.character}`)
          .join("\n");
  return [
    `## World clock: ${clock}`,
    ``,
    `## Your current state`,
    `beliefs: ${state.beliefs}`,
    `mood: attention=${state.mood.attention}, sentiment=${state.mood.sentiment}, urgency=${state.mood.urgency}`,
    `publicFace: ${state.publicFace}`,
    `privateInterior: ${state.privateInterior}`,
    `commitments: ${state.commitments.join("; ") || "(none)"}`,
    ``,
    `## New events in your inbox`,
    inboxLines,
    ``,
    `## Whom you can address (pick targets only from here)`,
    neighborLines,
    ``,
    `Respond with the JSON object only.`,
  ].join("\n");
}
