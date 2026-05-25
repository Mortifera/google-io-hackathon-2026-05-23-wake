"use client";

/**
 * Genesis world-building, as a reusable hook. Streams POST /api/genesis (SSE) and
 * tracks the six pipeline stages + the finished World. Lifted out of the old
 * /genesis page so the Studio's World step (and anywhere else) can build a world
 * without re-implementing the stream parser.
 */
import { useCallback, useRef, useState } from "react";
import type { World } from "@wake/contracts";

// The six stages the pipeline emits, in order.
export const GENESIS_STEPS = [
  "Researching the cast",
  "Deciding which entities matter",
  "Sizing the graph to budget",
  "Generating dossiers",
  "Writing edges & channels",
  "Assembling world.json",
] as const;

export interface GenesisStep {
  label: string;
  detail?: string;
  done: boolean;
}
export type GenesisPhase = "idle" | "building" | "done" | "error";

interface StepEvent {
  type: "step";
  label: string;
  detail?: string;
}
interface DoneEvent {
  type: "done";
  world: World;
  summary: Record<string, number>;
}
interface ErrorEvent {
  type: "error";
  message: string;
}
type GenesisEvent = StepEvent | DoneEvent | ErrorEvent;

const freshSteps = (): GenesisStep[] =>
  GENESIS_STEPS.map((label) => ({ label, done: false }));

export interface UseGenesis {
  phase: GenesisPhase;
  steps: GenesisStep[];
  activeStepIdx: number;
  world: World | null;
  summary: Record<string, number>;
  errorMsg: string;
  build: (scenario: string, budget?: number, ticks?: number) => Promise<void>;
  reset: () => void;
}

export function useGenesis(): UseGenesis {
  const [phase, setPhase] = useState<GenesisPhase>("idle");
  const [steps, setSteps] = useState<GenesisStep[]>(freshSteps);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [world, setWorld] = useState<World | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setSteps(freshSteps());
    setActiveStepIdx(-1);
    setWorld(null);
    setSummary({});
    setErrorMsg("");
  }, []);

  const build = useCallback(
    async (scenario: string, budget = 5, ticks = 12) => {
      if (!scenario.trim()) return;
      setPhase("building");
      setSteps(freshSteps());
      setActiveStepIdx(0);
      setWorld(null);
      setSummary({});
      setErrorMsg("");

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/genesis", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scenario: scenario.trim(), budget, ticks }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const chunks = buf.split("\n\n");
          buf = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            let ev: GenesisEvent;
            try {
              ev = JSON.parse(line.slice(5).trim()) as GenesisEvent;
            } catch {
              continue;
            }

            if (ev.type === "step") {
              const { label, detail } = ev;
              setSteps((prev) => {
                const next = prev.map((st) => ({ ...st }));
                const idx = GENESIS_STEPS.findIndex(
                  (l) =>
                    l.toLowerCase() === label.toLowerCase() ||
                    label.startsWith(l.slice(0, 10)),
                );
                if (idx >= 0) {
                  for (let i = 0; i < idx; i++) {
                    const item = next[i];
                    if (item) item.done = true;
                  }
                  const item = next[idx];
                  if (item) {
                    item.done = false;
                    item.detail = detail;
                  }
                  setActiveStepIdx(idx);
                }
                return next;
              });
            } else if (ev.type === "done") {
              setSteps(GENESIS_STEPS.map((label) => ({ label, done: true })));
              setActiveStepIdx(-1);
              setWorld(ev.world);
              setSummary(ev.summary);
              setPhase("done");
            } else if (ev.type === "error") {
              setErrorMsg(ev.message);
              setPhase("error");
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setErrorMsg((err as Error).message ?? "Unknown error");
          setPhase("error");
        }
      }
    },
    [],
  );

  return { phase, steps, activeStepIdx, world, summary, errorMsg, build, reset };
}
