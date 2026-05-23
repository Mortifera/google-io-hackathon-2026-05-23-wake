"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Cascade, MonteCarloResult, World } from "@wake/contracts";
import {
  buildCascadeModel,
  buildGraphModel,
  resolveFrame,
} from "../lib/model";
import { usePlayback } from "../lib/usePlayback";
import { AFFECT_LEGEND } from "../lib/palette";
import GraphCanvas from "./GraphCanvas";
import Transport from "./Transport";
import InspectorPanel, { type Focus } from "./InspectorPanel";
import MonteCarloFan from "./MonteCarloFan";
import s from "./stage.module.css";

type Layer = "public" | "private";
type View = "cascade" | "futures";

interface Props {
  cascade: Cascade;
  mc: MonteCarloResult;
  world?: World;
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

export default function Stage({ cascade, mc, world }: Props) {
  const graph = useMemo(() => buildGraphModel(cascade, world), [cascade, world]);
  const model = useMemo(() => buildCascadeModel(cascade, graph), [cascade, graph]);
  // Playback spans [0, nTicks] so the final act animates fully (see resolveFrame).
  const last = model.ticks.length;

  const pb = usePlayback(last);
  const [view, setView] = useState<View>("cascade");
  const [layer, setLayer] = useState<Layer>("public");
  const [focus, setFocus] = useState<Focus>({ kind: "none" });

  // autoplay once, after first paint, for the cinematic open
  const didAuto = useRef(false);
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    const t = setTimeout(() => pb.play(), 650);
    return () => clearTimeout(t);
  }, [pb]);

  // keyboard transport
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "cascade") return;
      if (e.code === "Space") {
        e.preventDefault();
        pb.toggle();
      } else if (e.code === "ArrowRight") {
        pb.setP(Math.min(last, Math.round(pb.pRef.current ?? 0) + 1));
      } else if (e.code === "ArrowLeft") {
        pb.setP(Math.max(0, Math.round(pb.pRef.current ?? 0) - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pb, last, view]);

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
                <div className={s.caption} key={frame.act}>
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
      ) : (
        <MonteCarloFan mc={mc} />
      )}
    </div>
  );
}
