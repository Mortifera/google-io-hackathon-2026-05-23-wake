"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MonteCarloResult } from "@wake/contracts";
import { CLUSTER_COLORS, withAlpha } from "../lib/palette";
import f from "./fan.module.css";

interface Props {
  mc: MonteCarloResult;
}

export default function MonteCarloFan({ mc }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 520 });
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(360, r.width), h: Math.max(320, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    mc.clusters.forEach((c, i) => m.set(c.id, CLUSTER_COLORS[i % CLUSTER_COLORS.length]));
    return m;
  }, [mc]);

  const geom = useMemo(() => {
    const { w, h } = size;
    const padY = 64;
    const originX = 64;
    const endX = w - 196;
    const originY = h / 2;
    const nC = mc.clusters.length;
    const bandTop = padY;
    const bandH = (h - 2 * padY) / Math.max(1, nC);
    const centerByCluster = new Map<string, number>();
    mc.clusters.forEach((c, i) => centerByCluster.set(c.id, bandTop + (i + 0.5) * bandH));

    // index of each run within its cluster
    const seen = new Map<string, number>();
    const runGeom = mc.runs.map((run) => {
      const j = seen.get(run.clusterId) ?? 0;
      seen.set(run.clusterId, j + 1);
      return { run, idx: j };
    });
    const sizeByCluster = new Map<string, number>();
    mc.clusters.forEach((c) =>
      sizeByCluster.set(c.id, mc.runs.filter((r) => r.clusterId === c.id).length),
    );

    const strands = runGeom.map(({ run, idx }) => {
      const cy = centerByCluster.get(run.clusterId) ?? originY;
      const m = sizeByCluster.get(run.clusterId) ?? 1;
      const spread = bandH * 0.62;
      const yEnd = m > 1 ? cy + (idx / (m - 1) - 0.5) * spread : cy;
      const dx = endX - originX;
      const c1x = originX + dx * 0.42;
      const c2x = endX - dx * 0.42;
      const cluster = mc.clusters.find((c) => c.id === run.clusterId);
      const isRep = cluster?.representativeRunId === run.id;
      return {
        id: run.id,
        clusterId: run.clusterId,
        d: `M ${originX} ${originY} C ${c1x} ${originY}, ${c2x} ${yEnd}, ${endX} ${yEnd}`,
        yEnd,
        isRep,
      };
    });

    return { originX, originY, endX, centerByCluster, strands, sizeByCluster };
  }, [size, mc]);

  return (
    <div className={f.wrap}>
      <div className={f.fanStage}>
        <div className={f.fanHead}>
          <div className={f.fanKicker}>Monte Carlo · {mc.runs.length} futures</div>
          <div className={f.fanTitle}>The same action, run {mc.runs.length} times</div>
          <div className={f.fanSub}>
            Each strand is one simulated future of <strong>{mc.seedActionId}</strong>{" "}
            in <strong>{mc.worldId}</strong>. They fan out from a single action and
            settle into {mc.clusters.length} distinct outcomes.
          </div>
        </div>

        <div className={f.svgHost} ref={hostRef}>
          <svg width={size.w} height={size.h}>
            {/* origin */}
            <circle cx={geom.originX} cy={geom.originY} r={5} className={f.originDot} />
            <circle
              cx={geom.originX}
              cy={geom.originY}
              r={11}
              fill="none"
              stroke={withAlpha("#ffffff", 0.25)}
              strokeWidth={1}
            />
            <text
              x={geom.originX}
              y={geom.originY - 20}
              textAnchor="middle"
              className={f.originLabel}
            >
              the action
            </text>

            {/* strands */}
            {geom.strands.map((st, i) => {
              const color = colorById.get(st.clusterId) ?? "#8ea2c8";
              const dim = active && active !== st.clusterId;
              return (
                <path
                  key={st.id}
                  className={f.strand}
                  d={st.d}
                  pathLength={1}
                  stroke={color}
                  strokeWidth={st.isRep ? 2.6 : 1.4}
                  style={{
                    opacity: dim ? 0.08 : st.isRep ? 0.95 : 0.42,
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: "draw 1.1s cubic-bezier(0.16,1,0.3,1) forwards",
                    animationDelay: `${i * 0.035}s`,
                  }}
                />
              );
            })}

            {/* endpoint dots */}
            {geom.strands.map((st) => {
              const color = colorById.get(st.clusterId) ?? "#8ea2c8";
              const dim = active && active !== st.clusterId;
              return (
                <circle
                  key={`d-${st.id}`}
                  cx={geom.endX}
                  cy={st.yEnd}
                  r={st.isRep ? 4 : 2.4}
                  fill={color}
                  style={{
                    opacity: dim ? 0.12 : 0.9,
                    transition: "opacity 0.3s",
                  }}
                />
              );
            })}

            {/* cluster labels */}
            {mc.clusters.map((c, i) => {
              const cy = geom.centerByCluster.get(c.id) ?? 0;
              const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
              const dim = active && active !== c.id;
              const count = geom.sizeByCluster.get(c.id) ?? 0;
              return (
                <g
                  key={c.id}
                  style={{ opacity: dim ? 0.3 : 1, transition: "opacity 0.3s", cursor: "pointer" }}
                  onMouseEnter={() => setActive(c.id)}
                  onMouseLeave={() => setActive(null)}
                >
                  <text x={geom.endX + 16} y={cy - 2} className={f.endLabel} fill={color}>
                    {c.label}
                  </text>
                  <text x={geom.endX + 16} y={cy + 15} className={f.endCount}>
                    {count} of {mc.runs.length} futures
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className={f.aside}>
        <PivotalCard mc={mc} />
        <div className={f.clusterList}>
          {mc.clusters.map((c, i) => {
            const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
            const share = (geom.sizeByCluster.get(c.id) ?? 0) / Math.max(1, mc.runs.length);
            return (
              <div
                key={c.id}
                className={f.clusterCard}
                data-active={active === c.id}
                style={{ color }}
                onMouseEnter={() => setActive(c.id)}
                onMouseLeave={() => setActive(null)}
              >
                <div className={f.clusterTop}>
                  <span
                    className={f.swatch}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 10,
                      background: color,
                    }}
                  />
                  <span className={f.clusterName}>{c.label}</span>
                  <span className={f.clusterShare}>{Math.round(share * 100)}%</span>
                </div>
                <div className={f.shareBar}>
                  <span style={{ width: `${share * 100}%`, background: color }} />
                </div>
                <div className={f.clusterSummary}>{c.summary}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PivotalCard({ mc }: { mc: MonteCarloResult }) {
  const pv = mc.pivotal;
  const pct = Math.round(pv.explainedVariance * 100);
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = pv.explainedVariance * circ;
  return (
    <div className={f.pivotal}>
      <div className={f.pivotalKicker}>Pivotal variable</div>
      <div className={f.pivotalDim}>{pv.dimension}</div>
      <div className={f.pivotalRing}>
        <svg width={60} height={60}>
          <circle cx={30} cy={30} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={6} />
          <circle
            cx={30}
            cy={30}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 30 30)"
          />
        </svg>
        <div>
          <div className={f.ringVal}>{pct}%</div>
          <div className={f.ringLabel}>
            of the variance between
            <br />
            outcomes
          </div>
        </div>
      </div>
      <div className={f.pivotalDesc}>{pv.description}</div>
    </div>
  );
}
