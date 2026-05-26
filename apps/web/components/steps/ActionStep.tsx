"use client";

import { useMemo, useState } from "react";
import type { SeedAction, World } from "@wake/contracts";
import { estCascadeCost } from "@genesis/budget";
import s from "../studio.module.css";

interface Props {
  world: World;
  initialActions: SeedAction[];
  initialVariations: number;
  onBack: () => void;
  onRun: (cfg: { actions: SeedAction[]; variations: number }) => void;
}

const VAR_OPTIONS = [
  {
    m: 1,
    name: "Single run",
    desc: "One live cascade — watch every node think, tick by tick.",
  },
  {
    m: 12,
    name: "Monte Carlo · 12",
    desc: "Twelve futures, clustered into outcomes with a pivotal variable.",
  },
  {
    m: 24,
    name: "Monte Carlo · 24",
    desc: "A denser fan — more runs, sharper clusters.",
  },
];

/** Targets summarised as node labels, for the read-only "enters at" line. */
function entersAt(world: World, targets: string[]): string {
  const labels = targets.map((id) => world.nodes.find((n) => n.id === id)?.label ?? id);
  return labels.join(", ") || "—";
}

export default function ActionStep({
  world,
  initialActions,
  initialVariations,
  onBack,
  onRun,
}: Props) {
  const [actions, setActions] = useState<SeedAction[]>(
    initialActions.length ? initialActions : world.seeds[0] ? [world.seeds[0]] : [],
  );
  const [variations, setVariations] = useState(initialVariations || 1);

  const setAction = (idx: number, patch: Partial<SeedAction>) => {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const rebaseAction = (idx: number, seedId: string) => {
    const seed = world.seeds.find((sd) => sd.id === seedId);
    if (!seed) return;
    // Keep a unique id for the B slot so two actions never collide.
    const id = idx === 0 ? seed.id : `${seed.id}-b`;
    setAction(idx, { id, label: seed.label, payload: seed.payload, targets: seed.targets });
  };

  const addAction = () => {
    const base = world.seeds[0];
    if (!base || actions.length >= 2) return;
    setActions((prev) => [
      ...prev,
      { id: `${base.id}-b`, label: base.label, payload: base.payload, targets: base.targets },
    ]);
  };

  const removeAction = (idx: number) => {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  };

  const n = actions.length;
  const cost = useMemo(
    () => (estCascadeCost(world.nodes.length, 12) * n * variations).toFixed(2),
    [world.nodes.length, n, variations],
  );

  const plan = useMemo(() => {
    if (n === 2 && variations > 1)
      return { btn: `Run A/B × ${variations}`, desc: `two actions, each across ${variations} futures` };
    if (n === 2) return { btn: "Run A/B", desc: "two live cascades, side by side" };
    if (variations > 1)
      return { btn: `Run ${variations} futures`, desc: "a Monte Carlo fan of outcomes" };
    return { btn: "Run once", desc: "a single live cascade" };
  }, [n, variations]);

  const canRun = n >= 1 && actions.every((a) => a.payload.trim().length > 0);

  return (
    <div className={s.stepWrap}>
      <div className={s.stepKicker}>Step 2 · The action</div>
      <h1 className={s.stepTitle}>What are you putting into the world?</h1>
      <p className={s.stepSub}>
        Describe the action and where it enters. Add a second to A/B two decisions,
        and choose how many futures to run — the system is non-deterministic, so more
        runs map the distribution.
      </p>

      {actions.map((a, idx) => (
        <div className={s.actionCard} key={idx}>
          <div className={s.actionCardHead}>
            <span className={s.actionLetter}>{idx === 0 ? "A" : "B"}</span>
            {n > 1 && (
              <button className={s.removeBtn} onClick={() => removeAction(idx)}>
                Remove
              </button>
            )}
          </div>

          <div className={s.fieldLabel}>Base it on a seed action</div>
          <select
            className={s.seedSelect}
            value={world.seeds.find((sd) => sd.id === a.id || `${sd.id}-b` === a.id)?.id ?? ""}
            onChange={(e) => rebaseAction(idx, e.target.value)}
          >
            {world.seeds.map((sd) => (
              <option key={sd.id} value={sd.id}>
                {sd.label}
              </option>
            ))}
          </select>

          <div className={s.fieldLabel}>The action</div>
          <textarea
            className={s.actionText}
            value={a.payload}
            onChange={(e) => setAction(idx, { payload: e.target.value })}
            placeholder="Describe the action as an established fact…"
          />
          <div className={s.estimate}>enters at: {entersAt(world, a.targets)}</div>
        </div>
      ))}

      <button className={s.addAction} onClick={addAction} disabled={n >= 2}>
        + Compare a second action (A/B)
      </button>

      <div className={s.varRow}>
        <div className={s.fieldLabel}>How many futures?</div>
        <div className={s.varOptions}>
          {VAR_OPTIONS.map((opt) => (
            <button
              key={opt.m}
              className={`${s.varOption} ${variations === opt.m ? s.varOptionActive : ""}`}
              onClick={() => setVariations(opt.m)}
            >
              <div className={s.varOptName}>{opt.name}</div>
              <div className={s.varOptDesc}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={s.runBar}>
        <div>
          <div className={s.runPlan}>
            <b>{plan.btn}</b> — {plan.desc}
          </div>
          <div className={s.runCost}>
            {n} action{n > 1 ? "s" : ""} × {variations} run{variations > 1 ? "s" : ""} ·
            {" "}≈ ${cost} on Gemini Flash
          </div>
        </div>
        <button className={s.primary} disabled={!canRun} onClick={() => onRun({ actions, variations })}>
          {plan.btn} →
        </button>
      </div>

      <div className={s.footerNav}>
        <button className={s.secondary} onClick={onBack}>
          ← Back to world
        </button>
      </div>
    </div>
  );
}
