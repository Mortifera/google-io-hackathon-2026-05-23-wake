"use client";

import { useMemo } from "react";
import type { World } from "@wake/contracts";
import Stage from "../Stage";
import ABRun from "../ABRun";
import MonteCarloRun from "../MonteCarloRun";
import type { RunConfig } from "../Studio";

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

  // Monte Carlo (M > 1) — durable Vercel Workflow → fan. Handles 1×M and 2×M.
  if (variations > 1) {
    return (
      <MonteCarloRun
        world={world}
        actions={actions}
        variations={variations}
        onReconfigure={onReconfigure}
      />
    );
  }

  // A/B (two actions, single run each) — live side by side.
  if (n === 2) {
    return <ABRun world={world} actions={actions} onReconfigure={onReconfigure} />;
  }

  // Single live cascade (1 × 1) — the existing Stage console, prop-driven.
  const seedId = actions[0]?.id ?? runWorld.seeds[0]?.id ?? "";
  return (
    <Stage world={runWorld} studio={{ seedId, autoRunLive: true, onReconfigure }} />
  );
}
