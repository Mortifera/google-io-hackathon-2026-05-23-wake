"use client";

import type { ReasoningItem } from "./Stage";
import type { LiveStatus } from "./Stage";
import s from "./stage.module.css";

interface Props {
  reasoning: ReasoningItem[];
  thinkingCount: number;
  /** Nodes that started thinking this tick (for the acted/total counter). */
  activeThisTick: number;
  liveStatus: LiveStatus;
  /** Affect colour for a node id (falls back to a neutral). */
  colorOf: (nodeId: string) => string;
}

/**
 * The live "watch the minds think" feed. While each tick's nodes run their Gemini
 * calls (~16s), `thinking` counts them down and returned rationales stream in
 * newest-first — turning the dead air into the demo's signature moment.
 */
export default function ReasoningFeed({
  reasoning,
  thinkingCount,
  activeThisTick,
  liveStatus,
  colorOf,
}: Props) {
  const acted = Math.max(0, activeThisTick - thinkingCount);
  return (
    <aside className={s.side}>
      <div className={s.panelHead}>
        <div className={s.feedHeadRow}>
          <div className={s.panelTitle}>Reasoning stream</div>
          {activeThisTick > 0 ? (
            <div className={s.panelTitle} style={{ color: "var(--text-dim)" }}>
              {acted} / {activeThisTick} nodes
            </div>
          ) : (
            <span className={s.liveTag} data-status={liveStatus}>
              <span className={s.liveDot} />
              {liveStatus === "connecting" ? "connecting" : "live"}
            </span>
          )}
        </div>
      </div>

      <div className={s.feedThinking}>
        {thinkingCount > 0 ? (
          <>
            <div className={s.feedThinkingCount}>
              {thinkingCount}
              <span className="label">thinking</span>
              <span className={s.thinkDots} aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </div>
            <div className={s.feedSub}>
              minds running their reasoning for this tick…
            </div>
          </>
        ) : (
          <div className={s.feedSub}>
            {liveStatus === "done"
              ? "run complete — every mind has spoken."
              : liveStatus === "connecting"
                ? "opening the stream…"
                : "listening for the next tick…"}
          </div>
        )}
      </div>

      <div className={s.feedList}>
        {reasoning.length === 0 ? (
          <div className={s.feedEmpty}>
            {liveStatus === "connecting"
              ? "The kernel is waking the world. The first minds will think in a moment…"
              : "As each node’s reasoning returns, it streams in here — newest first."}
          </div>
        ) : (
          reasoning.map((r) => (
            <div className={s.feedItem} key={r.key}>
              <span className={s.feedDot} style={{ background: colorOf(r.nodeId) }} />
              <div style={{ minWidth: 0 }}>
                <div className={s.feedNode}>
                  {r.label} <span className="verb">reasoned</span>
                </div>
                <div className={s.feedRationale}>“{r.rationale}”</div>
                <div className={s.feedMeta}>
                  <span className="mono">tick {r.tick}</span>
                  {r.outgoing > 0 ? (
                    <span>
                      → {r.outgoing} signal{r.outgoing === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span>held back</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
