import type { CompleteArgs } from "@wake/contracts";

/**
 * A deterministic, offline responder for MockLLMClient that understands the real
 * node and edge prompts (from @wake/nodes / @wake/edges). It lets us run the
 * full kernel + nodes + edges pipeline with no API spend — for the integration
 * test and for `run:cascade` smoke runs. The output is mechanical (not
 * believable); believable cascades come from real Gemini.
 */
export function cannedResponder(args: CompleteArgs): unknown {
  // Edge transform call (see @wake/edges buildable system prompt).
  if (args.system.includes("information channel")) {
    const m = args.user.match(/Original \[[^\]]+\]:\s*(.*)$/m);
    return {
      drop: false,
      content: m?.[1] ?? "(relayed)",
      rationale: "relayed",
    };
  }

  // Node tick call: react to each neighbor. Re-emission is bounded by the
  // kernel's attention-budget saturation, so always emitting is safe here.
  const ids = extractNeighborIds(args.user);
  const outgoing = ids.map((id) => ({
    type: "public_post" as const,
    target: id,
    content: `reaction routed to ${id}`,
  }));
  return {
    beliefs: "updated from inbox",
    mood: { sentiment: -0.3, urgency: 0.5 },
    publicFace: "measured public line",
    privateInterior: "privately uneasy",
    outgoing,
    rationale: "reacting to the inbox",
  };
}

function extractNeighborIds(user: string): string[] {
  const section = user.split("Whom you can address")[1] ?? "";
  const ids: string[] = [];
  const re = /-\s+([a-z0-9][a-z0-9-]*)\s+\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    if (m[1]) ids.push(m[1]);
  }
  return ids;
}
