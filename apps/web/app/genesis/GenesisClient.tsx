"use client";

/**
 * Genesis UI — matches the Pencil mock `cX0Qu`.
 * Left panel: scenario input + budget slider + live cost estimate + Build button.
 * Center: six-step progress panel with check-off animation.
 * Right/background: generated world graph.
 * Bottom: THE CAST row with category counts.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { World } from "@wake/contracts";
import { buildGraphModel, buildCascadeModel } from "../../lib/model";
import GraphCanvas from "../../components/GraphCanvas";
import { planSizing, estCascadeCost, estGenCost } from "@genesis/budget";
import s from "./genesis.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type Phase = "idle" | "building" | "done" | "error";

interface Step {
  label: string;
  detail?: string;
  done: boolean;
}

// The six steps the pipeline emits, in order.
const STEP_LABELS = [
  "Researching the cast",
  "Deciding which entities matter",
  "Sizing the graph to budget",
  "Generating dossiers",
  "Writing edges & channels",
  "Assembling world.json",
];

// Minimal empty Cascade conforming to the contract (no ticks, no events).
function emptyGraphModel(world: World) {
  const emptyFinalState: Record<
    string,
    {
      beliefs: string;
      mood: { attention: number; sentiment: number; urgency: number };
      publicFace: string;
      privateInterior: string;
      history: string[];
      commitments: string[];
      attentionBudget: number;
      active: boolean;
    }
  > = {};
  for (const n of world.nodes) {
    emptyFinalState[n.id] = n.initialState ?? {
      beliefs: "",
      mood: { attention: 0.2, sentiment: 0, urgency: 0.1 },
      publicFace: "",
      privateInterior: "",
      history: [],
      commitments: [],
      attentionBudget: 1,
      active: false,
    };
  }

  // Build a minimal Cascade-shaped object — use unknown cast to avoid
  // re-importing the full Zod schema (the model functions handle partial data).
  const emptyCascade = {
    meta: {
      worldId: world.id,
      seedActionId: world.seeds[0]?.id ?? "none",
      seed: 0,
    },
    ticks: [],
    stateTimeline: [],
    eventDag: [],
    divergence: [],
    finalState: emptyFinalState,
  } as unknown as Parameters<typeof buildGraphModel>[0];

  const graph = buildGraphModel(emptyCascade, world);
  const model = buildCascadeModel(
    emptyCascade as unknown as Parameters<typeof buildCascadeModel>[0],
    graph,
  );
  return { graph, model };
}

// ── Estimate helper (pure, same math as budget.ts) ────────────────────────────

function liveEstimate(budget: number, ticks: number): { entities: number; cost: string } {
  const sizing = planSizing(budget, ticks);
  const total = sizing.targetEntities;
  const cost = (estGenCost(total) + estCascadeCost(total, ticks)).toFixed(2);
  return { entities: total, cost };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GenesisClient() {
  const [scenario, setScenario] = useState("");
  const [budget, setBudget] = useState(5);
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<Step[]>(() =>
    STEP_LABELS.map((label) => ({ label, done: false })),
  );
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [world, setWorld] = useState<World | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState("");

  const pRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  const estimate = useMemo(() => liveEstimate(budget, 12), [budget]);

  // Derived graph + model from the completed world (memo to avoid re-renders).
  const graphData = useMemo(() => {
    if (!world) return null;
    return emptyGraphModel(world);
  }, [world]);

  const handleBuild = useCallback(async () => {
    if (!scenario.trim() || phase === "building") return;

    // Reset state.
    setPhase("building");
    setSteps(STEP_LABELS.map((label) => ({ label, done: false })));
    setActiveStepIdx(0);
    setWorld(null);
    setSummary({});
    setErrorMsg("");

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/genesis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: scenario.trim(), budget, ticks: 12 }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

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
              // Find the step index matching the label (prefix match for safety).
              const idx = STEP_LABELS.findIndex(
                (l) =>
                  l.toLowerCase() === label.toLowerCase() ||
                  label.startsWith(l.slice(0, 10)),
              );
              if (idx >= 0) {
                // Mark all steps before this one as done.
                for (let i = 0; i < idx; i++) {
                  const item = next[i];
                  if (item) item.done = true;
                }
                const item = next[idx];
                if (item) {
                  item.done = false; // currently active
                  item.detail = detail;
                }
                setActiveStepIdx(idx);
              }
              return next;
            });
          } else if (ev.type === "done") {
            setSteps(STEP_LABELS.map((label) => ({ label, done: true })));
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
  }, [scenario, budget, phase]);

  const castDisplay = [
    { count: summary.leaders ?? 0, label: "BOARD LEADERS" },
    { count: summary.competitors ?? 0, label: "COMPETITORS" },
    { count: summary.cohorts ?? 0, label: "COHORTS" },
    { count: summary.platforms ?? 0, label: "PLATFORMS" },
    { count: summary.regulators ?? 0, label: "REGULATORS" },
    { count: summary.journalists ?? 0, label: "JOURNALISTS" },
  ];

  const totalEntities = world ? world.nodes.length : 0;

  // ── Download helper ────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!world) return;
    const blob = new Blob([JSON.stringify(world, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wake-world-${world.id.replace(/[^a-z0-9-]/gi, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [world]);

  return (
    <div className={s.root}>
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className={s.nav}>
        <div className={s.navLeft}>
          <span className={s.navLogo}>Wake</span>
          <span className={s.navSep}>·</span>
          <span className={s.navCrumb}>genesis</span>
          <span className={s.navSep}>·</span>
          <span className={s.navDesc}>building a new world</span>
        </div>
        <div className={s.navRight}>
          <a href="/" className={s.navLink}>sim</a>
          <span className={s.navSep}>·</span>
          <a href="/" className={s.navLink}>format</a>
        </div>
      </nav>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className={s.main}>
        {/* Left panel */}
        <div className={s.leftPanel}>
          <div className={s.sectionLabel}>GENESIS · GENERATE A WORLD</div>

          <label className={s.queryLabel}>What do you want to simulate?</label>

          <div className={s.inputWrap}>
            <textarea
              className={s.input}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="What happens if Stripe acquires Plaid?"
              rows={3}
              disabled={phase === "building"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  void handleBuild();
                }
              }}
            />
            <div className={s.inputHint}>
              Plain language — any company, any decision
            </div>
          </div>

          <label className={s.budgetLabel}>BUDGET</label>

          <div className={s.sliderRow}>
            <span className={s.budgetValue}>${budget.toFixed(2)}</span>
            <input
              type="range"
              className={s.slider}
              min={1}
              max={20}
              step={0.5}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              disabled={phase === "building"}
            />
            <span className={s.sliderMax}>$20</span>
          </div>

          <div className={s.estimateBox}>
            <div className={s.estimateRow}>
              <span className={s.estimateFormula}>
                ~{estimate.entities} entities × 12 ticks ≈ ${estimate.cost}/run
              </span>
              <span className={s.estimateDelta}>+${estimate.cost}</span>
            </div>
            <div className={s.estimateDetail}>
              Small budget: ~{Math.floor(estimate.entities * 0.14)} named leaders,{" "}
              {Math.floor(estimate.entities * 0.3)} cohorts. Larger budgets give richer
              Monte Carlo fans but cost more per run.
            </div>
          </div>

          <button
            className={`${s.buildBtn} ${phase === "building" ? s.buildBtnBusy : ""}`}
            onClick={() => void handleBuild()}
            disabled={!scenario.trim() || phase === "building"}
          >
            {phase === "building" ? (
              <span className={s.spinner} />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1Zm0 10a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1Zm5.657-8.243a1 1 0 0 1 0 1.414l-1.414 1.415a1 1 0 0 1-1.414-1.415l1.414-1.414a1 1 0 0 1 1.414 0ZM4.17 11.829a1 1 0 0 1 0 1.414L2.757 14.657a1 1 0 0 1-1.415-1.414l1.415-1.414a1 1 0 0 1 1.414 0ZM14.5 8a1 1 0 0 1-1 1h-2a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1Zm-10 0a1 1 0 0 1-1 1H1.5a1 1 0 0 1 0-2H3.5a1 1 0 0 1 1 1Z" />
              </svg>
            )}
            Build world
          </button>

          {phase === "error" && (
            <div className={s.errorBanner}>
              <strong>Build failed:</strong> {errorMsg}
            </div>
          )}
        </div>

        {/* Center/right area */}
        <div className={s.centerRight}>
          {/* Graph canvas background */}
          <div className={s.canvasArea}>
            {graphData ? (
              <GraphCanvas
                graph={graphData.graph}
                model={graphData.model}
                pRef={pRef}
                layer="public"
                selectedNodeId={null}
                onSelectNode={() => {}}
                trace={null}
              />
            ) : (
              <div className={s.emptyGraph}>
                {phase === "idle" && (
                  <div className={s.emptyGraphHint}>
                    Enter a scenario to build a world
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress panel (overlaid) */}
          {(phase === "building" || phase === "done") && (
            <div className={s.progressPanel}>
              <div className={s.progressHeader}>
                <span className={s.progressBadge}>BUILDING WORLD · STEP 1 PLAN</span>
              </div>
              <ul className={s.stepList}>
                {steps.map((step, i) => {
                  const isActive = i === activeStepIdx;
                  const isDone = step.done;
                  return (
                    <li
                      key={step.label}
                      className={[
                        s.stepItem,
                        isDone ? s.stepDone : "",
                        isActive ? s.stepActive : "",
                      ].join(" ")}
                    >
                      <span className={s.stepCheck}>
                        {isDone ? (
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 12 12"
                            fill="currentColor"
                          >
                            <path d="M10.28 2.28 4.5 8.06 1.72 5.28a1 1 0 0 0-1.44 1.44l3.5 3.5a1 1 0 0 0 1.44 0l6.5-6.5a1 1 0 0 0-1.44-1.44Z" />
                          </svg>
                        ) : isActive ? (
                          <span className={s.stepDot} />
                        ) : (
                          <span className={s.stepEmpty} />
                        )}
                      </span>
                      <span className={s.stepLabel}>{step.label}</span>
                      {step.detail && (
                        <span className={s.stepDetail}>{step.detail}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Cast summary row ──────────────────────────────────────────────── */}
      {phase === "done" && world && (
        <div className={s.castRow}>
          <div className={s.castTitle}>THE CAST · {totalEntities} ENTITIES</div>
          <div className={s.castCells}>
            {castDisplay.map(({ count, label }) => (
              <div key={label} className={s.castCell}>
                <span className={s.castCount}>{count}</span>
                <span className={s.castLabel}>{label}</span>
              </div>
            ))}
          </div>
          <div className={s.castActions}>
            <button className={s.downloadBtn} onClick={handleDownload} title="Download world.json">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 16l-5-5 1.4-1.4 2.6 2.6V4h2v8.2l2.6-2.6L17 11l-5 5zm-7 2h14v2H5v-2z"/>
              </svg>
              Download world.json
            </button>
            <a
              href={`/?byoWorld=${encodeURIComponent(world.id)}`}
              className={s.runBtn}
              onClick={(e) => {
                e.preventDefault();
                // Encode world as query param is too large; use sessionStorage.
                try {
                  sessionStorage.setItem("byo-world", JSON.stringify(world));
                  window.location.href = "/?byo=1";
                } catch {
                  // Fallback: download only
                  handleDownload();
                }
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Run it →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
