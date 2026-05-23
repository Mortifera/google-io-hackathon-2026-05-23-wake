"use client";

import { useCallback, useRef } from "react";
import type { CascadeModel } from "../lib/model";
import { resolveFrame } from "../lib/model";
import type { Playback } from "../lib/usePlayback";
import { withAlpha } from "../lib/palette";
import s from "./stage.module.css";

type Layer = "public" | "private";

interface Props {
  model: CascadeModel;
  pb: Playback;
  layer: Layer;
  setLayer: (l: Layer) => void;
}

const SPEEDS = [
  { label: "0.5×", v: 0.32 },
  { label: "1×", v: 0.62 },
  { label: "2×", v: 1.2 },
];

function fmtClock(min: number): string {
  if (min < 60) return `t+${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `t+${h}h ${m}m` : `t+${h}h`;
}

export default function Transport({ model, pb, layer, setLayer }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const last = pb.last;
  const frame = resolveFrame(model, pb.p);
  const frac = last > 0 ? pb.p / last : 0;
  const div = model.divergenceByTick[frame.tick] ?? 0;

  const seek = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      pb.setP(f * last);
    },
    [pb, last],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pb.pause();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      seek(e.clientX);
    },
    [pb, seek],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 1) seek(e.clientX);
    },
    [seek],
  );

  // divergence sparkline points
  const spark = model.divergenceByTick;
  const maxDiv = model.maxDivergence;
  const sw = 70;
  const sh = 22;
  const pts = spark
    .map((v, i) => {
      const x = (i / Math.max(1, spark.length - 1)) * sw;
      const y = sh - (v / maxDiv) * sh;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className={s.transport}>
      <div className={s.controls}>
        <button
          className={s.iconBtn}
          onClick={() => pb.setP(0)}
          title="Restart"
          aria-label="Restart"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>
        <button
          className={`${s.iconBtn} ${s.playBtn}`}
          onClick={pb.toggle}
          title={pb.playing ? "Pause" : "Play"}
          aria-label={pb.playing ? "Pause" : "Play"}
        >
          {pb.playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      <div className={s.clock}>
        <div className="mono">{fmtClock(frame.clock)}</div>
        <div className={`${s.small} mono`}>
          act {frame.act + 1} / {model.ticks.length}
        </div>
      </div>

      <div
        className={s.scrub}
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <div className={s.scrubTrack}>
          <div className={s.scrubFill} style={{ width: `${frac * 100}%` }} />
          {model.clocks.map((_, i) => (
            <div
              key={i}
              className={s.actMark}
              data-passed={i <= frame.p}
              style={{ left: `${(i / Math.max(1, last)) * 100}%` }}
            />
          ))}
          <div className={s.scrubHandle} style={{ left: `${frac * 100}%` }} />
        </div>
      </div>

      <div className={s.speed}>
        {SPEEDS.map((sp) => (
          <button
            key={sp.label}
            data-active={Math.abs(pb.speed - sp.v) < 0.01}
            onClick={() => pb.setSpeed(sp.v)}
          >
            {sp.label}
          </button>
        ))}
      </div>

      <div className={s.diverg} title="Public/private divergence — leak pressure">
        <svg width={sw} height={sh} style={{ overflow: "visible" }}>
          <polyline
            points={pts}
            fill="none"
            stroke={withAlpha("#ff5d8f", 0.85)}
            strokeWidth={1.6}
          />
          <polyline
            points={`0,${sh} ${pts} ${sw},${sh}`}
            fill={withAlpha("#ff5d8f", 0.1)}
            stroke="none"
          />
        </svg>
        <div className={s.divLabel}>
          leak
          <br />
          pressure
        </div>
        <div className={s.divCount} data-active={div > 0}>
          {div}
        </div>
      </div>

      <div className={s.layer} role="group" aria-label="Layer">
        <button
          data-kind="public"
          data-active={layer === "public"}
          aria-pressed={layer === "public"}
          onClick={() => setLayer("public")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
          </svg>
          Public
        </button>
        <button
          data-kind="private"
          data-active={layer === "private"}
          aria-pressed={layer === "private"}
          onClick={() => setLayer("private")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z" />
          </svg>
          Private
        </button>
      </div>
    </div>
  );
}
