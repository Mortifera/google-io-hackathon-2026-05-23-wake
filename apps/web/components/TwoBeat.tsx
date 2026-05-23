"use client";

import { useMemo } from "react";
import type { Cascade, NodeState, World } from "@wake/contracts";
import { TWO_BEAT } from "../lib/scenarios";
import { affectStyle, withAlpha } from "../lib/palette";
import s from "./stage.module.css";

interface Props {
  world: World;
}

/** Ordered chain of distinct nodes the cascade flows through (first-appearance). */
function chainOf(cascade: Cascade): string[] {
  const seq: string[] = [];
  const seen = new Set<string>();
  for (const e of cascade.eventDag) {
    for (const id of [e.source, e.target]) {
      if (id === "world" || seen.has(id)) continue;
      seen.add(id);
      seq.push(id);
    }
  }
  return seq;
}

function MoodBar({ k, v }: { k: string; v: number }) {
  const pct = k === "sentiment" ? (v + 1) / 2 : v;
  const color = k === "urgency" ? "#f2b450" : k === "sentiment" ? "#5bd1a0" : "#5b9cf0";
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {k}
      </div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 600, color }}>
        {v >= 0 && k === "sentiment" ? "+" : ""}
        {v.toFixed(2)}
      </div>
      <div style={{ height: 4, borderRadius: 4, background: "var(--surface-3)", marginTop: 4, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.max(4, pct * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function Beat({
  side,
  world,
  label,
  worldName,
  cascade,
  focusId,
}: {
  side: "pre" | "post";
  world: World;
  label: string;
  worldName: string;
  cascade: Cascade;
  focusId: string;
}) {
  const nodeLabel =
    world.nodes.find((n) => n.id === focusId)?.label ?? focusId;
  const st = cascade.finalState[focusId] as NodeState | undefined;
  if (!st) return null;
  const aff = affectStyle(st);
  // intent verdict from the manager's drive: low urgency = parks it, high = pushes
  const buries = st.mood.urgency < 0.4;
  const verdict = buries ? "Buries it" : "Weaponizes it";
  const verdictColor = buries ? "#56c7d6" : "#f2b450";

  return (
    <div className={`${s.beatCol} ${side === "pre" ? s.beatColPre : s.beatColPost}`}>
      <div className={s.beatColHead}>
        <span className={s.beatWorld}>{label}</span>
        <span className={s.beatWorldSub}>{worldName}</span>
      </div>

      <div className={s.beatNode}>
        <span
          style={{ width: 11, height: 11, borderRadius: 11, background: aff.color }}
        />
        {nodeLabel}
      </div>
      <div
        className={s.beatAffect}
        style={{ color: aff.color, borderColor: withAlpha(aff.color, 0.4) }}
      >
        {aff.label} — {aff.blurb}
      </div>

      <div className={s.beatField}>
        <div className={s.beatFieldLabel}>Private interior — his real intent</div>
        <div className={s.beatInterior}>“{st.privateInterior}”</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <MoodBar k="attention" v={st.mood.attention} />
        <MoodBar k="sentiment" v={st.mood.sentiment} />
        <MoodBar k="urgency" v={st.mood.urgency} />
      </div>

      <div className={s.beatVerdict} style={{ color: verdictColor }}>
        <span
          className="tag"
          style={{ background: withAlpha(verdictColor, 0.14), color: verdictColor }}
        >
          {verdict}
        </span>
      </div>
    </div>
  );
}

export default function TwoBeat({ world }: Props) {
  const focusId = TWO_BEAT.focusNodeId;
  const chain = useMemo(() => chainOf(TWO_BEAT.pre.cascade), []);
  const labelOf = (id: string) =>
    world.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div className={s.beat}>
      <div className={s.beatHead}>
        <div className={s.beatKicker}>Same action · two worlds</div>
        <div className={s.beatTitle}>An engineer pitches the same idea</div>
        <div className={s.beatSub}>
          Maya proposes AI auto-linking of Notion pages. The cascade runs the same
          path in both worlds — only the manager’s intent inverts.
        </div>
      </div>

      <div className={s.beatChain}>
        {chain.map((id, i) => (
          <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className={s.beatChainNode} data-focus={id === focusId}>
              <span className="dot" />
              {labelOf(id)}
            </span>
            {i < chain.length - 1 ? <span className={s.beatArrow}>→</span> : null}
          </span>
        ))}
      </div>
      <div className={s.beatChainNote}>
        Identical chain, identical reach — the difference is in the reasoning.
      </div>

      <div className={s.beatCols}>
        <Beat
          side="pre"
          world={world}
          label={TWO_BEAT.pre.label}
          worldName={TWO_BEAT.pre.world}
          cascade={TWO_BEAT.pre.cascade}
          focusId={focusId}
        />
        <Beat
          side="post"
          world={world}
          label={TWO_BEAT.post.label}
          worldName={TWO_BEAT.post.world}
          cascade={TWO_BEAT.post.cascade}
          focusId={focusId}
        />
      </div>

      <div className={s.beatPunch}>
        Same action. Same manager. <span className="em">Opposite intent</span> —
        because the world changed.
      </div>
    </div>
  );
}
