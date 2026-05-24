import { WorldSchema } from "@wake/contracts";
import { runCascadeStream } from "@wake/kernel";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { GeminiLLMClient } from "@wake/llm";
import worldJson from "@worlds/notion/world.json";

// Live cascade as Server-Sent Events: the kernel streams one `tick` StreamEvent
// per resolved tick (so the viz animates the cascade as it happens), then a
// final `done` carrying the full Cascade. Runs server-side so the Gemini key
// never reaches the browser (same env pattern as /api/explain). Any failure
// emits a final `{type:"error"}` so the client can fall back to the precomputed
// cascade fixture and the demo never hard-fails on stage.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate the committed world once at module load (it's a known-good fixture).
const world = WorldSchema.parse(worldJson);

const HEARTBEAT_MS = 10_000;

export function GET(req: Request) {
  const seed = new URL(req.url).searchParams.get("seed") ?? "acquisition";
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (chunk: string): void => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false; // controller already closed (client disconnected)
        }
      };
      // SSE comment line keeps proxies/connection alive between ticks.
      const heartbeat = setInterval(() => send(`: keep-alive\n\n`), HEARTBEAT_MS);

      try {
        if (!key) throw new Error("no Gemini API key configured");
        const llm = new GeminiLLMClient();

        for await (const ev of runCascadeStream(
          world,
          seed,
          { llm, tickFn, edgeTransform },
          { concurrency: 6, maxTicks: 12 },
        )) {
          send(`data: ${JSON.stringify(ev)}\n\n`);
          if (ev.type === "done") break;
          // Client navigated away — stop spending Flash calls on a dead stream.
          if (req.signal.aborted || !open) break;
        }
      } catch (err) {
        // Don't leak internals/the key; just signal the client to fall back.
        console.error(
          "[/api/stream-cascade] failed:",
          (err as Error)?.message ?? err,
        );
        send(`data: ${JSON.stringify({ type: "error" })}\n\n`);
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
      // Disable proxy buffering so ticks flush immediately.
      "x-accel-buffering": "no",
    },
  });
}

// ── POST: bring-your-own-world ─────────────────────────────────────────────
// Accepts { world: World, seed: string } in the request body. Validates the
// world with WorldSchema (400 on failure), then streams a live cascade exactly
// like the GET path. The same SSE protocol: tick-start → node-acted → tick →
// done. Client reads via fetch() + ReadableStream (EventSource is GET-only).
export async function POST(req: Request) {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = WorldSchema.safeParse((body as Record<string, unknown>)?.world);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "world failed WorldSchema validation", issues: parsed.error.issues }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const uploadedWorld = parsed.data;
  const seed = String((body as Record<string, unknown>)?.seed ?? uploadedWorld.seeds[0]?.id ?? "");

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (chunk: string): void => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false;
        }
      };
      const heartbeat = setInterval(() => send(`: keep-alive\n\n`), HEARTBEAT_MS);

      try {
        if (!key) throw new Error("no Gemini API key configured");
        const llm = new GeminiLLMClient();

        for await (const ev of runCascadeStream(
          uploadedWorld,
          seed,
          { llm, tickFn, edgeTransform },
          { concurrency: 6, maxTicks: 12 },
        )) {
          send(`data: ${JSON.stringify(ev)}\n\n`);
          if (ev.type === "done") break;
          if (req.signal.aborted || !open) break;
        }
      } catch (err) {
        console.error(
          "[/api/stream-cascade POST] failed:",
          (err as Error)?.message ?? err,
        );
        send(`data: ${JSON.stringify({ type: "error" })}\n\n`);
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
