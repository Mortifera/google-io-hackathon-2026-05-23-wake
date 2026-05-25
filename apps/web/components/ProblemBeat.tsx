"use client";

/**
 * Problem beat as a before/after contrast (Schwartz's bad/good Concentration):
 * LEFT — how you decide now: a flat, dim, brittle artifact. RIGHT — the same
 * decision as a Wake world-model: bright, affect-coloured, alive. The visual
 * does the arguing; the copy stays short.
 */
import StaggerReveal from "./StaggerReveal";
import s from "../app/marketing.module.css";

const AFFECT = ["#56c7d6", "#5b9cf0", "#4fd18b", "#f2b450", "#f0556b", "#b06bf0"];

function WorldGraph() {
  const nodes: [number, number, number][] = [
    [40, 90, 1], [70, 44, 0], [78, 132, 2], [110, 74, 1], [126, 34, 3],
    [132, 120, 4], [158, 60, 1], [166, 104, 2], [192, 38, 0], [198, 86, 3],
    [206, 126, 4], [230, 60, 5], [238, 108, 1], [262, 46, 2], [268, 92, 3], [274, 130, 4],
  ];
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => {
    let best = -1, bd = 1e9;
    nodes.forEach((m, j) => {
      if (j >= i) return;
      const d = (m[0] - n[0]) ** 2 + (m[1] - n[1]) ** 2;
      if (d < bd) { bd = d; best = j; }
    });
    if (best >= 0) edges.push([i, best]);
  });
  return (
    <svg viewBox="0 0 300 168" fill="none" aria-hidden="true" className={s.baSvg}>
      {edges.map(([a, b], k) => (
        <line key={k} className={s.svEdge} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
      ))}
      {nodes.map(([x, y, c], i) => (
        <circle key={i} className={s.svNode} cx={x} cy={y} r={3.4}
          style={{ fill: AFFECT[c], animationDelay: `${(i % 6) * 0.22}s` }} />
      ))}
    </svg>
  );
}

export default function ProblemBeat() {
  return (
    <section className={s.beat2}>
      <div className={s.beat2Head}>
        <h2 className={s.beatText}>
          You can map the decision. You can&apos;t map the <em>world it lands in</em>.
        </h2>
        <p className={s.beatSub}>
          Every tool you have maps your side of the move. None of them models the
          hundreds of people, communities, and platforms who decide what it actually means.
        </p>
      </div>
      <StaggerReveal className={s.baRow}>
        <figure className={s.baBefore}>
          <figcaption className={s.baTag}>how you decide now</figcaption>
          <div className={s.baFlat}>
            <div className={s.baFlatRow}>Acquire by Microsoft</div>
            <div className={s.baFlatArrow}>↓</div>
            <div className={s.baFlatGuess}>
              best guess: <em>probably fine?</em>
            </div>
            <div className={s.baFlatBar}><span /></div>
            <div className={s.baFlatWait}>then wait &amp; see</div>
          </div>
        </figure>
        <div className={s.baVs} aria-hidden="true">vs</div>
        <figure className={s.baAfter}>
          <figcaption className={`${s.baTag} ${s.baTagLive}`}>with Wake</figcaption>
          <WorldGraph />
          <div className={s.baAfterFoot}>the world, modeled — every actor, reasoning</div>
        </figure>
      </StaggerReveal>
    </section>
  );
}
