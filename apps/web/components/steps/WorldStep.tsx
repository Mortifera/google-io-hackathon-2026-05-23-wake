"use client";

import { useMemo, useState } from "react";
import type { World } from "@wake/contracts";
import { planSizing, estCascadeCost, estGenCost } from "@genesis/budget";
import { useGenesis } from "../../lib/useGenesis";
import s from "../studio.module.css";

export interface PrebuiltWorld {
  id: string;
  label: string;
  description: string;
  world: World;
}

interface Props {
  prebuilt: PrebuiltWorld[];
  onPick: (world: World, source: "prebuilt" | "genesis") => void;
}

type Tab = "build" | "pick";

function liveEstimate(budget: number): { entities: number; cost: string } {
  const sizing = planSizing(budget, 12);
  const total = sizing.targetEntities;
  const cost = (estGenCost(total) + estCascadeCost(total, 12)).toFixed(2);
  return { entities: total, cost };
}

export default function WorldStep({ prebuilt, onPick }: Props) {
  const [tab, setTab] = useState<Tab>("build");
  const [scenario, setScenario] = useState("");
  const [budget, setBudget] = useState(3);
  const gen = useGenesis();
  const estimate = useMemo(() => liveEstimate(budget), [budget]);

  return (
    <div className={s.stepWrap}>
      <div className={s.stepKicker}>Step 1 · The world</div>
      <h1 className={s.stepTitle}>What world do you want to act on?</h1>
      <p className={s.stepSub}>
        Build a world from one sentence — the real cast, sized to a budget, every
        dossier written by Gemini. Or pick a prebuilt one to see how it works.
      </p>

      <div className={s.tabs}>
        <button
          className={`${s.tab} ${tab === "build" ? s.tabActive : ""}`}
          onClick={() => setTab("build")}
        >
          Build your own
        </button>
        <button
          className={`${s.tab} ${tab === "pick" ? s.tabActive : ""}`}
          onClick={() => setTab("pick")}
        >
          Pick one<span className={s.tabBadge}>for a quick look</span>
        </button>
      </div>

      {tab === "build" ? (
        <>
          <div className={s.genesisInputWrap}>
            <textarea
              className={s.genesisInput}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="What happens if Stripe acquires Plaid? — any company, any decision"
              disabled={gen.phase === "building"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  void gen.build(scenario, budget);
                }
              }}
            />
          </div>

          <div className={s.genesisControls}>
            <div className={s.budgetWrap}>
              <span className={s.budgetVal}>${budget.toFixed(2)}</span>
              <input
                type="range"
                className={s.slider}
                min={1}
                max={20}
                step={0.5}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                disabled={gen.phase === "building"}
              />
              <span className={s.estimate}>
                ~{estimate.entities} entities · ≈${estimate.cost}/run
              </span>
            </div>
            <button
              className={s.primary}
              onClick={() => void gen.build(scenario, budget)}
              disabled={!scenario.trim() || gen.phase === "building"}
            >
              {gen.phase === "building" ? "Building…" : "Build world →"}
            </button>
          </div>

          {(gen.phase === "building" || gen.phase === "done") && (
            <div className={s.genSteps}>
              {gen.steps.map((step, i) => {
                const active = i === gen.activeStepIdx;
                return (
                  <div
                    key={step.label}
                    className={[
                      s.genStep,
                      step.done ? s.genStepDone : "",
                      active ? s.genStepActive : "",
                    ].join(" ")}
                  >
                    <span className={s.genCheck}>
                      {step.done ? (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10.28 2.28 4.5 8.06 1.72 5.28a1 1 0 0 0-1.44 1.44l3.5 3.5a1 1 0 0 0 1.44 0l6.5-6.5a1 1 0 0 0-1.44-1.44Z" />
                        </svg>
                      ) : active ? (
                        <span className={s.genSpin} />
                      ) : null}
                    </span>
                    <span>{step.label}</span>
                    {step.detail && <span className={s.genDetail}>{step.detail}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {gen.phase === "error" && (
            <div className={s.errorBanner}>
              <strong>Build failed:</strong> {gen.errorMsg}
            </div>
          )}

          {gen.phase === "done" && gen.world && (
            <div className={s.footerNav}>
              <span className={s.runPlan}>
                <b>{gen.world.label || gen.world.id}</b> · {gen.world.nodes.length} nodes ·{" "}
                {gen.world.edges.length} edges
              </span>
              <button className={s.primary} onClick={() => onPick(gen.world!, "genesis")}>
                Use this world →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={s.worldGrid}>
          {prebuilt.map((p) => (
            <button
              key={p.id}
              className={s.worldCard}
              onClick={() => onPick(p.world, "prebuilt")}
            >
              <div className={s.worldCardName}>{p.label}</div>
              <div className={s.worldCardMeta}>
                {p.world.nodes.length} nodes · {p.world.edges.length} edges ·{" "}
                {p.world.seeds.length} actions
              </div>
              <div className={s.worldCardDesc}>{p.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
