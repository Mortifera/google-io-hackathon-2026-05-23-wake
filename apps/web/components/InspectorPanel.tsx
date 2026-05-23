"use client";

import type { Event, NodeState } from "@wake/contracts";
import type { CascadeModel, GraphModel } from "../lib/model";
import { resolveFrame } from "../lib/model";
import {
  affectStyle,
  EVENT_COLOR,
  EVENT_LABEL,
  withAlpha,
} from "../lib/palette";
import type { ExplanationResult } from "../lib/explain";
import s from "./stage.module.css";

type Layer = "public" | "private";
export type Focus =
  | { kind: "node"; id: string }
  | { kind: "event"; id: string }
  | { kind: "none" };

interface Props {
  graph: GraphModel;
  model: CascadeModel;
  /** Throttled playback position for the live readout. */
  p: number;
  layer: Layer;
  focus: Focus;
  setFocus: (f: Focus) => void;
  /** The active causal trace's explanation (owned by Stage), if any. */
  explanation: ExplanationResult | null;
  /** Request a trace for the current focus (the "Ask why" gesture). */
  onAskWhy: () => void;
}

function MoodCell({ k, v, color }: { k: string; v: number; color: string }) {
  // sentiment is -1..1; render midpoint for that one
  const pct = k === "sentiment" ? (v + 1) / 2 : v;
  return (
    <div className={s.moodCell}>
      <div className="k">{k}</div>
      <div className="v mono" style={{ color }}>
        {v >= 0 && k === "sentiment" ? "+" : ""}
        {v.toFixed(2)}
      </div>
      <div className={s.bar}>
        <span style={{ width: `${Math.max(4, pct * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function NodeDetail({
  graph,
  model,
  nodeId,
  layer,
  tick,
  explanation,
  onAskWhy,
}: {
  graph: GraphModel;
  model: CascadeModel;
  nodeId: string;
  layer: Layer;
  tick: number;
  explanation: ExplanationResult | null;
  onAskWhy: () => void;
}) {
  const node = graph.nodes.find((n) => n.id === nodeId);
  const st = model.resolvedStates[tick]?.[nodeId] as NodeState | undefined;

  if (!node || !st) return null;
  const aff = affectStyle(st);
  const face = layer === "public" ? st.publicFace : st.privateInterior;
  const faceLabel = layer === "public" ? "Public face" : "Private interior";

  return (
    <div>
      <div className={s.nodeName}>
        <span
          className={s.swatch}
          style={{ width: 12, height: 12, background: aff.color }}
        />
        {node.label}
      </div>
      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
        <span className={s.pill}>Tier {node.tier}</span>
        <span className={s.pill}>{node.fn}</span>
      </div>
      <div
        className={s.affectTag}
        style={{ color: aff.color, borderColor: withAlpha(aff.color, 0.4) }}
      >
        <span className={s.swatch} style={{ background: aff.color }} />
        {aff.label} — {aff.blurb}
      </div>

      <div className={s.field}>
        <div className={s.fieldLabel}>{faceLabel}</div>
        <div className={`${s.fieldVal} ${layer === "private" ? "" : ""}`}>
          {face || <span style={{ color: "var(--text-faint)" }}>—</span>}
        </div>
      </div>

      {st.beliefs ? (
        <div className={s.field}>
          <div className={s.fieldLabel}>Beliefs</div>
          <div className={`${s.fieldVal} dim`}>{st.beliefs}</div>
        </div>
      ) : null}

      <div className={s.moodRow}>
        <MoodCell k="attention" v={st.mood.attention} color="#5b9cf0" />
        <MoodCell k="sentiment" v={st.mood.sentiment} color={aff.color} />
        <MoodCell k="urgency" v={st.mood.urgency} color="#f2b450" />
      </div>

      {st.commitments.length ? (
        <div className={s.field}>
          <div className={s.fieldLabel}>Commitments</div>
          <div className={`${s.fieldVal} dim`}>{st.commitments.join(" · ")}</div>
        </div>
      ) : null}

      <button className={s.askBtn} onClick={onAskWhy}>
        {explanation ? "↻ Replay the causal trace" : "Ask why this node ended up here →"}
      </button>

      {explanation ? <ExplanationView graph={graph} exp={explanation} /> : null}
    </div>
  );
}

function EventDetail({
  graph,
  model,
  eventId,
  explanation,
}: {
  graph: GraphModel;
  model: CascadeModel;
  eventId: string;
  explanation: ExplanationResult | null;
}) {
  const ev = model.eventById.get(eventId);
  if (!ev) return null;
  const color = EVENT_COLOR[ev.type] ?? "#8ea2c8";
  const srcL = graph.nodes.find((n) => n.id === ev.source)?.label ?? ev.source;
  const tgtL = graph.nodes.find((n) => n.id === ev.target)?.label ?? ev.target;
  return (
    <div>
      <div className={s.nodeName} style={{ fontSize: 15 }}>
        <span className={s.swatch} style={{ width: 12, height: 12, background: color }} />
        {EVENT_LABEL[ev.type] ?? ev.type}
      </div>
      <div className={s.logRoute} style={{ marginTop: 6 }}>
        {srcL} → {tgtL} · <span className="mono">{ev.id}</span>
      </div>
      <div className={s.field}>
        <div className={s.fieldLabel}>What happened</div>
        <div className={s.fieldVal}>{ev.content}</div>
      </div>
      {ev.rationale ? (
        <div className={s.field}>
          <div className={s.fieldLabel}>Rationale</div>
          <div className={`${s.fieldVal} dim`}>“{ev.rationale}”</div>
        </div>
      ) : null}
      {explanation ? <ExplanationView graph={graph} exp={explanation} /> : null}
    </div>
  );
}

function ExplanationView({
  graph,
  exp,
}: {
  graph: GraphModel;
  exp: ExplanationResult;
}) {
  return (
    <div className={s.explain}>
      <div className={s.explainHead}>
        Interpretability
        <span className={s.explainBadge}>
          {exp.source === "local-trace" ? "DAG trace · stub" : "live"}
        </span>
      </div>
      <div className={s.explainText}>{exp.answer}</div>
      {exp.chain.length ? (
        <div className={s.chain}>
          {exp.chain.map((e, i) => {
            const color = EVENT_COLOR[e.type] ?? "#8ea2c8";
            const srcL =
              e.source === "world"
                ? "Seed"
                : graph.nodes.find((n) => n.id === e.source)?.label ?? e.source;
            const tgtL =
              graph.nodes.find((n) => n.id === e.target)?.label ?? e.target;
            return (
              <div className={s.chainStep} key={e.id}>
                <div className={s.chainRail}>
                  <span className={s.chainDot} style={{ background: color }} />
                  {i < exp.chain.length - 1 ? <span className={s.chainLine} /> : null}
                </div>
                <div className={s.chainBody}>
                  <div className={s.chainId}>
                    <span className="mono">{e.id}</span> · {srcL} → {tgtL}
                  </div>
                  <div className={s.chainContent}>{e.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function EventLog({
  graph,
  model,
  p,
  layer,
  setFocus,
  focusId,
}: {
  graph: GraphModel;
  model: CascadeModel;
  p: number;
  layer: Layer;
  setFocus: (f: Focus) => void;
  focusId: string | null;
}) {
  const frame = resolveFrame(model, p);
  // Events that have fired up to the current position, on the active layer.
  const visible: Event[] = [];
  model.ticks.forEach((t, i) => {
    if (i > frame.act) return;
    for (const e of t.events) {
      const ok =
        e.type === "emergent" ||
        (layer === "public"
          ? e.type === "public_post" || e.type === "action"
          : e.type === "private_message" || e.type === "decision");
      if (ok) visible.push(e);
    }
  });
  visible.reverse();

  return (
    <div style={{ marginTop: 18 }}>
      <div className={s.logHead}>
        <div className={s.panelTitle}>
          {layer === "public" ? "Public channel" : "Private channel"}
        </div>
        <div className={s.panelTitle} style={{ color: "var(--text-dim)" }}>
          {visible.length}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className={s.empty}>No events on this layer yet — press play.</div>
      ) : (
        visible.map((e) => {
          const color = EVENT_COLOR[e.type] ?? "#8ea2c8";
          const srcL = graph.nodes.find((n) => n.id === e.source)?.label ?? e.source;
          const tgtL = graph.nodes.find((n) => n.id === e.target)?.label ?? e.target;
          return (
            <div
              key={e.id}
              className={s.logItem}
              style={{ opacity: focusId === e.id ? 1 : 0.92 }}
              onClick={() => setFocus({ kind: "event", id: e.id })}
            >
              <span className={s.logBar} style={{ background: color }} />
              <div style={{ minWidth: 0 }}>
                <div className={s.logMeta}>
                  <span className={s.logType} style={{ color }}>
                    {EVENT_LABEL[e.type] ?? e.type}
                  </span>
                  {e.type === "emergent" ? <span>· leak</span> : null}
                </div>
                <div className={s.logContent}>{e.content}</div>
                <div className={s.logRoute}>
                  {e.source === "world" ? "Seed" : srcL} → {tgtL}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function InspectorPanel({
  graph,
  model,
  p,
  layer,
  focus,
  setFocus,
  explanation,
  onAskWhy,
}: Props) {
  const tick = resolveFrame(model, p).tick;
  return (
    <aside className={s.side}>
      <div className={s.panelHead}>
        <div className={s.panelTitle}>Inspector</div>
      </div>
      <div className={s.panelScroll}>
        {focus.kind === "node" ? (
          <NodeDetail
            graph={graph}
            model={model}
            nodeId={focus.id}
            layer={layer}
            tick={tick}
            explanation={explanation}
            onAskWhy={onAskWhy}
          />
        ) : focus.kind === "event" ? (
          <EventDetail
            graph={graph}
            model={model}
            eventId={focus.id}
            explanation={explanation}
          />
        ) : (
          <div className={s.empty}>
            Click a node to inspect its public face, private interior, and mood —
            then ask <strong>why</strong> it ended up there. Or click an event in
            the log below to trace its cause.
          </div>
        )}

        <EventLog
          graph={graph}
          model={model}
          p={p}
          layer={layer}
          setFocus={setFocus}
          focusId={focus.kind === "event" ? focus.id : null}
        />
      </div>
    </aside>
  );
}
