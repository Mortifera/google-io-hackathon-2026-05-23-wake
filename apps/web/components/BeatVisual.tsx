"use client";

/**
 * Problem-beat visual: the blind spot. One bright, mappable decision node on the
 * left with a few crisp edges — then the world it lands in: a field of entities
 * that fades into fog the further out it goes. Embodies "you can map the
 * decision, you can't map the world it lands in." Pure SVG + CSS, deterministic
 * (hydration-safe), no engine.
 */
import { useMemo } from "react";
import s from "../app/marketing.module.css";

const AFFECT = ["#56c7d6", "#5b9cf0", "#4fd18b", "#f2b450", "#f0556b", "#b06bf0"];

// The decision (left, crisp) and its immediate, mappable neighbours.
const DECISION: [number, number] = [62, 132];
const NEAR: [number, number][] = [
  [118, 86],
  [126, 178],
  [156, 130],
];

// The world beyond — scattered, fading into fog as x grows. Deterministic.
function fogField() {
  const pts: { x: number; y: number; c: number; o: number }[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 30; i++) {
    const x = 196 + rnd() * 244;
    const y = 28 + rnd() * 208;
    // Opacity falls off the further into the world we look.
    const o = Math.max(0.06, 0.5 - (x - 196) / 300);
    pts.push({ x: Math.round(x), y: Math.round(y), c: Math.floor(rnd() * 6), o: +o.toFixed(2) });
  }
  return pts;
}

export default function BeatVisual() {
  const field = useMemo(fogField, []);
  return (
    <div className={s.beatVisualWrap}>
      <svg viewBox="0 0 460 264" fill="none" aria-hidden="true" className={s.beatSvg}>
        <defs>
          <linearGradient id="fog" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.34" stopColor="#04060a" stopOpacity="0" />
            <stop offset="1" stopColor="#04060a" stopOpacity="0.92" />
          </linearGradient>
        </defs>

        {/* the world beyond — faint, affect-tinted, dissolving into fog */}
        {field.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={AFFECT[p.c]} opacity={p.o} />
        ))}

        {/* crisp edges from the decision to its mappable neighbours */}
        {NEAR.map(([x, y], i) => (
          <line key={i} x1={DECISION[0]} y1={DECISION[1]} x2={x} y2={y} className={s.bvEdge} />
        ))}
        {NEAR.map(([x, y], i) => (
          <circle key={`n${i}`} cx={x} cy={y} r={4} className={s.bvNear} />
        ))}

        {/* the fog veil over the world */}
        <rect x="150" y="0" width="310" height="264" fill="url(#fog)" />

        {/* the decision — bright, certain, mappable */}
        <circle cx={DECISION[0]} cy={DECISION[1]} r={13} className={s.bvSeedGlow} />
        <circle cx={DECISION[0]} cy={DECISION[1]} r={6.5} className={s.bvSeed} />

        <text x={DECISION[0]} y={DECISION[1] + 32} className={s.bvLabelNear} textAnchor="middle">
          your decision
        </text>
        <text x={388} y={244} className={s.bvLabelFog} textAnchor="end">
          the world it lands in
        </text>
      </svg>
    </div>
  );
}
