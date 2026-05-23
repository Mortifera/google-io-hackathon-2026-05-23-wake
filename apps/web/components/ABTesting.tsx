"use client";

import { useMemo, useState } from "react";
import type { World } from "@wake/contracts";
import { AB_TEST } from "../lib/scenarios";
import { buildCascadeModel, buildGraphModel } from "../lib/model";
import { affectStyle } from "../lib/palette";
import GraphCanvas from "./GraphCanvas";
import s from "./stage.module.css";
import ab from "./ab.module.css";

interface Props {
  world: World;
}

type VariantKey = "independent" | "integrated";

/** Aggregate sentiment across all finalState nodes (mean). */
function meanSentiment(finalState: Record<string, { mood?: { sentiment?: number } }>): number {
  const vals = Object.values(finalState)
    .map((st) => st.mood?.sentiment ?? 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Count nodes with sentiment <= threshold (backlash proxy). */
function countNegative(finalState: Record<string, { mood?: { sentiment?: number } }>, threshold = -0.5): number {
  return Object.values(finalState).filter((st) => (st.mood?.sentiment ?? 0) <= threshold).length;
}

/** Count nodes with sentiment >= threshold (positive). */
function countPositive(finalState: Record<string, { mood?: { sentiment?: number } }>, threshold = 0.2): number {
  return Object.values(finalState).filter((st) => (st.mood?.sentiment ?? 0) >= threshold).length;
}

/** Derive an outcome label from aggregate sentiment. */
function outcomeLabel(mean: number, negCount: number): { label: string; color: string } {
  if (mean > 0.05 && negCount <= 4) return { label: "Muted positive", color: "var(--cluster-a)" };
  if (mean < -0.15 && negCount >= 8) return { label: "Consumer backlash", color: "var(--cluster-b)" };
  if (mean < -0.05 && negCount >= 5) return { label: "Mixed / cautious", color: "var(--alarmed)" };
  return { label: "Guarded", color: "var(--accent-sky)" };
}

/**
 * A mini "fake pRef" that always reads end-of-cascade so the GraphCanvas renders
 * the final frame without needing the full playback machinery.
 */
function useFinalPRef(nTicks: number): React.RefObject<number> {
  return useMemo(() => ({ current: nTicks }), [nTicks]);
}

function VariantPanel({
  world,
  variantKey,
  isSelected,
  onSelect,
}: {
  world: World;
  variantKey: VariantKey;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const variant = AB_TEST.variants[variantKey];
  const cascade = variant.cascade;

  const graph = useMemo(() => buildGraphModel(cascade, world), [cascade, world]);
  const model = useMemo(() => buildCascadeModel(cascade, graph), [cascade, graph]);
  const pRef = useFinalPRef(model.ticks.length);

  const mean = meanSentiment(cascade.finalState as Record<string, { mood?: { sentiment?: number } }>);
  const negCount = countNegative(cascade.finalState as Record<string, { mood?: { sentiment?: number } }>);
  const posCount = countPositive(cascade.finalState as Record<string, { mood?: { sentiment?: number } }>);
  const total = Object.keys(cascade.finalState).length;
  const outcome = outcomeLabel(mean, negCount);

  const isRecommended = variantKey === "independent";

  return (
    <button
      className={`${ab.variantCard} ${isSelected ? ab.variantCardSelected : ""}`}
      onClick={onSelect}
      type="button"
    >
      {isRecommended && (
        <div className={ab.recommendedBadge}>Sweep favors this</div>
      )}

      <div className={ab.variantHeader}>
        <div className={ab.variantLetter}>{variantKey === "independent" ? "A" : "B"}</div>
        <div>
          <div className={ab.variantName}>{variant.label}</div>
          <div className={ab.variantDesc}>{variant.description}</div>
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

      <div className={ab.variantStats}>
        <div className={ab.statCol}>
          <div className={ab.statVal} style={{ color: "var(--cluster-a)" }}>
            {total > 0 ? Math.round((posCount / total) * 100) : 0}%
          </div>
          <div className={ab.statKey}>positive</div>
        </div>
        <div className={ab.statCol}>
          <div className={ab.statVal} style={{ color: "var(--alarmed)" }}>
            {total > 0 ? Math.round(((total - posCount - negCount) / total) * 100) : 0}%
          </div>
          <div className={ab.statKey}>neutral</div>
        </div>
        <div className={ab.statCol}>
          <div className={ab.statVal} style={{ color: "var(--cluster-b)" }}>
            {total > 0 ? Math.round((negCount / total) * 100) : 0}%
          </div>
          <div className={ab.statKey}>negative</div>
        </div>
      </div>

      <div className={ab.outcomeTag} style={{ color: outcome.color, borderColor: `color-mix(in srgb, ${outcome.color} 40%, transparent)` }}>
        {outcome.label}
      </div>
    </button>
  );
}

function DetailView({
  world,
  variantKey,
}: {
  world: World;
  variantKey: VariantKey;
}) {
  const variant = AB_TEST.variants[variantKey];
  const cascade = variant.cascade;
  const otherKey: VariantKey = variantKey === "independent" ? "integrated" : "independent";
  const other = AB_TEST.variants[otherKey];

  const graph = useMemo(() => buildGraphModel(cascade, world), [cascade, world]);
  const model = useMemo(() => buildCascadeModel(cascade, graph), [cascade, graph]);
  const pRef = useFinalPRef(model.ticks.length);

  const otherGraph = useMemo(() => buildGraphModel(other.cascade, world), [other.cascade, world]);
  const otherModel = useMemo(() => buildCascadeModel(other.cascade, otherGraph), [other.cascade, otherGraph]);

  // Build comparison stats
  type FinalState = Record<string, { mood?: { sentiment?: number } }>;
  const thisMean = meanSentiment(cascade.finalState as FinalState);
  const otherMean = meanSentiment(other.cascade.finalState as FinalState);
  const thisNeg = countNegative(cascade.finalState as FinalState);
  const otherNeg = countNegative(other.cascade.finalState as FinalState);
  const thisPos = countPositive(cascade.finalState as FinalState);
  const otherPos = countPositive(other.cascade.finalState as FinalState);
  const total = Object.keys(cascade.finalState).length;
  const otherTotal = Object.keys(other.cascade.finalState).length;

  const thisOutcome = outcomeLabel(thisMean, thisNeg);
  const otherOutcome = outcomeLabel(otherMean, otherNeg);

  // Most-negative nodes in this variant vs other
  const mostNeg = Object.entries(cascade.finalState as FinalState)
    .sort((a, b) => (a[1].mood?.sentiment ?? 0) - (b[1].mood?.sentiment ?? 0))
    .slice(0, 3)
    .map(([id, st]) => ({ id, sentiment: st.mood?.sentiment ?? 0 }));

  const nodeLabel = (id: string) => world.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className={ab.detail}>
      <div className={ab.detailLeft}>
        <div className={ab.detailKicker}>
          Variant {variantKey === "independent" ? "A" : "B"} — {variant.label}
        </div>
        <div className={ab.detailTitle}>{cascade.ticks.length} futures, the {variant.label.toLowerCase()} framing</div>
        <div className={ab.detailSub}>{variant.framing}</div>

        <div className={ab.detailGraph}>
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
      </div>

      <div className={ab.detailRight}>
        <div className={ab.vsBox}>
          <div className={ab.vsTitle}>vs. Baseline ({other.label})</div>

          <div className={ab.vsRow}>
            <span className={ab.vsLabel}>Outcome</span>
            <span className={ab.vsThis} style={{ color: thisOutcome.color }}>{thisOutcome.label}</span>
            <span className={ab.vsOther} style={{ color: otherOutcome.color }}>{otherOutcome.label}</span>
          </div>

          <div className={ab.vsRow}>
            <span className={ab.vsLabel}>Positive nodes</span>
            <span className={ab.vsThis} style={{ color: "var(--cluster-a)" }}>
              {total > 0 ? Math.round((thisPos / total) * 100) : 0}%
            </span>
            <span className={ab.vsOther} style={{ color: "var(--cluster-a)" }}>
              {otherTotal > 0 ? Math.round((otherPos / otherTotal) * 100) : 0}%
            </span>
          </div>

          <div className={ab.vsRow}>
            <span className={ab.vsLabel}>Consumer backlash</span>
            <span className={ab.vsThis} style={{ color: "var(--cluster-b)" }}>
              {total > 0 ? Math.round((thisNeg / total) * 100) : 0}%
            </span>
            <span className={ab.vsOther} style={{ color: "var(--cluster-b)" }}>
              {otherTotal > 0 ? Math.round((otherNeg / otherTotal) * 100) : 0}%
            </span>
          </div>

          <div className={ab.vsRow}>
            <span className={ab.vsLabel}>Mean sentiment</span>
            <span
              className={ab.vsThis}
              style={{ color: thisMean >= 0 ? "var(--cluster-a)" : "var(--cluster-b)" }}
            >
              {thisMean >= 0 ? "+" : ""}{thisMean.toFixed(2)}
            </span>
            <span
              className={ab.vsOther}
              style={{ color: otherMean >= 0 ? "var(--cluster-a)" : "var(--cluster-b)" }}
            >
              {otherMean >= 0 ? "+" : ""}{otherMean.toFixed(2)}
            </span>
          </div>
        </div>

        <div className={ab.interpBox}>
          <div className={ab.interpTitle}>What the sweep shows</div>
          <div className={ab.interpText}>{variant.interpretation}</div>
        </div>

        <div className={ab.negBox}>
          <div className={ab.negTitle}>Most stressed nodes</div>
          {mostNeg.map((n) => {
            const pct = ((n.sentiment + 1) / 2) * 100;
            const color = n.sentiment < -0.5 ? "var(--cluster-b)" : "var(--alarmed)";
            return (
              <div key={n.id} className={ab.negRow}>
                <span className={ab.negLabel}>{nodeLabel(n.id)}</span>
                <div className={ab.negBar}>
                  <div className={ab.negBarFill} style={{ width: `${Math.max(2, pct)}%`, background: color }} />
                </div>
                <span className={ab.negVal} style={{ color }}>{n.sentiment.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ABTesting({ world }: Props) {
  const [selected, setSelected] = useState<VariantKey | null>(null);

  return (
    <div className={ab.root}>
      <div className={ab.header}>
        <div className={ab.kicker}>Same action · same world · two framings</div>
        <div className={ab.title}>{AB_TEST.question}</div>
        <div className={ab.sub}>
          {AB_TEST.description}
        </div>
        <div className={ab.tagRow}>
          <span className={ab.tag}>Framing</span>
          <span className={ab.tag}>Channel</span>
          <span className={ab.tag}>Timing</span>
        </div>
      </div>

      {selected ? (
        <>
          <div className={ab.detailNav}>
            <button className={ab.backBtn} onClick={() => setSelected(null)} type="button">
              ← All variants
            </button>
            <span className={ab.detailBreadcrumb}>Variant {selected === "independent" ? "A" : "B"} — {AB_TEST.variants[selected].label}</span>
          </div>
          <DetailView world={world} variantKey={selected} />
        </>
      ) : (
        <>
          <div className={ab.variantGrid}>
            {(["independent", "integrated"] as VariantKey[]).map((k) => (
              <VariantPanel
                key={k}
                world={world}
                variantKey={k}
                isSelected={selected === k}
                onSelect={() => setSelected(k)}
              />
            ))}
          </div>

          <div className={ab.sweep}>
            <div className={ab.sweepKicker}>A/B Testing · framing × 2 variants</div>
            <div className={ab.sweepText}>
              {AB_TEST.sweepSummary}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
