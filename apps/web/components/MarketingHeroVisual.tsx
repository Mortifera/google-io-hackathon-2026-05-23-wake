"use client";

/**
 * Lightweight hero cascade — a seed node fires and a wave of activation ripples
 * outward through rings of nodes. Pure SVG + CSS keyframes (delay ∝ ring), no
 * fixtures and no engine, so the landing stays fast. Evokes the product without
 * shipping a megabyte of world data.
 */
import { useMemo } from "react";
import s from "../app/marketing.module.css";

interface Node {
  x: number;
  y: number;
  ring: number;
  r: number;
}
interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  ring: number;
}

const RING_RADII = [0, 78, 150, 222, 286];
const RING_COUNTS = [1, 6, 11, 16, 20];
const RING_COLORS = ["#5bd1a0", "#56c7d6", "#5b9cf0", "#8a7bf0", "#f0556b"];

function build(): { nodes: Node[]; edges: Edge[] } {
  const C = 300;
  const nodes: Node[] = [];
  RING_RADII.forEach((rad, ring) => {
    const n = RING_COUNTS[ring];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.6;
      nodes.push({
        // Round so the SSR + client SVG strings are byte-identical (no hydration
        // mismatch from float formatting).
        x: Math.round(C + rad * Math.cos(a)),
        y: Math.round(C + rad * Math.sin(a)),
        ring,
        r: ring === 0 ? 6 : ring >= 3 ? 2.4 : 3.4,
      });
    }
  });
  const edges: Edge[] = [];
  for (const node of nodes) {
    if (node.ring === 0) continue;
    const prev = nodes.filter((p) => p.ring === node.ring - 1);
    let best = prev[0];
    let bd = Infinity;
    for (const p of prev) {
      const d = (p.x - node.x) ** 2 + (p.y - node.y) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best) edges.push({ x1: best.x, y1: best.y, x2: node.x, y2: node.y, ring: node.ring });
  }
  return { nodes, edges };
}

export default function MarketingHeroVisual() {
  const { nodes, edges } = useMemo(build, []);
  return (
    <div className={s.heroVisualWrap}>
      <svg className={s.heroSvg} viewBox="0 0 600 600" fill="none" aria-hidden="true">
        {edges.map((e, i) => (
          <line
            key={`e${i}`}
            className={s.edge}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            style={{ animationDelay: `${e.ring * 0.5}s` }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={`n${i}`}
            className={s.node}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={RING_COLORS[Math.min(n.ring, 4)]}
            style={{
              animationDelay: `${n.ring * 0.5}s`,
              filter:
                n.ring === 0 ? "drop-shadow(0 0 10px var(--accent-glow))" : undefined,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
