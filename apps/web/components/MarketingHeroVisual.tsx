"use client";

/**
 * Hero: one action fans into many futures. A single bright "action" node on the
 * left throws strands that diverge and settle into three outcome clusters on the
 * right — the product's Monte Carlo fan, the signature shape. Pure SVG + CSS
 * (a looping activation wave); no fixtures, no engine, so the landing stays fast.
 */
import { useMemo } from "react";
import s from "../app/marketing.module.css";

const SEED_X = 60;
const SEED_Y = 230;
const END_X = 556;

// Three outcome clusters (the affect/cluster palette from globals.css).
const CLUSTERS = [
  { color: "#4fd18b", center: 116, n: 7, spread: 70 }, // a calmer outcome
  { color: "#f0556b", center: 250, n: 10, spread: 92 }, // the dominant regime
  { color: "#f2b450", center: 380, n: 5, spread: 56 }, // a third regime
];

interface Strand {
  d: string;
  ex: number;
  ey: number;
  color: string;
  i: number;
}

function build(): Strand[] {
  const strands: Strand[] = [];
  let idx = 0;
  for (const cl of CLUSTERS) {
    for (let i = 0; i < cl.n; i++) {
      const t = cl.n === 1 ? 0.5 : i / (cl.n - 1);
      const jitter = ((i * 53) % 11) - 5; // deterministic (hydration-safe)
      const ey = Math.round(cl.center - cl.spread / 2 + t * cl.spread + jitter * 0.4);
      const ex = END_X + (((i * 37) % 9) - 4);
      // Smooth fan: flat near the seed, curving out to the endpoint.
      const d = `M ${SEED_X} ${SEED_Y} C ${SEED_X + 168} ${SEED_Y}, ${ex - 128} ${ey}, ${ex} ${ey}`;
      strands.push({ d, ex, ey, color: cl.color, i: idx++ });
    }
  }
  return strands;
}

export default function MarketingHeroVisual() {
  const strands = useMemo(build, []);
  return (
    <div className={s.heroVisualWrap}>
      <svg
        className={s.fanSvg}
        viewBox="0 0 600 460"
        fill="none"
        aria-hidden="true"
      >
        {strands.map((st) => (
          <path
            key={`s${st.i}`}
            className={s.fanStrand}
            d={st.d}
            stroke={st.color}
            style={{ animationDelay: `${(st.i % 8) * 0.18}s` }}
          />
        ))}
        {strands.map((st) => (
          <circle
            key={`d${st.i}`}
            className={s.fanDot}
            cx={st.ex}
            cy={st.ey}
            r={2.6}
            fill={st.color}
            style={{ animationDelay: `${(st.i % 8) * 0.18}s` }}
          />
        ))}
        {/* the action */}
        <circle className={s.fanSeedGlow} cx={SEED_X} cy={SEED_Y} r={16} />
        <circle className={s.fanSeed} cx={SEED_X} cy={SEED_Y} r={6.5} />
      </svg>
      <div className={s.fanLabels} aria-hidden="true">
        <span className={s.fanLabelAction}>your action</span>
        <span className={s.fanLabelFutures}>the futures</span>
      </div>
    </div>
  );
}
