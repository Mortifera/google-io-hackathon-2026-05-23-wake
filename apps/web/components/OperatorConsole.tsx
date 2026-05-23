"use client";

import type { World } from "@wake/contracts";
import type { Playback } from "../lib/usePlayback";
import { isLive } from "../lib/scenarios";
import type { LiveStatus } from "./Stage";
import s from "./stage.module.css";

interface Props {
  world: World;
  currentActionId: string;
  onSelect: (actionId: string) => void;
  pb: Playback;
  onEscape: () => void;
  onClose: () => void;
  onRunLive: () => void;
  liveStatus: LiveStatus;
  mode: "replay" | "live";
}

export default function OperatorConsole({
  world,
  currentActionId,
  onSelect,
  pb,
  onEscape,
  onClose,
  onRunLive,
  liveStatus,
  mode,
}: Props) {
  const labelOf = (id: string) =>
    world.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <>
      <div className={s.scrim} onClick={onClose} />
      <aside className={s.console} role="dialog" aria-label="Operator console">
        <div className={s.consoleHead}>
          <div className={s.consoleTitle}>
            Operator console <span className={s.kbd}>space · O</span>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={s.consoleScroll}>
          <div className={s.opSection}>Action menu · inject a seed</div>
          {world.seeds.map((seed, i) => {
            const live = isLive(seed.id);
            const active = seed.id === currentActionId;
            return (
              <button
                key={seed.id}
                className={s.action}
                data-active={active}
                data-live={live}
                disabled={!live}
                onClick={() => live && onSelect(seed.id)}
                title={live ? seed.payload : "Precompute pending"}
              >
                <span className={s.actionNum}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span className={s.actionLabel}>{seed.label}</span>
                  <span className={s.actionTargets}>
                    → {seed.targets.map(labelOf).join(", ")}
                  </span>
                  <span className={s.actionPayload}>{seed.payload}</span>
                </span>
                <span className={s.liveBadge} data-live={live}>
                  {live ? "Live" : "Pending"}
                </span>
              </button>
            );
          })}

          <div className={`${s.opSection} ${s.spaced}`}>Run mode</div>
          <button
            className={`${s.opAction} ${s.primary}`}
            style={{ width: "100%" }}
            onClick={onRunLive}
            disabled={liveStatus === "connecting" || liveStatus === "streaming"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {mode === "live"
              ? liveStatus === "streaming"
                ? "Streaming live…"
                : liveStatus === "connecting"
                  ? "Connecting…"
                  : "Run live (stream)"
              : "Run live (stream)"}
          </button>
          {mode === "live" ? (
            <div className={s.liveLine} data-status={liveStatus}>
              <span className={s.liveDot} />
              {liveStatus === "connecting"
                ? "opening stream…"
                : liveStatus === "streaming"
                  ? "streaming the simulation tick-by-tick (~110s full world)"
                  : liveStatus === "done"
                    ? "live run complete — scrub & ask why"
                    : "live"}
            </div>
          ) : liveStatus === "error" ? (
            <div className={s.liveLine} data-status="error">
              stream unavailable — fell back to the precomputed run
            </div>
          ) : null}

          <div className={s.opRow} style={{ marginTop: 10 }}>
            <button className={s.opAction} onClick={pb.restart}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z" />
              </svg>
              Replay precomputed
            </button>
            <button className={s.opAction} onClick={pb.toggle}>
              {pb.playing ? "Pause" : "Resume"}
            </button>
          </div>
          <button className={s.escape} onClick={onEscape}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2 3 7v6c0 5 3.8 8.5 9 9 5.2-.5 9-4 9-9V7zm-1 13-3.5-3.5 1.4-1.4L11 12.2l4.1-4.1 1.4 1.4z" />
            </svg>
            Escape hatch · jump to safe run
          </button>

          <div className={s.opTip}>
            <strong>Run live</strong> streams the kernel tick-by-tick; if it stalls
            or errors it auto-falls-back to the precomputed run (the escape hatch
            always works). Number keys select a <strong>Live</strong> scenario —
            Pending ones unlock when their cascade is precomputed. Also:{" "}
            <span className={s.kbd}>space</span> play/pause ·{" "}
            <span className={s.kbd}>←</span>/<span className={s.kbd}>→</span> step ·{" "}
            <span className={s.kbd}>O</span> console.
          </div>
        </div>
      </aside>
    </>
  );
}
