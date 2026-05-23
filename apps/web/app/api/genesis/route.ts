/**
 * Genesis SSE route — streams build-progress events as the pipeline runs,
 * then delivers the assembled World + cast summary as a final "done" event.
 *
 * POST /api/genesis
 * Body: { scenario: string; budget?: number; ticks?: number }
 *
 * SSE events:
 *   { type: "step";  label: string; detail?: string }  — one per pipeline stage
 *   { type: "done";  world: World;  summary: Record<string, number> }
 *   { type: "error"; message: string }
 */
import { buildWorld } from "@genesis/pipeline";
import { RestGeminiLLM } from "@genesis/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

export async function POST(req: Request) {
  let scenario: string;
  let budget: number;
  let ticks: number;

  try {
    const body = (await req.json()) as { scenario?: string; budget?: unknown; ticks?: unknown };
    scenario = (body.scenario ?? "").trim();
    budget = Number(body.budget ?? 5);
    ticks = Number(body.ticks ?? 12);
    if (!scenario) throw new Error("scenario is required");
    if (!Number.isFinite(budget) || budget <= 0) budget = 5;
    if (!Number.isFinite(ticks) || ticks < 1) ticks = 12;
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!key) {
    return new Response(JSON.stringify({ error: "No Gemini API key configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;

      const send = (obj: unknown): void => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          open = false;
        }
      };

      const heartbeat = setInterval(() => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          open = false;
        }
      }, HEARTBEAT_MS);

      try {
        const llm = new RestGeminiLLM(key);
        const { world, summary } = await buildWorld(
          scenario,
          { budget, ticks },
          llm,
          (label: string, detail?: string) => {
            send({ type: "step", label, detail });
          },
        );
        send({ type: "done", world, summary });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[/api/genesis] failed:", msg);
        send({ type: "error", message: msg });
      } finally {
        clearInterval(heartbeat);
        open = false;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
