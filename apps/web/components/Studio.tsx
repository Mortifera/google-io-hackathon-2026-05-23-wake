"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SeedAction, World } from "@wake/contracts";
import WorldStep, { type PrebuiltWorld } from "./steps/WorldStep";
import ActionStep from "./steps/ActionStep";
import RunStep from "./steps/RunStep";
import s from "./studio.module.css";

export type { PrebuiltWorld };

type StepId = "world" | "action" | "run";
const STEP_ORDER: StepId[] = ["world", "action", "run"];
const STEP_LABELS: Record<StepId, string> = {
  world: "World",
  action: "Action",
  run: "Run",
};

/** The full run configuration the Studio assembles, then hands to RunStep. */
export interface RunConfig {
  world: World;
  /** 1 action = single/Monte-Carlo; 2 actions = A/B (each across `variations`). */
  actions: SeedAction[];
  /** Runs per action. 1 = a single live cascade; >1 = a Monte Carlo fan. */
  variations: number;
}

interface Props {
  prebuilt: PrebuiltWorld[];
}

const DRAFT_KEY = "wake-studio-draft";

interface Draft {
  step: StepId;
  world: World | null;
  source: "prebuilt" | "genesis" | null;
  actions: SeedAction[];
  variations: number;
}

const EMPTY: Draft = {
  step: "world",
  world: null,
  source: null,
  actions: [],
  variations: 1,
};

export default function Studio({ prebuilt }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const { step, world, actions, variations } = draft;

  // Hydrate a draft from sessionStorage so a refresh mid-flow survives (no DB).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        // Never resume directly into the run step — re-confirm from action.
        setDraft({ ...parsed, step: parsed.step === "run" ? "action" : parsed.step });
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on every change (best-effort; worlds can be ~1MB).
  useEffect(() => {
    try {
      if (draft.world) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* quota or serialization — non-fatal */
    }
  }, [draft]);

  const goto = useCallback((stepId: StepId) => {
    setDraft((d) => ({ ...d, step: stepId }));
  }, []);

  const onPickWorld = useCallback(
    (w: World, source: "prebuilt" | "genesis") => {
      setDraft((d) => ({
        ...d,
        world: w,
        source,
        // Default the first action to the world's first seed.
        actions: w.seeds[0] ? [w.seeds[0]] : [],
        step: "action",
      }));
    },
    [],
  );

  const onConfigureRun = useCallback((cfg: { actions: SeedAction[]; variations: number }) => {
    setDraft((d) => ({ ...d, actions: cfg.actions, variations: cfg.variations, step: "run" }));
  }, []);

  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className={s.root}>
      {step !== "run" && (
        <div className={s.bar}>
          <Link href="/" className={s.brand}>
            Wake<span className={s.dot}>.</span>
          </Link>
          <div className={s.steps}>
            {STEP_ORDER.map((sid, i) => {
              const reached = i <= stepIdx;
              const canGo = i < stepIdx && (sid === "world" || world);
              return (
                <span key={sid} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {i > 0 && <span className={s.stepSep}>·</span>}
                  <span
                    className={[
                      s.step,
                      i === stepIdx ? s.stepActive : "",
                      i < stepIdx ? s.stepDone : "",
                      canGo ? s.stepClickable : "",
                    ].join(" ")}
                    onClick={canGo ? () => goto(sid) : undefined}
                  >
                    <span className={s.stepNum}>{i < stepIdx ? "✓" : i + 1}</span>
                    {STEP_LABELS[sid]}
                  </span>
                </span>
              );
            })}
          </div>
          <div className={s.barRight}>
            <Link href="/genesis" className={s.barLink}>
              /genesis
            </Link>
          </div>
        </div>
      )}

      {step === "world" && (
        <div className={s.body}>
          <WorldStep prebuilt={prebuilt} onPick={onPickWorld} />
        </div>
      )}

      {step === "action" && world && (
        <div className={s.body}>
          <ActionStep
            world={world}
            initialActions={actions}
            initialVariations={variations}
            onBack={() => goto("world")}
            onRun={onConfigureRun}
          />
        </div>
      )}

      {step === "run" && world && (
        <div className={s.runBody}>
          <RunStep
            config={{ world, actions, variations }}
            onReconfigure={() => goto("action")}
          />
        </div>
      )}
    </div>
  );
}
