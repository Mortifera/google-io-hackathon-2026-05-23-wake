"use client";

/**
 * Claim visual: the distribution of outcomes that MOVES — and that you can drive.
 * Drag (or arrow-key) the "announcement tone" slider and the three outcome
 * regimes re-form in real time. When you're not touching it, it gently
 * auto-animates so it still reads as alive (and so the passive critic video sees
 * motion). Demonstrates "a distribution, not a single prediction" (Schwartz
 * Redefinition: show it). rAF morph via refs (no React re-render per frame);
 * reduced-motion skips the idle auto-loop but still responds to your input.
 */
import { useEffect, useMemo, useRef } from "react";
import s from "../app/marketing.module.css";

const W = 560;
const H = 196;
const BASE = 150;

const HUMPS = [
  { cx: 132, w: 52, color: "#4fd18b", label: "integration" },
  { cx: 300, w: 62, color: "#f0556b", label: "backlash" },
  { cx: 446, w: 44, color: "#f2b450", label: "competitor" },
];

// As tone goes measured(0) → blunt(1): backlash swells, integration recedes.
const heights = (v: number) => [70 - v * 44, 108 + v * 34, 52 + v * 16];

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
  const input = useRef<HTMLInputElement | null>(null);
  const manualV = useRef(0.5);
  const lastInteract = useRef(0);
  const renderRef = useRef<(v: number) => void>(() => {});

  const initPaths = useMemo(() => {
    const hs = heights(0.5);
    return HUMPS.map((h, i) => areaPath(h.cx, h.w, hs[i]));
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderRef.current = (v: number) => {
      const hs = heights(v);
      for (let i = 0; i < HUMPS.length; i++) {
        const d = areaPath(HUMPS[i].cx, HUMPS[i].w, hs[i]);
        fills.current[i]?.setAttribute("d", d);
        strokes.current[i]?.setAttribute("d", d);
      }
      if (knob.current) knob.current.style.left = `${v * 100}%`;
    };
    renderRef.current(0.5);
    if (reduce) return; // no idle auto-loop; manual input still drives it

    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const idle = t - lastInteract.current > 3000;
      let v: number;
      if (idle) {
        v = (Math.sin((t - t0) / 2600) + 1) / 2;
        if (input.current) input.current.value = String(v);
      } else {
        v = manualV.current;
      }
      renderRef.current(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onInteract = () => {
    if (input.current) manualV.current = parseFloat(input.current.value);
    lastInteract.current = performance.now();
    renderRef.current(manualV.current); // immediate (covers the reduced-motion path)
  };

  return (
    <div className={s.claimViz}>
      <div className={s.cvKnobRow}>
        <span className={s.cvKnobLabel}>announcement tone</span>
        <span className={s.cvTrack}>
          <span ref={knob} className={s.cvKnob} />
          <input
            ref={input}
            type="range"
            min="0"
            max="1"
            step="0.001"
            defaultValue="0.5"
            className={s.cvRange}
            aria-label="Announcement tone, measured to blunt — drag to reshape the outcome distribution"
            onInput={onInteract}
            onPointerDown={onInteract}
          />
        </span>
        <span className={s.cvKnobEnds}>measured → blunt</span>
        <span className={s.cvDragHint}>drag me</span>
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
            <path ref={(el) => { fills.current[i] = el; }} d={initPaths[i]} fill={`url(#chump${i})`} />
            <path
              ref={(el) => { strokes.current[i] = el; }}
              d={initPaths[i]}
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
