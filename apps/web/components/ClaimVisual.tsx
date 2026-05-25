"use client";

/**
 * Claim visual: the distribution of outcomes. Three outcome regimes drawn as
 * overlapping density humps (the cluster palette), on a baseline axis, with a
 * dashed marker on the modal regime — the "map" you read before you act. Makes
 * "a map, not a prediction" literal. Pure SVG, deterministic.
 */
import { useMemo } from "react";
import s from "../app/marketing.module.css";

const W = 560;
const H = 210;
const BASE = 168;

// Three regimes: center, width, height, count, color. The middle is dominant.
const HUMPS = [
  { cx: 132, w: 50, h: 78, n: 19, color: "#4fd18b", label: "integration" },
  { cx: 300, w: 62, h: 116, n: 24, color: "#f0556b", label: "backlash" },
  { cx: 446, w: 44, h: 56, n: 9, color: "#f2b450", label: "competitor" },
];

function area(cx: number, w: number, h: number) {
  const pts: string[] = [`M 0 ${BASE}`];
  for (let x = 0; x <= W; x += 7) {
    const y = BASE - h * Math.exp(-((x - cx) ** 2) / (2 * w * w));
    pts.push(`L ${x} ${+y.toFixed(1)}`);
  }
  pts.push(`L ${W} ${BASE} Z`);
  return pts.join(" ");
}

export default function ClaimVisual() {
  const humps = useMemo(
    () => HUMPS.map((hmp) => ({ ...hmp, d: area(hmp.cx, hmp.w, hmp.h) })),
    [],
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true" className={s.claimSvg}>
      <defs>
        {humps.map((hmp, i) => (
          <linearGradient key={i} id={`hump${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hmp.color} stopOpacity="0.28" />
            <stop offset="1" stopColor={hmp.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* baseline axis */}
      <line x1="0" y1={BASE} x2={W} y2={BASE} className={s.cvAxis} />

      {/* the regimes */}
      {humps.map((hmp, i) => (
        <g key={i}>
          <path d={hmp.d} fill={`url(#hump${i})`} />
          <path d={hmp.d} fill="none" stroke={hmp.color} strokeWidth="1.6" strokeOpacity="0.85" />
        </g>
      ))}

      {/* modal regime marker — the most likely outcome you'd read off the map */}
      <line
        x1={HUMPS[1].cx}
        y1={BASE - HUMPS[1].h - 8}
        x2={HUMPS[1].cx}
        y2={BASE}
        className={s.cvPivot}
      />

      {/* counts + labels per regime */}
      {humps.map((hmp, i) => (
        <g key={`l${i}`}>
          <text x={hmp.cx} y={BASE - hmp.h - 14} textAnchor="middle" className={s.cvCount} style={{ fill: hmp.color }}>
            {hmp.n}
          </text>
          <text x={hmp.cx} y={BASE + 18} textAnchor="middle" className={s.cvLabel}>
            {hmp.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
