import { z } from "zod";
import type { Explain } from "@wake/contracts";
import { relevantSubgraph } from "./trace";

export { relevantSubgraph, focusEvents, ancestorChain, tokenize } from "./trace";

/** What we ask the model to return for a "why" question. */
const ModelExplainSchema = z.object({
  answer: z.string(),
  citedEventIds: z.array(z.string()).default([]),
});
export const EXPLAIN_OUTPUT_SCHEMA = ModelExplainSchema;

/**
 * Answer a "why did X happen" question by tracing the cascade DAG and narrating
 * the cause. We assemble the relevant upstream chain (events that mention the
 * question + everything that caused them), hand it to one Flash call, and return
 * a grounded paragraph plus the cited event ids (filtered to ids that really
 * exist in the DAG). Consumes the frozen Cascade contract — no kernel dependency.
 */
export const explain: Explain = async (cascade, question, llm) => {
  const sub = relevantSubgraph(cascade, question);
  const dagIds = new Set(cascade.eventDag.map((e) => e.id));

  const context = sub
    .map(
      (e) =>
        `${e.id} | t${e.time} | ${e.type} | ${e.source} -> ${e.target} | ` +
        `${e.content}${e.rationale ? ` | (${e.rationale})` : ""}`,
    )
    .join("\n");

  const system = [
    "You explain why something happened in a simulated cascade of events.",
    "You are given the relevant chain of events, each with an id and (via the",
    "ordering) what led to it. Answer the user's question in ONE grounded",
    "paragraph that traces the causal chain. Cite the specific upstream event",
    "ids you relied on; only cite ids that appear in the provided chain.",
    'Output JSON only: { "answer": string, "citedEventIds": string[] }',
  ].join("\n");

  const user = [
    `Question: ${question}`,
    "",
    "Relevant events (upstream first):",
    context,
    "",
    "Return the JSON object only.",
  ].join("\n");

  const { data } = await llm.complete<unknown>({
    system,
    user,
    schema: ModelExplainSchema,
    temperature: 0.3,
    cacheKey: "interp",
  });

  const model = ModelExplainSchema.parse(data);
  const cited = model.citedEventIds.filter((id) => dagIds.has(id));
  // If the model cited nothing valid, fall back to the proximate chain.
  const citedEventIds =
    cited.length > 0 ? cited : sub.slice(-3).map((e) => e.id);

  return { answer: model.answer, citedEventIds };
};
