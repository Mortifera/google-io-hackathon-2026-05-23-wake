"use client";

/**
 * Live A/B — the 2×1 run: two actions on the SAME world, streamed side by side.
 * Each panel opens its own BYO cascade stream and renders the graph as it fills,
 * then shows aggregate outcome stats once the run completes. Distinct from the
 * precomputed ABTesting demo (which compares two fixed Notion framings).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Cascade, SeedAction, World } from "@wake/contracts";
import { buildCascadeModel, buildGraphModel } from "../lib/model";
import { appendTick, emptyCascade, openByoWorldStream } from "../lib/liveStream";
import GraphCanvas from "./GraphCanvas";
import ab from "./ab.module.css";
import st from "./studio.module.css";

type RunStatus = "connecting" | "streaming" | "done" | "error";
type FinalState = Record<string, { mood?: { sentiment?: number } }>;

function meanSentiment(fs: FinalState): number {
  const vals = Object.values(fs).map((s) => s.mood?.sentiment ?? 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
function countNeg(fs: FinalState, t = -0.5): number {
  return Object.values(fs).filter((s) => (s.mood?.sentiment ?? 0) <= t).length;
}
function countPos(fs: FinalState, t = 0.2): number {
  return Object.values(fs).filter((s) => (s.mood?.sentiment ?? 0) >= t).length;
}
function outcomeLabel(mean: number, neg: number): { label: string; color: string } {
  if (mean > 0.05 && neg <= 4) return { label: "Muted positive", color: "var(--cluster-a)" };
  if (mean < -0.15 && neg >= 8) return { label: "Consumer backlash", color: "var(--cluster-b)" };
  if (mean < -0.05 && neg >= 5) return { label: "Mixed / cautious", color: "var(--alarmed)" };
  return { label: "Guarded", color: "var(--accent-sky)" };
}

/** Open one BYO cascade stream and accumulate it. */
function useLiveCascade(world: World, action: SeedAction) {
  const runWorld = useMemo<World>(() => ({ ...world, seeds: [action] }), [world, action]);
  const [cascade, setCascade] = useState<Cascade>(() => emptyCascade(world.id, action.id));
  const [status, setStatus] = useState<RunStatus>("connecting");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const handle = openByoWorldStream(runWorld, action.id, {
      onTick: (t, s, d) => {
        setStatus("streaming");
        setCascade((prev) => appendTick(prev, t, s, d));
      },
      onDone: (full) => {
        setStatus("done");
        setCascade(full);
      },
      onError: () => setStatus("error"),
    });
    return () => handle.close();
  }, [runWorld, action.id]);

  return { cascade, status, runWorld };
}

function VariantPanel({
  world,
  action,
  letter,
}: {
  world: World;
  action: SeedAction;
  letter: string;
}) {
  const { cascade, status, runWorld } = useLiveCascade(world, action);
  const graph = useMemo(() => buildGraphModel(cascade, runWorld), [cascade, runWorld]);
  const model = useMemo(() => buildCascadeModel(cascade, graph), [cascade, graph]);
  const pRef = useRef(0);
  pRef.current = model.ticks.length;

  const fs = cascade.finalState as FinalState;
  const total = Object.keys(fs).length;
  const pos = countPos(fs);
  const neg = countNeg(fs);
  const mean = meanSentiment(fs);
  const outcome = outcomeLabel(mean, neg);
  const pct = (x: number) => (total > 0 ? Math.round((x / total) * 100) : 0);

  return (
    <div className={ab.variantCard} style={{ cursor: "default" }}>
      <div className={ab.variantHeader}>
        <div className={ab.variantLetter}>{letter}</div>
        <div>
          <div className={ab.variantName}>{action.label}</div>
          <div className={ab.variantDesc}>
            {action.payload.length > 120 ? action.payload.slice(0, 117) + "…" : action.payload}
          </div>
        </div>
      </div>

      <div className={ab.miniGraph}>
        <GraphCanvas
          graph={graph}
          model={model}
          pRef={pRef}
          layer="public"
          selectedNodeId={null}
          onSelectNode={() => {}}
          trace={null}
        />
      </div>

      {status !== "done" ? (
        <div className={st.runCost} data-status={status}>
          {status === "connecting"
            ? "opening stream…"
            : status === "streaming"
              ? `streaming · ${cascade.ticks.length} ticks`
              : "stream unavailable"}
        </div>
      ) : (
        <>
          <div className={ab.variantStats}>
            <div className={ab.statCol}>
              <div className={ab.statVal} style={{ color: "var(--cluster-a)" }}>{pct(pos)}%</div>
              <div className={ab.statKey}>positive</div>
            </div>
            <div className={ab.statCol}>
              <div className={ab.statVal} style={{ color: "var(--alarmed)" }}>{pct(total - pos - neg)}%</div>
              <div className={ab.statKey}>neutral</div>
            </div>
            <div className={ab.statCol}>
              <div className={ab.statVal} style={{ color: "var(--cluster-b)" }}>{pct(neg)}%</div>
              <div className={ab.statKey}>negative</div>
            </div>
          </div>
          <div
            className={ab.outcomeTag}
            style={{ color: outcome.color, borderColor: `color-mix(in srgb, ${outcome.color} 40%, transparent)` }}
          >
            {outcome.label} · mean {mean >= 0 ? "+" : ""}{mean.toFixed(2)}
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  world: World;
  actions: SeedAction[];
  onReconfigure: () => void;
}

export default function ABRun({ world, actions, onReconfigure }: Props) {
  const [a, b] = actions;
  return (
    <div className={ab.root}>
      <div
        className={ab.header}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}
      >
        <div>
          <div className={ab.kicker}>A/B · two actions · {world.label || world.id}</div>
          <div className={ab.title}>Same world, two decisions</div>
          <div className={ab.sub}>
            Both actions run live on the same world. Compare where each one lands —
            the system is non-deterministic, so this is one sample of each.
          </div>
        </div>
        <button className={st.secondary} onClick={onReconfigure}>
          ← Reconfigure
        </button>
      </div>

      <div className={ab.variantGrid}>
        {a && <VariantPanel world={world} action={a} letter="A" />}
        {b && <VariantPanel world={world} action={b} letter="B" />}
      </div>
    </div>
  );
}
