"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Cascade, World } from "@wake/contracts";
import {
  buildCascadeModel,
  buildGraphModel,
  resolveFrame,
} from "../lib/model";
import {
  explainEvent,
  explainNode,
  shortHeadline,
  type ExplanationResult,
} from "../lib/explain";
import { appendTick, emptyCascade, openCascadeStream } from "../lib/liveStream";
import { usePlayback } from "../lib/usePlayback";
import { AFFECT_LEGEND, affectStyle } from "../lib/palette";
import { DEFAULT_ACTION_ID, isLive, scenarioFor } from "../lib/scenarios";
import GraphCanvas, { type TraceViz } from "./GraphCanvas";
import Transport from "./Transport";
import InspectorPanel, { type Focus } from "./InspectorPanel";
import MonteCarloFan from "./MonteCarloFan";
import OperatorConsole from "./OperatorConsole";
import ReasoningFeed from "./ReasoningFeed";
import s from "./stage.module.css";

interface ActiveTrace {
  exp: ExplanationResult;
  anchorId: string;
  nonce: number;
  /** Beat 1: a live Gemini call is in flight (show the "reasoning…" shimmer). */
  pending: boolean;
}

export interface ReasoningItem {
  key: string;
  nodeId: string;
  label: string;
  rationale: string;
  tick: number;
  outgoing: number;
}

type Layer = "public" | "private";
type View = "cascade" | "futures";
type RunMode = "replay" | "live";
export type LiveStatus = "idle" | "connecting" | "streaming" | "done" | "error";

interface Props {
  world: World;
}

const EVENT_PRIORITY: Record<string, number> = {
  emergent: 4,
  public_post: 3,
  action: 2,
  decision: 1,
  private_message: 0,
};

function fmtClock(min: number): string {
  if (min < 60) return `t+${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `t+${h}h ${m}m` : `t+${h}h`;
}

export default function Stage({ world }: Props) {
  const [actionId, setActionId] = useState(DEFAULT_ACTION_ID);
  const scenario = scenarioFor(actionId);
  const mc = scenario.mc;

  // Live streaming state. In live mode the active cascade is the growing
  // accumulator; the graph layout always comes from the (full) scenario cascade
  // + world, so node positions stay fixed while ticks stream in.
  const [mode, setMode] = useState<RunMode>("replay");
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("idle");
  const [liveCascade, setLiveCascade] = useState<Cascade | null>(null);
  // Stream lifecycle is owned by a single effect (StrictMode-safe). `streamOpen`
  // gates whether a connection should exist; `liveToken` forces a fresh run.
  const [streamOpen, setStreamOpen] = useState(false);
  const [liveToken, setLiveToken] = useState(0);
  const actionIdRef = useRef(actionId);
  actionIdRef.current = actionId;

  // Centerpiece: per-node live reasoning. `thinking` = nodes computing this tick;
  // `reasoning` = the streaming feed of returned rationales (newest first);
  // `flash` = the node that just acted (graph flash, nonce bumps each time).
  const [thinking, setThinking] = useState<Set<string>>(() => new Set());
  const [activeThisTick, setActiveThisTick] = useState(0);
  const [reasoning, setReasoning] = useState<ReasoningItem[]>([]);
  const [flash, setFlash] = useState<{ id: string; nonce: number } | null>(null);
  const flashSeq = useRef(0);

  const graph = useMemo(
    () => buildGraphModel(scenario.cascade, world),
    [scenario.cascade, world],
  );
  const activeCascade =
    mode === "live" && liveCascade ? liveCascade : scenario.cascade;
  const model = useMemo(
    () => buildCascadeModel(activeCascade, graph),
    [activeCascade, graph],
  );
  // Playback spans [0, nTicks] so the final act animates fully (see resolveFrame).
  const last = model.ticks.length;

  const pb = usePlayback(last);
  const { setP, play, pause } = pb;
  const [view, setView] = useState<View>("cascade");
  const [layer, setLayer] = useState<Layer>("public");
  const [focus, setFocus] = useState<Focus>({ kind: "none" });
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [trace, setTrace] = useState<ActiveTrace | null>(null);
  const nonceRef = useRef(0);
  // bump to (re)start the precomputed replay, even if scenario/mode are unchanged
  const [replayNonce, setReplayNonce] = useState(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const streamOpenRef = useRef(streamOpen);
  streamOpenRef.current = streamOpen;

  // Run the DAG trace-back and enter the cinematic "why" mode (pauses playback).
  // The local trace renders instantly; we then try to enrich the prose with the
  // live @wake/interp explain() via the API route, falling back silently.
  const runExplain = useCallback(
    (f: Focus) => {
      let exp: ExplanationResult | null = null;
      let anchorId = "";
      let question = "";
      if (f.kind === "node") {
        exp = explainNode(model, graph, f.id);
        anchorId = f.id;
        const label = graph.nodes.find((n) => n.id === f.id)?.label ?? f.id;
        const finalSt =
          model.resolvedStates[model.resolvedStates.length - 1]?.[f.id];
        const affect = finalSt ? affectStyle(finalSt).label.toLowerCase() : "";
        question = `Why did ${label} end up ${affect}?`.trim();
      } else if (f.kind === "event") {
        exp = explainEvent(model, graph, f.id);
        const ev = model.eventById.get(f.id);
        anchorId = ev?.target ?? "";
        question = ev ? `Why did this happen: "${ev.content}"?` : "";
      }
      if (!exp || !exp.chain.length) {
        setTrace(null);
        return;
      }
      nonceRef.current += 1;
      const myNonce = nonceRef.current;
      // Beat 1 (instant): the DAG trace renders now; if we'll try the live model,
      // mark pending so the prose shows a "Gemini is reasoning…" shimmer.
      setTrace({ exp, anchorId, nonce: myNonce, pending: !!question });
      pause();

      if (question) {
        fetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ seedActionId: actionId, question }),
        })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then(
            (live: {
              answer?: string;
              headline?: string;
              citedEventIds?: string[];
            }) => {
              setTrace((t) =>
                t && t.nonce === myNonce
                  ? live?.answer
                    ? {
                        ...t,
                        pending: false,
                        exp: {
                          ...t.exp,
                          answer: live.answer,
                          headline: live.headline ?? shortHeadline(live.answer),
                          citedEventIds: live.citedEventIds?.length
                            ? live.citedEventIds
                            : t.exp.citedEventIds,
                          source: "model",
                        },
                      }
                    : { ...t, pending: false } // keep templated trace
                  : t,
              );
            },
          )
          .catch(() => {
            // fall back to the templated trace (Beat 1 prose)
            setTrace((t) =>
              t && t.nonce === myNonce ? { ...t, pending: false } : t,
            );
          });
      }
    },
    [model, graph, pause, actionId],
  );

  // Clicking a node OR an event is a "why" gesture → trace it immediately (the
  // money-shot is one click on stage). Deselecting clears the trace. Nodes with
  // no upstream cause simply select without dimming.
  useEffect(() => {
    if (focus.kind === "node" || focus.kind === "event") runExplain(focus);
    else setTrace(null);
  }, [focus, runExplain]);

  // Pressing play exits the trace money-shot.
  useEffect(() => {
    if (pb.playing && trace) {
      setTrace(null);
      setFocus({ kind: "none" });
    }
  }, [pb.playing, trace]);

  // (re)start the precomputed replay: on mount, scenario change, and escape hatch.
  // Skips while a live run is in progress so we don't autoplay over the stream.
  useEffect(() => {
    if (modeRef.current === "live") return;
    setFocus({ kind: "none" });
    setP(0);
    const t = setTimeout(() => play(), 450);
    return () => clearTimeout(t);
  }, [replayNonce, actionId, setP, play]);

  // THE single source of truth for the SSE connection. Opening/closing happens
  // only here, so React (incl. StrictMode double-mount + Fast Refresh) guarantees
  // exactly one live connection, and its cleanup always closes the server run.
  useEffect(() => {
    if (!streamOpen) return;
    const handle = openCascadeStream(actionIdRef.current, {
      onTickStart: (_tick, active) => {
        setLiveStatus("streaming");
        setThinking(new Set(active.map((a) => a.id)));
        setActiveThisTick(active.length);
      },
      onNodeActed: (tick, nodeId, label, rationale, outgoing) => {
        flashSeq.current += 1;
        setFlash({ id: nodeId, nonce: flashSeq.current });
        setThinking((prev) => {
          const n = new Set(prev);
          n.delete(nodeId);
          return n;
        });
        setReasoning((prev) =>
          [
            { key: `${tick}-${nodeId}-${flashSeq.current}`, nodeId, label, rationale, tick, outgoing },
            ...prev,
          ].slice(0, 60),
        );
      },
      onTick: (tick, snapshot, divergence) => {
        setLiveStatus("streaming");
        setThinking(new Set());
        setLiveCascade((prev) =>
          prev ? appendTick(prev, tick, snapshot, divergence) : prev,
        );
      },
      onDone: (full) => {
        setLiveStatus("done");
        setThinking(new Set());
        setLiveCascade(full);
        setStreamOpen(false);
      },
      onError: () => {
        // stream failed/stalled → fall back to the precomputed run
        setLiveStatus("error");
        setStreamOpen(false);
        setMode("replay");
        setActionId(DEFAULT_ACTION_ID);
        setReplayNonce((n) => n + 1);
      },
    });
    return () => handle.close();
  }, [streamOpen, liveToken]);

  const startLive = useCallback(() => {
    setFocus({ kind: "none" });
    setView("cascade");
    setConsoleOpen(false);
    setLiveCascade(emptyCascade(world.id, actionIdRef.current));
    setThinking(new Set());
    setActiveThisTick(0);
    setReasoning([]);
    setFlash(null);
    setMode("live");
    setLiveStatus("connecting");
    setP(0);
    setStreamOpen(false); // ensure the lifecycle effect fully restarts
    setLiveToken((t) => t + 1);
    setStreamOpen(true);
  }, [world.id, setP]);

  // Stop the live stream (Pause during a live run) but keep the streamed-so-far
  // cascade frozen for scrubbing. Closing the connection aborts the server run.
  const stopLiveStream = useCallback(() => {
    setStreamOpen(false);
    setLiveStatus("done");
    setThinking(new Set());
    pause();
  }, [pause]);

  // Escape hatch / Replay / scenario select: close the stream + return to a
  // precomputed run. Closing the connection (streamOpen=false) aborts the server.
  const goReplay = useCallback((id: string) => {
    setStreamOpen(false);
    setMode("replay");
    setLiveCascade(null);
    setThinking(new Set());
    setActiveThisTick(0);
    setReasoning([]);
    setActionId(id);
    setView("cascade");
    setConsoleOpen(false);
    setReplayNonce((n) => n + 1);
  }, []);

  const selectAction = (id: string) => {
    if (!isLive(id)) return;
    goReplay(id);
  };
  const escapeHatch = () => goReplay(DEFAULT_ACTION_ID);

  // Play/pause that's live-aware: during a live run, "pause" aborts the stream.
  const togglePlay = useCallback(() => {
    if (streamOpen) stopLiveStream();
    else pb.toggle();
  }, [streamOpen, stopLiveStream, pb]);

  // Live mode: chase the streaming edge — each new tick extends `last`, so resume
  // playback toward it (idles when caught up, resumes when the next tick lands).
  useEffect(() => {
    if (mode === "live" && streamOpen && last > 0) play();
  }, [mode, streamOpen, last, play]);

  // Auto-clear the "stream unavailable" notice after a few seconds.
  useEffect(() => {
    if (liveStatus !== "error") return;
    const t = setTimeout(() => setLiveStatus("idle"), 5000);
    return () => clearTimeout(t);
  }, [liveStatus]);

  // keyboard transport + operator shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyO") {
        setConsoleOpen((v) => !v);
        return;
      }
      if (e.code === "Escape") {
        setFocus({ kind: "none" });
        setConsoleOpen(false);
        return;
      }
      // 1–5 inject the matching seed action (if precomputed)
      if (/^Digit[1-5]$/.test(e.code)) {
        const seed = world.seeds[Number(e.code.slice(5)) - 1];
        if (seed) selectAction(seed.id);
        return;
      }
      if (view !== "cascade") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (streamOpenRef.current) stopLiveStream();
        else pb.toggle();
      } else if (e.code === "ArrowRight") {
        setP(Math.min(last, Math.round(pb.pRef.current ?? 0) + 1));
      } else if (e.code === "ArrowLeft") {
        setP(Math.max(0, Math.round(pb.pRef.current ?? 0) - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pb, last, view, world]);

  // Affect colour for a node (latest known state) — drives the reasoning-feed dots.
  const colorOf = useCallback(
    (nodeId: string) => {
      const states = model.resolvedStates[model.resolvedStates.length - 1];
      const st = states?.[nodeId];
      return st ? affectStyle(st).color : "#5b9cf0";
    },
    [model],
  );

  const frame = resolveFrame(model, pb.p);
  const actEvents = model.ticks[frame.act]?.events ?? [];
  const salient =
    [...actEvents].sort(
      (a, b) => (EVENT_PRIORITY[b.type] ?? 0) - (EVENT_PRIORITY[a.type] ?? 0),
    )[0] ?? null;

  return (
    <div className={s.app}>
      <header className={s.topbar}>
        <div className={s.brand}>
          <span className={s.logo}>
            Wake<span className={s.dot}>.</span>
          </span>
          <span className={s.meta}>
            a world model for organizational action ·{" "}
            <span className={s.accent}>{model.worldId}</span> /{" "}
            <span className="mono">{model.seedActionId}</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mode === "live" ? (
            <span className={s.liveTag} data-status={liveStatus}>
              <span className={s.liveDot} />
              {liveStatus === "connecting"
                ? "LIVE · connecting…"
                : liveStatus === "streaming"
                  ? "LIVE · Gemini & Flash"
                  : liveStatus === "done"
                    ? "LIVE · complete"
                    : "LIVE"}
            </span>
          ) : liveStatus === "error" ? (
            <span className={s.fallbackTag}>stream unavailable — precomputed run</span>
          ) : null}
          <button
            className={s.opBtn}
            data-active={consoleOpen}
            onClick={() => setConsoleOpen((v) => !v)}
            title="Operator console (O)"
          >
            <span className={s.opDotLive} />
            Operator
          </button>
          <div className={s.switch}>
            <button
              data-active={view === "cascade"}
              onClick={() => setView("cascade")}
            >
              Cascade
            </button>
            <button
              data-active={view === "futures"}
              onClick={() => setView("futures")}
            >
              Futures
            </button>
          </div>
        </div>
      </header>

      {view === "cascade" ? (
        <>
          <div className={s.middle}>
            <div className={s.stage}>
              <GraphCanvas
                graph={graph}
                model={model}
                pRef={pb.pRef}
                layer={layer}
                selectedNodeId={focus.kind === "node" ? focus.id : null}
                onSelectNode={(id) =>
                  setFocus(id ? { kind: "node", id } : { kind: "none" })
                }
                trace={
                  trace
                    ? { chain: trace.exp.chain, anchorId: trace.anchorId, nonce: trace.nonce }
                    : null
                }
                thinking={mode === "live" ? thinking : undefined}
                flash={mode === "live" ? flash : null}
              />

              <div className={s.layerTint} data-layer={layer} />

              {trace ? (
                <div className={s.caption} key={`trace-${trace.nonce}`}>
                  <div className={s.captionKicker}>Causal trace</div>
                  <div className={s.captionText}>{trace.exp.headline}</div>
                </div>
              ) : salient ? (
                <div className={s.caption} key={`${actionId}-${frame.act}`}>
                  <div className={s.captionKicker}>
                    Act {frame.act + 1} · {fmtClock(frame.clock)}
                  </div>
                  <div className={s.captionText}>{salient.content}</div>
                </div>
              ) : null}

              <div className={s.legend}>
                {AFFECT_LEGEND.map((a) => (
                  <div className={s.legendItem} key={a.affect}>
                    <span className={s.swatch} style={{ background: a.color }} />
                    {a.label}
                  </div>
                ))}
              </div>

              {consoleOpen ? (
                <OperatorConsole
                  world={world}
                  currentActionId={actionId}
                  onSelect={selectAction}
                  pb={pb}
                  onEscape={escapeHatch}
                  onClose={() => setConsoleOpen(false)}
                  onRunLive={startLive}
                  liveStatus={liveStatus}
                  mode={mode}
                />
              ) : null}
            </div>

            {mode === "live" ? (
              <ReasoningFeed
                reasoning={reasoning}
                thinkingCount={thinking.size}
                activeThisTick={activeThisTick}
                liveStatus={liveStatus}
                colorOf={colorOf}
              />
            ) : (
              <InspectorPanel
                graph={graph}
                model={model}
                p={pb.p}
                layer={layer}
                focus={focus}
                setFocus={setFocus}
                explanation={trace?.exp ?? null}
                explanationPending={trace?.pending ?? false}
                onAskWhy={() => runExplain(focus)}
              />
            )}
          </div>

          <Transport
            model={model}
            pb={pb}
            layer={layer}
            setLayer={setLayer}
            onTogglePlay={togglePlay}
          />
        </>
      ) : mc ? (
        <MonteCarloFan mc={mc} />
      ) : (
        <div className={s.middle}>
          <div className={s.stage}>
            <div className={s.empty} style={{ padding: 40, maxWidth: 460 }}>
              Monte Carlo analysis hasn’t been computed for{" "}
              <strong>{model.seedActionId}</strong> yet. Run the analysis pass to
              populate the fan of futures.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
