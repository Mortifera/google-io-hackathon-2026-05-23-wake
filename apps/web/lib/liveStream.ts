import type {
  Cascade,
  MonteCarloResult,
  StateSnapshot,
  Tick,
  World,
} from "@wake/contracts";

/** Divergence on the wire may be a bare count or a {tick,count} point. */
export type StreamDivergence = number | { tick: number; count: number };

/** A node about to think this tick. */
export interface ActiveNode {
  id: string;
  label: string;
}

/**
 * One Server-Sent Event from /api/stream-cascade (built by the kernel/streaming
 * worker). Additive protocol:
 *  - `tick-start`: the nodes about to think this tick (→ "thinking" state).
 *  - `node-acted`: one node's Gemini call returned (→ flash + stream rationale).
 *  - `tick`: the resolved tick — apply it like one replay step.
 *  - `done`: the terminal full cascade (for scrubbing + interp).
 */
export type StreamEvent =
  | { type: "tick-start"; tick: number; active: ActiveNode[] }
  | {
      type: "node-acted";
      tick: number;
      nodeId: string;
      label: string;
      rationale: string;
      outgoing: number;
    }
  | {
      type: "tick";
      tick: Tick;
      snapshot: StateSnapshot;
      divergence: StreamDivergence;
    }
  | { type: "done"; cascade: Cascade };

export interface LiveHandle {
  close: () => void;
}

interface Handlers {
  onTick: (
    tick: Tick,
    snapshot: StateSnapshot,
    divergence: StreamDivergence,
  ) => void;
  /** Nodes about to think this tick. */
  onTickStart?: (tick: number, active: ActiveNode[]) => void;
  /** One node's reasoning returned (fires one-by-one through a tick). */
  onNodeActed?: (
    tick: number,
    nodeId: string,
    label: string,
    rationale: string,
    outgoing: number,
  ) => void;
  onDone: (cascade: Cascade) => void;
  /** Connection error or stall — caller falls back to the precomputed run. */
  onError: () => void;
}

/**
 * Open a live cascade stream. Self-healing only in the sense that it guarantees
 * exactly one terminal outcome: `onDone` (clean finish) or `onError` (connect
 * failure or stall). A stall watchdog fires `onError` if no message arrives
 * within `stallMs`, so the UI can always fall back to the escape hatch.
 */
export function openCascadeStream(
  seed: string,
  handlers: Handlers,
  opts: { stallMs?: number } = {},
): LiveHandle {
  // Live generation is slow: the first tick (kernel warmup + Flash on the active
  // nodes) can take ~20s, and busy ticks longer. Keep-alive comments don't reach
  // onmessage, so the watchdog must clear the worst real inter-tick gap. The
  // operator can always hit the escape hatch sooner.
  const stallMs = opts.stallMs ?? 45_000;
  const es = new EventSource(
    `/api/stream-cascade?seed=${encodeURIComponent(seed)}`,
  );
  let closed = false;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    closed = true;
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = null;
    es.close();
  };
  const fail = () => {
    if (closed) return;
    cleanup();
    handlers.onError();
  };
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(fail, stallMs);
  };

  es.onopen = armStall;
  es.onmessage = (e: MessageEvent) => {
    if (closed) return;
    armStall();
    let msg: StreamEvent;
    try {
      msg = JSON.parse(e.data) as StreamEvent;
    } catch {
      return; // ignore malformed frames (e.g. keep-alive comments)
    }
    if (msg.type === "tick") {
      handlers.onTick(msg.tick, msg.snapshot, msg.divergence);
    } else if (msg.type === "tick-start") {
      handlers.onTickStart?.(msg.tick, msg.active);
    } else if (msg.type === "node-acted") {
      handlers.onNodeActed?.(
        msg.tick,
        msg.nodeId,
        msg.label,
        msg.rationale,
        msg.outgoing,
      );
    } else if (msg.type === "done") {
      handlers.onDone(msg.cascade);
      cleanup();
    }
  };
  // EventSource auto-reconnects on error; we don't want that — close + fall back.
  es.onerror = fail;
  armStall();

  return { close: cleanup };
}

/** A fresh, empty cascade to accumulate live ticks into. */
export function emptyCascade(worldId: string, seedActionId: string): Cascade {
  return {
    meta: { worldId, seedActionId, seed: 0 },
    ticks: [],
    eventDag: [],
    stateTimeline: [],
    divergence: [],
    finalState: {},
  };
}

/**
 * Open a live cascade stream for a bring-your-own world via POST. Uses
 * fetch() + ReadableStream because EventSource only supports GET. Parses the
 * same SSE protocol as the GET path so the same handlers work for both.
 */
export function openByoWorldStream(
  byoWorld: World,
  seed: string,
  handlers: Handlers,
  opts: { stallMs?: number } = {},
): LiveHandle {
  const stallMs = opts.stallMs ?? 45_000;
  let closed = false;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  const ctrl = new AbortController();

  const cleanup = () => {
    closed = true;
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = null;
    ctrl.abort();
  };
  const fail = () => {
    if (closed) return;
    cleanup();
    handlers.onError();
  };
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(fail, stallMs);
  };

  // Kick off the fetch in the background; parse the streaming SSE lines.
  void (async () => {
    armStall();
    try {
      const res = await fetch("/api/stream-cascade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ world: byoWorld, seed }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        fail();
        return;
      }
      armStall();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // SSE frames are separated by double-newline.
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (closed) break;
          armStall();
          // A chunk may be a keep-alive comment (": keep-alive") — ignore it.
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          let msg: StreamEvent;
          try {
            msg = JSON.parse(line.slice(5).trim()) as StreamEvent;
          } catch {
            continue;
          }
          if (msg.type === "tick") {
            handlers.onTick(msg.tick, msg.snapshot, msg.divergence);
          } else if (msg.type === "tick-start") {
            handlers.onTickStart?.(msg.tick, msg.active);
          } else if (msg.type === "node-acted") {
            handlers.onNodeActed?.(
              msg.tick,
              msg.nodeId,
              msg.label,
              msg.rationale,
              msg.outgoing,
            );
          } else if (msg.type === "done") {
            handlers.onDone(msg.cascade);
            cleanup();
            return;
          } else if ((msg as { type: string }).type === "error") {
            fail();
            return;
          }
        }
      }
      if (!closed) fail();
    } catch (err) {
      if ((err as Error).name !== "AbortError") fail();
    }
  })();

  return { close: cleanup };
}

export interface MonteCarloHandlers {
  /** Fires once per finished cascade — `done` counts completed, `total` is M. */
  onProgress: (done: number, total: number) => void;
  onResult: (result: MonteCarloResult) => void;
  onError: () => void;
}

/**
 * Start a Monte Carlo run via the Vercel Workflow route and consume its
 * newline-delimited JSON stream (progress chunks + a final result). Returns a
 * handle whose close() aborts the request. No EventSource — the workflow route
 * streams over a POST body, same shape as the BYO cascade reader.
 */
export function startMonteCarlo(
  world: World,
  seedId: string,
  variations: number,
  handlers: MonteCarloHandlers,
): LiveHandle {
  const ctrl = new AbortController();
  let done = 0;
  let closed = false;
  const cleanup = () => {
    closed = true;
    ctrl.abort();
  };

  void (async () => {
    try {
      const res = await fetch("/api/run-montecarlo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ world, seedId, variations }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        handlers.onError();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (!closed) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          let msg: { type: string; total?: number; result?: MonteCarloResult };
          try {
            msg = JSON.parse(t);
          } catch {
            continue;
          }
          if (msg.type === "progress") {
            done += 1;
            handlers.onProgress(done, msg.total ?? variations);
          } else if (msg.type === "result" && msg.result) {
            handlers.onResult(msg.result);
          } else if (msg.type === "error") {
            handlers.onError();
            return;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") handlers.onError();
    }
  })();

  return { close: cleanup };
}

/** Append one streamed tick to a growing cascade (immutably). */
export function appendTick(
  prev: Cascade,
  tick: Tick,
  snapshot: StateSnapshot,
  divergence: StreamDivergence,
): Cascade {
  const tickIndex = prev.ticks.length;
  const count = typeof divergence === "number" ? divergence : divergence?.count ?? 0;
  const dTick =
    typeof divergence === "number"
      ? snapshot.tick ?? tickIndex
      : divergence?.tick ?? snapshot.tick ?? tickIndex;
  return {
    ...prev,
    ticks: [...prev.ticks, tick],
    eventDag: [...prev.eventDag, ...tick.events],
    stateTimeline: [...prev.stateTimeline, snapshot],
    divergence: [...prev.divergence, { tick: dTick, count }],
  };
}
