import { NextResponse } from "next/server";
import type { Cascade } from "@wake/contracts";
import { explain } from "@wake/interp";
import { GeminiLLMClient } from "@wake/llm";
import { scenarioFor } from "../../../lib/scenarios";

// Live interpretability: the real @wake/interp explain() over a Gemini Flash
// call, server-side so the API key never reaches the browser. The client uses
// the local DAG-trace text as an instant render and an automatic fallback, so
// this route is purely an enrichment: any failure (missing key, rate limit,
// bad JSON) returns non-200 and the UI keeps the templated answer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "no-key" }, { status: 503 });
  }

  let body: { seedActionId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "no-question" }, { status: 400 });
  }

  const cascade = scenarioFor(body.seedActionId ?? "").cascade as Cascade;

  try {
    const llm = new GeminiLLMClient();
    const result = await explain(cascade, question, llm);
    return NextResponse.json(result);
  } catch (err) {
    // Don't leak internals (or the key) to the client; just signal fallback.
    console.error("[/api/explain] live explain failed:", (err as Error)?.message);
    return NextResponse.json({ error: "explain-failed" }, { status: 502 });
  }
}
