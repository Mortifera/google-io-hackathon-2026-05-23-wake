"use client";

import { useEffect, useMemo, useState } from "react";
import type { World } from "@wake/contracts";
import {
  buildCascadeModel,
  buildGraphModel,
  resolveFrame,
} from "../lib/model";
import { usePlayback } from "../lib/usePlayback";
import { AFFECT_LEGEND } from "../lib/palette";
import { DEFAULT_ACTION_ID, isLive, scenarioFor } from "../lib/scenarios";
import GraphCanvas from "./GraphCanvas";
import Transport from "./Transport";
import InspectorPanel, { type Focus } from "./InspectorPanel";
import MonteCarloFan from "./MonteCarloFan";
import OperatorConsole from "./OperatorConsole";
import s from "./stage.module.css";

type Layer = "public" | "private";
type View = "cascade" | "futures";

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
  const cascade = scenario.cascade;
  const mc = scenario.mc;

  const graph = useMemo(() => buildGraphModel(cascade, world), [cascade, world]);
  const model = useMemo(() => buildCascadeModel(cascade, graph), [cascade, graph]);
  // Playback spans [0, nTicks] so the final act animates fully (see resolveFrame).
  const last = model.ticks.length;

  const pb = usePlayback(last);
  const { setP, play } = pb;
  const [view, setView] = useState<View>("cascade");
  const [layer, setLayer] = useState<Layer>("public");
  const [focus, setFocus] = useState<Focus>({ kind: "none" });
  const [consoleOpen, setConsoleOpen] = useState(false);

  // autoplay on mount and whenever the scenario changes (the cinematic open)
  useEffect(() => {
    setFocus({ kind: "none" });
    setP(0);
    const t = setTimeout(() => play(), 550);
    return () => clearTimeout(t);
  }, [actionId, setP, play]);

  const selectAction = (id: string) => {
    if (!isLive(id)) return;
    setActionId(id);
    setView("cascade");
    setConsoleOpen(false);
  };
  const escapeHatch = () => {
    setActionId(DEFAULT_ACTION_ID);
    setView("cascade");
    setConsoleOpen(false);
    setP(0);
    play();
  };

  // keyboard transport + operator shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyO") {
        setConsoleOpen((v) => !v);
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
        pb.toggle();
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
              />

              {salient ? (
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
                />
              ) : null}
            </div>

            <InspectorPanel
              graph={graph}
              model={model}
              p={pb.p}
              layer={layer}
              focus={focus}
              setFocus={setFocus}
            />
          </div>

          <Transport model={model} pb={pb} layer={layer} setLayer={setLayer} />
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
