import type { Cascade, StateSnapshot, Tick } from "@wake/contracts";

/** Divergence on the wire may be a bare count or a {tick,count} point. */
export type StreamDivergence = number | { tick: number; count: number };

/**
 * One Server-Sent Event from /api/stream-cascade (built by the kernel/streaming
 * worker). Either an incremental tick (apply it like one replay step) or the
 * terminal full cascade (for scrubbing + interp once the run completes).
 */
export type StreamEvent =
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
