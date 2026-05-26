"use client";

import { useMemo } from "react";
import type { World } from "@wake/contracts";
import Stage from "../Stage";
import ABRun from "../ABRun";
import MonteCarloRun from "../MonteCarloRun";
import { precomputedFor } from "../../lib/scenarios";
import type { RunConfig } from "../Studio";

interface Props {
  config: RunConfig;
  onReconfigure: () => void;
}

export default function RunStep({ config, onReconfigure }: Props) {
  const { world, actions, variations, source } = config;

  // Run world = the chosen world with its seeds replaced by the configured
  // action(s), so a custom payload travels through the kernel under its own id.
  const runWorld = useMemo<World>(
    () => ({ ...world, seeds: actions }),
    [world, actions],
  );

  const n = actions.length;
  const action = actions[0];

  // Prebuilt world + an unmodified action with a matching precompute → replay it
  // instantly (no live spend). Any edit, or a generated world, runs live.
  const pre =
    source === "prebuilt" && n === 1 && action
      ? precomputedFor(world, action)
      : null;

  // Monte Carlo (M > 1) — durable Vercel Workflow → fan, or the saved fan if it
  // was precomputed for this prebuilt world.
  if (variations > 1) {
    return (
      <MonteCarloRun
        world={world}
        actions={actions}
        variations={variations}
        onReconfigure={onReconfigure}
        precomputed={pre?.mc ?? undefined}
      />
    );
  }

  // A/B (two actions, single run each) — live side by side.
  if (n === 2) {
    return <ABRun world={world} actions={actions} onReconfigure={onReconfigure} />;
  }

  // Single — replay the precomputed cascade if we have one, else a live cascade.
  const seedId = action?.id ?? runWorld.seeds[0]?.id ?? "";
  return (
    <Stage
      world={runWorld}
      studio={{ seedId, autoRunLive: !pre, onReconfigure }}
    />
  );
}
