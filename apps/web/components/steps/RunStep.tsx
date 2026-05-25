"use client";

import { useMemo } from "react";
import type { World } from "@wake/contracts";
import Stage from "../Stage";
import ABRun from "../ABRun";
import type { RunConfig } from "../Studio";
import s from "../studio.module.css";

interface Props {
  config: RunConfig;
  onReconfigure: () => void;
}

export default function RunStep({ config, onReconfigure }: Props) {
  const { world, actions, variations } = config;

  // Run world = the chosen world with its seeds replaced by the configured
  // action(s), so a custom payload travels through the kernel under its own id.
  const runWorld = useMemo<World>(
    () => ({ ...world, seeds: actions }),
    [world, actions],
  );

  const n = actions.length;

  // Monte Carlo (M > 1) — Vercel Workflow path lands in Phase 4.
  if (variations > 1) {
    return (
      <div className={s.placeholder}>
        <div className={s.placeholderTitle}>
          {n === 2 ? `A/B × ${variations} futures` : `${variations} futures`}
        </div>
        <p>The Monte Carlo run (Vercel Workflow) is being wired up next.</p>
        <button className={s.secondary} onClick={onReconfigure}>
          ← Change the run
        </button>
      </div>
    );
  }

  // A/B (two actions, single run each) — live side-by-side.
  if (n === 2) {
    return <ABRun world={world} actions={actions} onReconfigure={onReconfigure} />;
  }

  // Single live cascade (1 × 1) — the existing Stage console, prop-driven.
  const seedId = actions[0]?.id ?? runWorld.seeds[0]?.id ?? "";
  return (
    <Stage
      world={runWorld}
      studio={{ seedId, autoRunLive: true, onReconfigure }}
    />
  );
}
