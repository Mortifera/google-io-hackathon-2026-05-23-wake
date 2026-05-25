"use client";

/**
 * Hero: one action fans into many futures — read as REAL instrument output, and
 * now interactive: hover an outcome regime to brighten its strands and read a
 * sample future (turns "abstract art" into a concrete demo). One coherent
 * scenario ("Acquired by Microsoft") threaded through the page. SVG + CSS,
 * deterministic (hydration-safe), no engine.
 */
import { useMemo, useState } from "react";
import s from "../app/marketing.module.css";

const SEED = { x: 64, y: 232 };
const END_X = 468;

// The futures — affect/cluster palette. Middle regime is dominant (pivotal).
const CLUSTERS = [
  { key: "integration", name: "integration", count: 19, color: "#4fd18b", center: 118, n: 7, spread: 62, pivotal: false, sample: "devrel amplifies — “finally, real resources”" },
  { key: "backlash", name: "backlash", count: 24, color: "#f0556b", center: 248, n: 10, spread: 96, pivotal: true, sample: "indie devs feel abandoned; #boycott trends" },
  { key: "competitor", name: "competitor", count: 9, color: "#f2b450", center: 372, n: 5, spread: 50, pivotal: false, sample: "a rival quietly courts your power users" },
];

interface Strand {
  d: string;
  ex: number;
  ey: number;
  color: string;
  key: string;
  i: number;
}

function build() {
  const strands: Strand[] = [];
  const labels: { y: number; cl: (typeof CLUSTERS)[number] }[] = [];
  let idx = 0;
  for (const cl of CLUSTERS) {
    let sum = 0;
    for (let i = 0; i < cl.n; i++) {
      const t = cl.n === 1 ? 0.5 : i / (cl.n - 1);
      const jitter = ((i * 53) % 11) - 5; // deterministic (hydration-safe)
      const ey = Math.round(cl.center - cl.spread / 2 + t * cl.spread + jitter * 0.4);
      const ex = END_X + (((i * 37) % 9) - 4);
      const d = `M ${SEED.x} ${SEED.y} C ${SEED.x + 150} ${SEED.y}, ${ex - 120} ${ey}, ${ex} ${ey}`;
      strands.push({ d, ex, ey, color: cl.color, key: cl.key, i: idx++ });
      sum += ey;
    }
    labels.push({ y: Math.round(sum / cl.n), cl });
  }
  return { strands, labels };
}

export default function MarketingHeroVisual() {
  const { strands, labels } = useMemo(build, []);
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ? CLUSTERS.find((c) => c.key === hover) ?? null : null;

  return (
    <div className={s.heroVisualWrap}>
      <svg className={s.fanSvg} viewBox="0 0 600 460" fill="none">
        {strands.map((st) => (
          <path
            key={`s${st.i}`}
            className={s.fanStrand}
            d={st.d}
            stroke={st.color}
            style={
              hover
                ? { opacity: st.key === hover ? 0.85 : 0.05, animation: "none" }
                : { animationDelay: `${(st.i % 8) * 0.18}s` }
            }
          />
        ))}
        {strands.map((st) => (
          <circle
            key={`d${st.i}`}
            className={s.fanDot}
            cx={st.ex}
            cy={st.ey}
            r={hover && st.key === hover ? 3.4 : 2.6}
            fill={st.color}
            style={
              hover
                ? { opacity: st.key === hover ? 1 : 0.07, animation: "none" }
                : { animationDelay: `${(st.i % 8) * 0.18}s` }
            }
          />
        ))}

        {/* the action — cool-white instrument core with a cyan live glow */}
        <circle className={s.fanSeedGlow} cx={SEED.x} cy={SEED.y} r={16} />
        <circle className={s.fanSeed} cx={SEED.x} cy={SEED.y} r={6.5} />
        <text className={s.fanActionTag} x={30} y={SEED.y + 28}>ACTION</text>
        <text className={s.fanActionName} x={30} y={SEED.y + 44}>&ldquo;Acquired by Microsoft&rdquo;</text>

        {/* the futures — named regimes, hover to focus + reveal a sample */}
        <text className={s.fanFuturesTag} x={502} y={58}>52 FUTURES</text>
        {labels.map(({ y, cl }) => {
          const dim = hover != null && hover !== cl.key;
          return (
            <g
              key={cl.key}
              style={{ opacity: dim ? 0.3 : 1, cursor: "pointer", transition: "opacity 0.2s var(--ease-out)" }}
              onMouseEnter={() => setHover(cl.key)}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={484} y={y - 22} width={116} height={46} fill="transparent" style={{ pointerEvents: "all" }} />
              <line x1={END_X + 6} y1={y} x2={496} y2={y} stroke={cl.color} strokeWidth="1" opacity="0.5" />
              <text className={s.fanClusterCount} x={502} y={y - 3} style={{ fill: cl.color }}>{cl.count}</text>
              <text className={s.fanClusterName} x={502} y={y + 10}>{cl.name}</text>
              {cl.pivotal && (
                <text className={s.fanPivotTag} x={502} y={y + 23} style={{ fill: cl.color }}>&#9666; pivotal</text>
              )}
            </g>
          );
        })}

        {/* bottom caption — hint by default, a sample future on hover */}
        {active ? (
          <text className={s.fanCaption} x={30} y={440}>
            <tspan style={{ fill: active.color, fontWeight: 700 }}>{active.name}</tspan>
            <tspan style={{ fill: "var(--text-dim)" }}>{`  —  ${active.sample}`}</tspan>
          </text>
        ) : (
          <text className={s.fanCaptionHint} x={30} y={440}>hover an outcome to read a sample future</text>
        )}
      </svg>
    </div>
  );
}
