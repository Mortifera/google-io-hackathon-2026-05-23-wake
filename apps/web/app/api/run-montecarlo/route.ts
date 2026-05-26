import { start } from "workflow/api";
import { WorldSchema } from "@wake/contracts";
import { monteCarloWorkflow } from "../../../workflows/monte-carlo";

// Monte Carlo from the web: start the durable workflow and stream its default
// writable (newline-delimited JSON: {type:"progress",total} per finished cascade,
// then {type:"result",result}) straight back to the client. Stateless — the
// workflow run holds the state; we pass the world in and pipe the result out.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  const { world, seedId, variations } = (body ?? {}) as {
    world?: unknown;
    seedId?: string;
    variations?: number;
  };

  const parsed = WorldSchema.safeParse(world);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid world" }), { status: 400 });
  }
  const seed = String(seedId ?? parsed.data.seeds[0]?.id ?? "");
  if (!seed) {
    return new Response(JSON.stringify({ error: "no seed action" }), { status: 400 });
  }
  // Bound the run: 2–24 cascades (Gemini Tier-1 + latency).
  const m = Math.max(2, Math.min(24, Math.round(Number(variations) || 12)));
  // Allow an offline mock run (no key) via {mock:true} or WAKE_LLM=mock.
  const mock =
    Boolean((body as { mock?: unknown }).mock) || process.env.WAKE_LLM === "mock";
  // BYO key (per request) — transits the workflow run's event log (local
  // .workflow-data in dev); used only for this run, never persisted by us.
  const apiKeyRaw = (body as { apiKey?: unknown }).apiKey;
  const apiKey = typeof apiKeyRaw === "string" ? apiKeyRaw.trim() : "";

  const run = await start(monteCarloWorkflow, [
    parsed.data,
    seed,
    m,
    mock ? "mock" : "gemini",
    apiKey,
  ]);

  return new Response(run.readable as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
