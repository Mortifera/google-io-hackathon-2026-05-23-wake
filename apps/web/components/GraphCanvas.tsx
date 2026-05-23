"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { Event, NodeState } from "@wake/contracts";
import type { CascadeModel, GraphModel } from "../lib/model";
import { resolveFrame } from "../lib/model";
import { affectColor, classifyAffect, EVENT_COLOR, withAlpha } from "../lib/palette";

type Layer = "public" | "private";

interface SimNode extends SimulationNodeDatum {
  id: string;
  tier: number;
}
interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
}

interface EventViz {
  id: string;
  type: Event["type"];
  source: string; // node id, or "world"
  target: string;
  act: number;
  isSeed: boolean;
  isLeak: boolean;
  isSelf: boolean;
  /** stagger offset within its act, 0..1 */
  offset: number;
}

/** An active causal trace to render cinematically over the graph. */
export interface TraceViz {
  /** Root→leaf causal chain (events), as returned by the DAG trace. */
  chain: Event[];
  /** The node the trace is anchored to (the one we asked "why" about). */
  anchorId: string;
  /** Bumped each time a new trace starts, to restart the reveal animation. */
  nonce: number;
}

interface Props {
  graph: GraphModel;
  model: CascadeModel;
  pRef: React.RefObject<number>;
  layer: Layer;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  trace: TraceViz | null;
}

const TIER_RADIUS: Record<number, number> = { 1: 10, 2: 6.5, 3: 5 };

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
  const r = pa.map((v, i) => v + (pb[i] - v) * t);
  return `#${toHex(r[0])}${toHex(r[1])}${toHex(r[2])}`;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Which event types are visible on each layer. Emergent leaks show on both. */
function visibleOnLayer(type: Event["type"], layer: Layer): boolean {
  if (type === "emergent") return true;
  if (layer === "public") return type === "public_post" || type === "action";
  return type === "private_message" || type === "decision";
}

export default function GraphCanvas({
  graph,
  model,
  pRef,
  layer,
  selectedNodeId,
  onSelectNode,
  trace,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // refs the rAF loop reads without re-subscribing
  const layerRef = useRef(layer);
  const selectedRef = useRef(selectedNodeId);
  const hoverRef = useRef<string | null>(null);
  const traceRef = useRef<TraceViz | null>(trace);
  const traceStartRef = useRef(0);
  const traceNonceRef = useRef(-1);
  layerRef.current = layer;
  selectedRef.current = selectedNodeId;
  traceRef.current = trace;

  // Stable sim nodes/links + a fast id→node map, rebuilt only if graph changes.
  const sim = useMemo(() => {
    const nodes: SimNode[] = graph.nodes.map((n, i) => {
      const a = (i / Math.max(1, graph.nodes.length)) * Math.PI * 2;
      return { id: n.id, tier: n.tier, x: Math.cos(a) * 160, y: Math.sin(a) * 160 };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = graph.edges
      .filter((e) => byId.has(e.source) && byId.has(e.target) && e.source !== e.target)
      .map((e) => ({ id: e.id, source: e.source, target: e.target }));
    return { nodes, byId, links };
  }, [graph]);

  // Per-event render metadata.
  const eventViz: EventViz[] = useMemo(() => {
    const actById = new Map<string, number>();
    model.ticks.forEach((t, i) => t.events.forEach((e) => actById.set(e.id, i)));
    const counts = new Map<number, number>();
    return model.eventDag.map((e) => {
      const act = actById.get(e.id) ?? 0;
      const idx = counts.get(act) ?? 0;
      counts.set(act, idx + 1);
      return {
        id: e.id,
        type: e.type,
        source: e.source,
        target: e.target,
        act,
        isSeed: e.source === "world",
        isLeak: e.type === "emergent",
        isSelf: e.source === e.target,
        offset: idx * 0.12,
      };
    });
  }, [model]);

  const sizeRef = useRef({ w: 800, h: 560 });
  const settledRef = useRef(false);

  const sizeCanvas = (canvas: HTMLCanvasElement, w: number, h: number) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  };

  // --- initial layout: settle the physics at the REAL frame size, synchronously
  // before paint (getBoundingClientRect forces layout, so width is accurate). ---
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const r = wrap.getBoundingClientRect();
    const w = Math.max(320, r.width);
    const h = Math.max(360, r.height);
    sizeRef.current = { w, h };
    sizeCanvas(canvas, w, h);
    settleLayout(sim.nodes, sim.links, w, h);
    settledRef.current = true;
  }, [sim]);

  // --- resize: rescale the settled layout to follow the frame ---
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(320, r.width);
      const h = Math.max(360, r.height);
      const prev = sizeRef.current;
      if (Math.abs(w - prev.w) < 1 && Math.abs(h - prev.h) < 1) return;
      sizeRef.current = { w, h };
      sizeCanvas(canvas, w, h);
      if (settledRef.current) {
        // re-fit the already-settled relative layout to the new frame
        fitToFrame(sim.nodes, w, h);
      } else {
        settleLayout(sim.nodes, sim.links, w, h);
        settledRef.current = true;
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [sim]);

  // --- pointer interaction (hit test nearest node) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pick = (clientX: number, clientY: number): string | null => {
      const r = canvas.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      let best: string | null = null;
      let bestD = 26 * 26;
      for (const n of sim.nodes) {
        const dx = (n.x ?? 0) - x;
        const dy = (n.y ?? 0) - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = n.id;
        }
      }
      return best;
    };
    const onMove = (e: MouseEvent) => {
      const id = pick(e.clientX, e.clientY);
      hoverRef.current = id;
      canvas.style.cursor = id ? "pointer" : "default";
    };
    const onClick = (e: MouseEvent) => {
      const id = pick(e.clientX, e.clientY);
      onSelectNode(id === selectedRef.current ? null : id);
    };
    const onLeave = () => {
      hoverRef.current = null;
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", onLeave);
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [sim, onSelectNode]);

  // --- the render loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const labelById = new Map(graph.nodes.map((n) => [n.id, n]));
    const bigGraph = graph.nodes.length > 60;
    const labelAll = graph.nodes.length <= 14;

    const stateAt = (id: string, p: number): { color: string; attn: number } => {
      const last = model.resolvedStates.length - 1;
      const f = Math.max(0, Math.min(last, Math.floor(p)));
      const c = Math.min(last, f + 1);
      const t = p - f;
      const sa = model.resolvedStates[f]?.[id] as NodeState | undefined;
      const sb = model.resolvedStates[c]?.[id] as NodeState | undefined;
      if (!sa) return { color: "#46506a", attn: 0.2 };
      const ca = affectColor(classifyAffect(sa));
      const cb = sb ? affectColor(classifyAffect(sb)) : ca;
      const attn = sa.mood.attention + ((sb?.mood.attention ?? sa.mood.attention) - sa.mood.attention) * t;
      return { color: mixHex(ca, cb, t), attn };
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const { w, h } = sizeRef.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const p = pRef.current ?? 0;
      const frame = resolveFrame(model, p);
      const lyr = layerRef.current;
      const sel = selectedRef.current;
      const hov = hoverRef.current;
      const breath = 0.5 + 0.5 * Math.sin(now / 1400);

      // causal trace: restart the reveal animation when a new trace arrives
      const tr = traceRef.current;
      if (tr && tr.nonce !== traceNonceRef.current) {
        traceNonceRef.current = tr.nonce;
        traceStartRef.current = now;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // active node set for current act
      const activeSet = new Set(model.ticks[frame.act]?.activeNodeIds ?? []);

      // ---------- edges (base constellation) ----------
      ctx.lineCap = "round";
      const edgeStroke = tr ? "rgba(120,140,180,0.022)" : "rgba(120,140,180,0.07)";
      for (const e of graph.edges) {
        const s = sim.byId.get(e.source);
        const t = sim.byId.get(e.target);
        if (!s || !t || e.source === e.target) continue;
        const sp = { x: s.x ?? 0, y: s.y ?? 0 };
        const tp = { x: t.x ?? 0, y: t.y ?? 0 };
        const { cx, cy } = controlPoint(sp, tp, e.id);
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.quadraticCurveTo(cx, cy, tp.x, tp.y);
        ctx.strokeStyle = edgeStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (tr && tr.chain.length) {
        // ============ cinematic causal trace ============
        const chainNodeIds = new Set<string>();
        for (const e of tr.chain) {
          if (e.source !== "world") chainNodeIds.add(e.source);
          chainNodeIds.add(e.target);
        }
        // dim every off-chain node to a faint dot
        for (const n of sim.nodes) {
          if (chainNodeIds.has(n.id)) continue;
          const baseR = TIER_RADIUS[labelById.get(n.id)?.tier ?? 2] ?? 5;
          ctx.fillStyle = "rgba(120,135,165,0.14)";
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, Math.max(2, baseR * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }

        const elapsed = (now - traceStartRef.current) / 1000;
        const perStep = 0.5;
        const nHops = tr.chain.length;
        const litNodes = new Map<string, number>();

        // draw the chain backward (leaf → root), revealing one hop at a time
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < nHops; k++) {
          const i = nHops - 1 - k;
          const reveal = Math.max(0, Math.min(1, elapsed / perStep - k));
          if (reveal <= 0) break;
          const e = tr.chain[i];
          const color = EVENT_COLOR[e.type] ?? "#8ea2c8";
          const srcNode = e.source === "world" ? null : sim.byId.get(e.source);
          const tgtNode = sim.byId.get(e.target);
          if (!tgtNode) continue;
          const tgtPt = { x: tgtNode.x ?? 0, y: tgtNode.y ?? 0 };
          const srcPt = srcNode
            ? { x: srcNode.x ?? 0, y: srcNode.y ?? 0 }
            : { x: tgtPt.x, y: -50 };
          const { cx, cy } = srcNode
            ? controlPoint(srcPt, tgtPt, e.id)
            : { cx: (srcPt.x + tgtPt.x) / 2, cy: (srcPt.y + tgtPt.y) / 2 };
          // reveal from target back toward source
          drawCurveSegment(ctx, tgtPt, srcPt, cx, cy, 0, reveal, color, e.type === "emergent");
          if (reveal < 1) {
            const head = quad(tgtPt, srcPt, cx, cy, reveal);
            const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 17);
            glow.addColorStop(0, withAlpha(color, 0.95));
            glow.addColorStop(1, withAlpha(color, 0));
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(head.x, head.y, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          if (e.source !== "world")
            litNodes.set(e.source, Math.max(litNodes.get(e.source) ?? 0, reveal));
          litNodes.set(
            e.target,
            Math.max(litNodes.get(e.target) ?? 0, Math.min(1, reveal * 1.5)),
          );
        }
        ctx.globalCompositeOperation = "source-over";

        // chain nodes: bright affect colour, labels, anchor emphasised
        for (const id of chainNodeIds) {
          const n = sim.byId.get(id);
          const lit = litNodes.get(id) ?? 0;
          if (!n || lit <= 0) continue;
          const meta = labelById.get(id);
          const tier = meta?.tier ?? 2;
          const baseR = (TIER_RADIUS[tier] ?? 5) + 1;
          const { color } = stateAt(id, p);
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          const isAnchor = id === tr.anchorId;

          ctx.globalCompositeOperation = "lighter";
          const haloR = baseR * 2.4 + 10 * lit + (isAnchor ? 9 : 0) + breath * 3;
          const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
          halo.addColorStop(0, withAlpha(color, 0.5 * lit + (isAnchor ? 0.22 : 0)));
          halo.addColorStop(1, withAlpha(color, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";

          ctx.beginPath();
          ctx.arc(x, y, baseR + (isAnchor ? 2 : 0), 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = isAnchor ? 2 : 1.2;
          ctx.strokeStyle = isAnchor ? "#ffffff" : withAlpha("#ffffff", 0.5 * lit);
          ctx.stroke();

          if (lit > 0.4) {
            const label = meta?.label ?? id;
            ctx.font = `${isAnchor ? 600 : 500} ${isAnchor ? 13 : 11.5}px ${CANVAS_FONT}`;
            const tw = ctx.measureText(label).width;
            const lx = x - tw / 2;
            const ly = y + baseR + 16;
            ctx.fillStyle = "rgba(6,8,13,0.78)";
            ctx.fillRect(lx - 5, ly - 11, tw + 10, 16);
            ctx.fillStyle = isAnchor ? "#ffffff" : withAlpha("#e7ecf6", 0.85);
            ctx.fillText(label, lx, ly);
          }
        }
      } else {

      // ---------- event particles ----------
      ctx.globalCompositeOperation = "lighter";
      const arrivals = new Map<string, number>(); // node id -> pulse strength 0..1
      const bursts = new Map<string, number>();
      let leakFlash = 0; // dramatic emphasis when an emergent leak fires

      for (const ev of eventViz) {
        if (!visibleOnLayer(ev.type, lyr)) continue;
        const color = EVENT_COLOR[ev.type] ?? "#8ea2c8";
        // local progress of this event
        let prog: number;
        if (ev.act < frame.act) prog = 1;
        else if (ev.act > frame.act) prog = -1;
        else {
          const span = 1 - ev.offset;
          prog = span > 0 ? (frame.sub - ev.offset) / span : 1;
        }
        if (prog < 0) continue; // not yet

        // resolve endpoints as concrete points
        const tgtNode = sim.byId.get(ev.target);
        if (!tgtNode) continue;
        const tgtPt = { x: tgtNode.x ?? w / 2, y: tgtNode.y ?? h / 2 };

        if (ev.isSelf) {
          // self event: a ring on the node itself
          if (prog < 1) bursts.set(ev.target, Math.max(bursts.get(ev.target) ?? 0, 1 - prog));
          continue;
        }

        const srcNode = ev.source === "world" ? null : sim.byId.get(ev.source);
        if (ev.source !== "world" && !srcNode) continue;
        const srcPt =
          ev.source === "world"
            ? { x: tgtPt.x, y: -50 }
            : { x: srcNode!.x ?? w / 2, y: srcNode!.y ?? h / 2 };

        const ep = Math.min(1, prog);
        const eased = easeInOut(ep);
        // emit burst at source as it fires
        if (ep < 0.25) bursts.set(ev.source, Math.max(bursts.get(ev.source) ?? 0, 1 - ep / 0.25));
        // arrival pulse at target near completion
        if (ep > 0.8) arrivals.set(ev.target, Math.max(arrivals.get(ev.target) ?? 0, (ep - 0.8) / 0.2));

        const { cx, cy } =
          ev.source === "world"
            ? { cx: (srcPt.x + tgtPt.x) / 2, cy: (srcPt.y + tgtPt.y) / 2 }
            : controlPoint(srcPt, tgtPt, ev.id);

        // lit trail up to the head
        drawCurveSegment(ctx, srcPt, tgtPt, cx, cy, 0, eased, color, ev.isLeak);

        // comet head
        const head = quad(srcPt, tgtPt, cx, cy, eased);
        const r = ev.isLeak ? 5.5 : 4;
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r * 4);
        glow.addColorStop(0, withAlpha(color, 0.9));
        glow.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(head.x, head.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(head.x, head.y, ev.isLeak ? 2.4 : 1.8, 0, Math.PI * 2);
        ctx.fill();

        // emergent leak: a shockwave off the source + a screen-wide flash beat
        if (ev.isLeak && ep > 0 && ep < 1) {
          const flash = Math.sin(ep * Math.PI);
          leakFlash = Math.max(leakFlash, flash);
          const rr = 8 + ep * 64;
          ctx.strokeStyle = withAlpha(EVENT_COLOR.emergent, 0.55 * (1 - ep));
          ctx.lineWidth = 2.4 * (1 - ep) + 0.4;
          ctx.beginPath();
          ctx.arc(srcPt.x, srcPt.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // emergent-leak vignette: the whole frame pulses in the leak colour
      if (leakFlash > 0.02) {
        const vg = ctx.createRadialGradient(
          w / 2,
          h / 2,
          Math.min(w, h) * 0.28,
          w / 2,
          h / 2,
          Math.max(w, h) * 0.72,
        );
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, withAlpha(EVENT_COLOR.emergent, 0.17 * leakFlash));
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      }

      // ---------- nodes ----------
      for (const n of sim.nodes) {
        const meta = labelById.get(n.id);
        const tier = meta?.tier ?? 2;
        const baseR = TIER_RADIUS[tier] ?? 5;
        const { color, attn } = stateAt(n.id, p);
        const isActive = activeSet.has(n.id) && frame.sub < 0.85;
        const arrive = arrivals.get(n.id) ?? 0;
        const burst = bursts.get(n.id) ?? 0;
        const isSel = sel === n.id;
        const isHov = hov === n.id;
        const inActive = activeSet.has(n.id);

        const x = n.x!;
        const y = n.y!;

        // soft glow halo (additive). On big graphs the full gradient is only
        // drawn for "interesting" nodes; idle dots get a cheap flat glow so we
        // keep 60fps with hundreds of nodes.
        ctx.globalCompositeOperation = "lighter";
        const lit = isActive || arrive > 0 || burst > 0 || isSel || isHov || attn > 0.5 || tier === 1;
        if (!bigGraph || lit) {
          const haloR = baseR * 2.4 + attn * 16 + (0.4 + 0.6 * breath) * (isActive ? 10 : 4);
          const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
          halo.addColorStop(0, withAlpha(color, 0.42 + attn * 0.25));
          halo.addColorStop(1, withAlpha(color, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = withAlpha(color, 0.16);
          ctx.beginPath();
          ctx.arc(x, y, baseR * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        // expanding rings for activity / arrival / burst
        const rings: Array<[number, number]> = [];
        if (isActive) rings.push([1 - frame.sub, 0.5]);
        if (arrive > 0) rings.push([1 - arrive, 0.7 * arrive]);
        if (burst > 0) rings.push([1 - burst, 0.5 * burst]);
        for (const [prog, alpha] of rings) {
          const rr = baseR + 4 + (1 - prog) * 26;
          ctx.strokeStyle = withAlpha(color, Math.max(0, alpha * prog));
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }

        // selection / hover ring
        if (isSel || isHov) {
          ctx.strokeStyle = isSel ? "#e7ecf6" : withAlpha("#e7ecf6", 0.5);
          ctx.lineWidth = isSel ? 2 : 1.2;
          ctx.beginPath();
          ctx.arc(x, y, baseR + 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        // core
        ctx.beginPath();
        ctx.arc(x, y, baseR + (isActive ? 1.5 : 0), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = withAlpha("#04060a", 0.6);
        ctx.stroke();
        // inner highlight
        ctx.beginPath();
        ctx.arc(x - baseR * 0.3, y - baseR * 0.3, baseR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();

        // labels: on a small world, tier-1 are always named; on a big world,
        // labels follow the action — acting nodes plus hover/select — so the
        // story stays readable without clutter.
        if ((labelAll && tier === 1) || inActive || isSel || isHov) {
          const label = meta?.label ?? n.id;
          ctx.font = `${tier === 1 ? 600 : 500} ${tier === 1 ? 12.5 : 11}px ${CANVAS_FONT}`;
          const tw = ctx.measureText(label).width;
          const lx = x - tw / 2;
          const ly = y + baseR + 15;
          ctx.fillStyle = "rgba(6,8,13,0.7)";
          ctx.fillRect(lx - 5, ly - 11, tw + 10, 16);
          ctx.fillStyle = isSel || isHov ? "#ffffff" : "rgba(231,236,246,0.82)";
          ctx.fillText(label, lx, ly);
        }
      }
      } // end of normal (non-trace) render branch
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [graph, model, eventViz, sim, pRef]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

/* ---------------- canvas helpers ---------------- */

/** Font stack for canvas text (ctx.font can't read CSS custom properties). */
const CANVAS_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Run the force sim to a settled state, then fit it to the frame. */
function settleLayout(nodes: SimNode[], links: SimLink[], w: number, h: number) {
  const sim = forceSimulation(nodes)
    .force("charge", forceManyBody().strength(-560))
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(Math.max(110, Math.min(w, h) * 0.26))
        .strength(0.5),
    )
    .force("center", forceCenter(w / 2, h / 2))
    .force("x", forceX(w / 2).strength(0.05))
    .force("y", forceY(h / 2).strength(0.08))
    .force("collide", forceCollide(40))
    .stop();
  for (let i = 0; i < 380; i++) sim.tick();
  fitToFrame(nodes, w, h);
}

/** Scale + centre the settled layout so its bounding box fills the frame nicely.
 * Robust to whatever size the sim happened to run at, and re-runnable on resize. */
function fitToFrame(nodes: SimNode[], w: number, h: number, margin = 86) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const scale = Math.min((w - 2 * margin) / bw, (h - 2 * margin) / bh, 1.9);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (const n of nodes) {
    n.x = w / 2 + ((n.x ?? 0) - cx) * scale;
    n.y = h / 2 + ((n.y ?? 0) - cy) * scale;
  }
}

function controlPoint(s: { x: number; y: number }, t: { x: number; y: number }, seed: string) {
  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular offset, signed by a hash of the edge id for separation
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const sign = hash % 2 === 0 ? 1 : -1;
  const k = 0.14 * sign;
  return { cx: mx + (-dy / len) * len * k, cy: my + (dx / len) * len * k };
}

function quad(
  s: { x: number; y: number },
  t: { x: number; y: number },
  cx: number,
  cy: number,
  u: number,
) {
  const mt = 1 - u;
  return {
    x: mt * mt * s.x + 2 * mt * u * cx + u * u * t.x,
    y: mt * mt * s.y + 2 * mt * u * cy + u * u * t.y,
  };
}

function drawCurveSegment(
  ctx: CanvasRenderingContext2D,
  s: { x: number; y: number },
  t: { x: number; y: number },
  cx: number,
  cy: number,
  from: number,
  to: number,
  color: string,
  leak: boolean,
) {
  const steps = 22;
  ctx.lineWidth = leak ? 2.4 : 1.8;
  if (leak) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const u = from + ((to - from) * i) / steps;
    const pt = quad(s, t, cx, cy, u);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.strokeStyle = withAlpha(color, leak ? 0.55 : 0.4);
  ctx.stroke();
  ctx.setLineDash([]);
}
