"use client";

/**
 * Claim visual: the distribution of outcomes that MOVES. As a variable
 * (announcement tone) shifts, the three outcome regimes re-form in real time —
 * demonstrating "a distribution, not a single prediction" (Schwartz Redefinition:
 * show it, don't assert it). rAF morph via refs (no React re-render per frame);
 * reduced-motion renders the settled state.
 */
import { useEffect, useMemo, useRef } from "react";
import s from "../app/marketing.module.css";

const W = 560;
const H = 196;
const BASE = 150;

const HUMPS = [
  { cx: 132, w: 52, h: 70, color: "#4fd18b", label: "integration" },
  { cx: 300, w: 62, h: 108, color: "#f0556b", label: "backlash" },
  { cx: 446, w: 44, h: 52, color: "#f2b450", label: "competitor" },
];

function areaPath(cx: number, w: number, h: number) {
  const pts: string[] = [`M 0 ${BASE}`];
  for (let x = 0; x <= W; x += 8) {
    const y = BASE - h * Math.exp(-((x - cx) ** 2) / (2 * w * w));
    pts.push(`L ${x} ${y.toFixed(1)}`);
  }
  pts.push(`L ${W} ${BASE} Z`);
  return pts.join(" ");
}

export default function ClaimVisual() {
  const fills = useRef<(SVGPathElement | null)[]>([]);
  const strokes = useRef<(SVGPathElement | null)[]>([]);
  const knob = useRef<HTMLSpanElement | null>(null);

  const init = useMemo(() => HUMPS.map((h) => areaPath(h.cx, h.w, h.h)), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const v = (Math.sin((t - t0) / 2600) + 1) / 2; // 0..1
      // As tone goes measured→blunt: backlash swells, integration recedes.
      const hs = [70 - v * 44, 108 + v * 34, 52 + v * 16];
      for (let i = 0; i < HUMPS.length; i++) {
        const d = areaPath(HUMPS[i].cx, HUMPS[i].w, hs[i]);
        fills.current[i]?.setAttribute("d", d);
        strokes.current[i]?.setAttribute("d", d);
      }
      if (knob.current) knob.current.style.transform = `translateX(${v * 100}%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={s.claimViz}>
      <div className={s.cvKnobRow}>
        <span className={s.cvKnobLabel}>announcement tone</span>
        <span className={s.cvTrack}>
          <span ref={knob} className={s.cvKnob} />
        </span>
        <span className={s.cvKnobEnds}>measured → blunt</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true" className={s.claimSvg}>
        <defs>
          {HUMPS.map((h, i) => (
            <linearGradient key={i} id={`chump${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={h.color} stopOpacity="0.3" />
              <stop offset="1" stopColor={h.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <line x1="0" y1={BASE} x2={W} y2={BASE} className={s.cvAxis} />
        {HUMPS.map((h, i) => (
          <g key={i}>
            <path ref={(el) => { fills.current[i] = el; }} d={init[i]} fill={`url(#chump${i})`} />
            <path
              ref={(el) => { strokes.current[i] = el; }}
              d={init[i]}
              fill="none"
              stroke={h.color}
              strokeWidth="1.6"
              strokeOpacity="0.9"
            />
            <text x={h.cx} y={BASE + 18} textAnchor="middle" className={s.cvLabel}>
              {h.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
