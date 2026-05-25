"use client";

/**
 * Monte Carlo run (M > 1) — drives the Vercel Workflow route and renders the fan.
 * One action → one fan of futures. Two actions → A/B Monte Carlo (two fans, each
 * its own sweep on the same world). Progress streams in while the workflow runs.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { MonteCarloResult, SeedAction, World } from "@wake/contracts";
import { startMonteCarlo } from "../lib/liveStream";
import MonteCarloFan from "./MonteCarloFan";
import st from "./studio.module.css";

type Phase = "running" | "done" | "error";

function useMonteCarlo(world: World, action: SeedAction, variations: number) {
  const runWorld = useMemo<World>(() => ({ ...world, seeds: [action] }), [world, action]);
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const handle = startMonteCarlo(runWorld, action.id, variations, {
      onProgress: (d) => setDone(d),
      onResult: (r) => {
        setResult(r);
        setPhase("done");
      },
      onError: () => setPhase("error"),
    });
    return () => handle.close();
  }, [runWorld, action.id, variations]);

  return { done, phase, result };
}

function FanPanel({
  world,
  action,
  variations,
  letter,
}: {
  world: World;
  action: SeedAction;
  variations: number;
  letter: string | null;
}) {
  const { done, phase, result } = useMonteCarlo(world, action, variations);

  if (phase === "done" && result) {
    return <MonteCarloFan mc={result} />;
  }

  const pct = Math.round((done / variations) * 100);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      {phase === "error" ? (
        <>
          <div style={{ fontSize: 17, fontWeight: 600 }}>The run didn’t complete</div>
          <div style={{ fontSize: 13.5, color: "var(--text-dim)", maxWidth: 420 }}>
            The Monte Carlo workflow errored before finishing. This usually means the
            Gemini key is missing or invalid. Check the dev server logs and try again.
          </div>
        </>
      ) : (
        <>
          <div className={st.genSpin} style={{ width: 24, height: 24, borderWidth: 3 }} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {letter ? `Action ${letter}: ` : ""}Running {done} / {variations} futures…
          </div>
          <div
            style={{
              width: 280,
              height: 6,
              borderRadius: 6,
              background: "var(--surface-3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--accent)",
                transition: "width 0.3s var(--ease-out)",
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            each future is a full live cascade · clustering into outcomes
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  world: World;
  actions: SeedAction[];
  variations: number;
  onReconfigure: () => void;
}

export default function MonteCarloRun({ world, actions, variations, onReconfigure }: Props) {
  const multi = actions.length > 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Monte Carlo · {variations} futures{multi ? " · A/B" : ""} ·{" "}
          <span style={{ color: "var(--accent)" }}>{world.label || world.id}</span>
        </div>
        <button className={st.secondary} onClick={onReconfigure}>
          ← Reconfigure
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: multi ? "column" : "row",
        }}
      >
        {actions.map((a, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minHeight: multi ? 440 : 0,
              position: "relative",
              borderBottom: i === 0 && multi ? "1px solid var(--border)" : "none",
            }}
          >
            <FanPanel
              world={world}
              action={a}
              variations={variations}
              letter={multi ? (i === 0 ? "A" : "B") : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
