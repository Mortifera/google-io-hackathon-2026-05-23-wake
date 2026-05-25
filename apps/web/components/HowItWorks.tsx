"use client";

/**
 * How it works as ONE continuous mechanism sequence (not three isolated cards):
 * the same scenario - an acquisition - moving through the instrument, type →
 * world → futures, the three product frames strung on a single through-line.
 * (Schwartz: syllogistic mechanization - each beat the consequent of the last.)
 */
import StaggerReveal from "./StaggerReveal";
import s from "../app/marketing.module.css";

const AFFECT = ["#56c7d6", "#5b9cf0", "#4fd18b", "#f2b450", "#f0556b", "#b06bf0"];

function FrameInput() {
  return (
    <div className={s.hwInput}>
      <div className={s.hwInputField}>
        <span className={s.hwTyped}>Acquired by Microsoft</span>
        <span className={s.hwCaret} aria-hidden="true" />
      </div>
      <div className={s.hwRun}>↵ build the world</div>
    </div>
  );
}

function FrameWorld() {
  const nodes: [number, number, number][] = [
    [34, 80, 1], [60, 40, 0], [70, 120, 2], [98, 66, 1], [112, 30, 3],
    [118, 108, 4], [144, 54, 1], [150, 96, 2], [174, 34, 0], [180, 78, 3],
    [188, 116, 4], [206, 56, 5], [214, 100, 1], [236, 42, 2], [242, 86, 3], [248, 120, 4],
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
    <div className={s.hwWorld}>
      <svg viewBox="0 0 282 150" fill="none" aria-hidden="true" className={s.hwSvg}>
        {edges.map(([a, b], k) => (
          <line key={k} className={s.svEdge} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
        ))}
        {nodes.map(([x, y, c], i) => (
          <circle key={i} className={s.svNode} cx={x} cy={y} r={3.4}
            style={{ fill: AFFECT[c], animationDelay: `${(i % 6) * 0.22}s` }} />
        ))}
      </svg>
      <div className={s.hwReason}>
        <span className={s.hwReasonPub}>&ldquo;huge for our users&rdquo;</span>
        <span className={s.hwReasonPriv}>privately: we lost the indie story</span>
      </div>
    </div>
  );
}

function FrameFutures() {
  const CL = [
    { c: "#4fd18b", y: 32, label: "integration", n: 19 },
    { c: "#f0556b", y: 76, label: "backlash", n: 24 },
    { c: "#f2b450", y: 118, label: "competitor", n: 9 },
  ];
  return (
    <svg viewBox="0 0 282 150" fill="none" aria-hidden="true" className={s.hwSvg}>
      {CL.map((cl, i) =>
        [0, 1, 2, 3].map((k) => (
          <path key={`${i}-${k}`} className={s.svStrand}
            d={`M 30 76 C 100 76, 138 ${cl.y + (k - 1.5) * 6}, 188 ${cl.y + (k - 1.5) * 6}`}
            stroke={cl.c} style={{ animationDelay: `${i * 0.3}s` }} />
        )),
      )}
      {CL.map((cl, i) => (
        <g key={`c${i}`}>
          <circle cx={188} cy={cl.y} r={4} fill={cl.c} />
          <text className={s.svCount} x={200} y={cl.y - 1} style={{ fill: cl.c }}>{cl.n}</text>
          <text className={s.svClabel} x={200} y={cl.y + 10}>{cl.label}</text>
        </g>
      ))}
      <circle className={s.svSeed} cx={30} cy={76} r={6} />
    </svg>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Type one action",
    body: "An acquisition, a launch, a layoff, a price change. One sentence. About two cents, or start from a prebuilt world.",
    visual: <FrameInput />,
  },
  {
    n: "02",
    title: "It builds the world, in character",
    body: "Wake researches the real people, communities, and platforms involved, each reasoning with a public face and a private interior that can diverge.",
    visual: <FrameWorld />,
  },
  {
    n: "03",
    title: "Watch the futures",
    body: "The action propagates tick by tick into a distribution of outcomes. You read who reacts and why, and every outcome traces back to its cause.",
    visual: <FrameFutures />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className={s.how}>
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>One sentence in. A world out.</h2>
          <p className={s.sectionSub}>One scenario, an acquisition, moving through the instrument.</p>
        </div>
        <div className={s.flow}>
          <div className={s.flowLine} aria-hidden="true" />
          <span className={s.flowPulse} aria-hidden="true" />
          <StaggerReveal className={s.flowBeats}>
          {STEPS.map((step) => (
            <div className={s.flowBeat} key={step.n}>
              <div className={s.flowFrame}>
                <div className={s.flowChrome} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div className={s.flowViz}>{step.visual}</div>
              </div>
              <div className={s.flowNum}>{step.n}</div>
              <div className={s.flowTitle}>{step.title}</div>
              <div className={s.flowBody}>{step.body}</div>
            </div>
          ))}
          </StaggerReveal>
        </div>
      </div>
    </section>
  );
}
