import Link from "next/link";
import MarketingHeroVisual from "../components/MarketingHeroVisual";
import BeatVisual from "../components/BeatVisual";
import ClaimVisual from "../components/ClaimVisual";
import Reveal from "../components/Reveal";
import s from "./marketing.module.css";

// Early-product landing, kept lean: hero (fan) → one problem beat → how it works
// (each step shows the product) → "a map, not a prediction" → CTA. Copy is
// grounded in a Breakthrough Advertising diagnosis (Stage 3 awareness: lead with
// the desire; Stage 1 sophistication: direct claim, mechanism in the body,
// honesty as an asset).
export const metadata = {
  title: "Wake — watch your decision before you make it",
  description:
    "The first world model for organizational action. Type one decision and watch hundreds of real people and platforms reason through what happens next — live, and traceable to the cause.",
};

// ── Step visuals — these SHOW the product (graph, reasoning, fan). SVG + CSS. ──
const AFFECT = ["#56c7d6", "#5b9cf0", "#4fd18b", "#f2b450", "#f0556b", "#b06bf0"];

function StepWorld() {
  // A believable org graph: named tiers + cohorts, affect-colored, edges to
  // nearest prior node. Looks like the world Genesis builds.
  const nodes: [number, number, number][] = [
    [38, 84, 1], [66, 40, 0], [74, 124, 2], [104, 70, 1], [118, 30, 3],
    [124, 112, 4], [150, 56, 1], [156, 98, 2], [180, 34, 0], [186, 80, 3],
    [192, 120, 4], [214, 56, 5], [222, 102, 1], [244, 42, 2], [248, 88, 3], [252, 124, 4],
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
    <svg viewBox="0 0 290 160" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {edges.map(([a, b], k) => (
        <line key={k} className={s.svEdge} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
      ))}
      {nodes.map(([x, y, c], i) => (
        <circle key={i} className={s.svNode} cx={x} cy={y} r={3.6}
          style={{ fill: AFFECT[c], animationDelay: `${(i % 6) * 0.22}s` }} />
      ))}
      <text className={s.svLabel} x={58} y={22}>press</text>
      <text className={s.svLabel} x={196} y={150}>power users</text>
    </svg>
  );
}

function StepReason() {
  // The product's signature: a node reasoning, public face vs private interior.
  return (
    <div className={s.rxCard}>
      <div className={s.rxHead}>
        <span className={s.rxDot} />
        <span className={s.rxName}>Head of Comms</span>
        <span className={s.rxThinking}>reasoning…</span>
      </div>
      <div className={s.rxPublic}>“Thrilled to join Microsoft — huge for our users.”</div>
      <div className={s.rxPrivate}>privately: “we just lost the indie story that built us.”</div>
    </div>
  );
}

function StepFutures() {
  const CL = [
    { c: "#4fd18b", y: 36, label: "integration", n: 19 },
    { c: "#f0556b", y: 82, label: "backlash", n: 24 },
    { c: "#f2b450", y: 126, label: "competitor", n: 9 },
  ];
  return (
    <svg viewBox="0 0 290 160" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {CL.map((cl, i) =>
        [0, 1, 2, 3].map((k) => (
          <path key={`${i}-${k}`} className={s.svStrand}
            d={`M 34 82 C 108 82, 150 ${cl.y + (k - 1.5) * 6}, 196 ${cl.y + (k - 1.5) * 6}`}
            stroke={cl.c} style={{ animationDelay: `${i * 0.3}s` }} />
        )),
      )}
      {CL.map((cl, i) => (
        <g key={`c${i}`}>
          <circle cx={196} cy={cl.y} r={4} fill={cl.c} />
          <text className={s.svCount} x={208} y={cl.y - 1} style={{ fill: cl.c }}>{cl.n}</text>
          <text className={s.svClabel} x={208} y={cl.y + 10}>{cl.label}</text>
        </g>
      ))}
      <circle className={s.svSeed} cx={34} cy={82} r={6} />
    </svg>
  );
}

const STEPS = [
  {
    n: "01 · Build the world",
    visual: <StepWorld />,
    title: "From one sentence",
    body: "Wake researches the real people, communities, and platforms involved, and writes every dossier with Gemini. About two cents — or start from a prebuilt world.",
  },
  {
    n: "02 · Drop in your action",
    visual: <StepReason />,
    title: "It reasons in character",
    body: "Each entity thinks with a public face and a private interior that can diverge. Run it once, A/B two decisions, or fan out a hundred futures.",
  },
  {
    n: "03 · Watch it unfold",
    visual: <StepFutures />,
    title: "Live, and cited",
    body: "The action propagates tick by tick into a distribution of outcomes. You read who reacts and why — and every outcome traces back to the event that caused it.",
  },
];

export default function MarketingPage() {
  return (
    <div className={s.root}>
      <div className={s.aurora} />
      <div className={s.grid} />

      <nav className={s.nav}>
        <span className={s.brand}>
          Wake<span className={s.dot}>.</span>
        </span>
        <div className={s.navRight}>
          <Link href="/app" className={s.navLink}>
            Prebuilt worlds
          </Link>
          <Link href="/app" className={s.navCta}>
            Launch app
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <h1 className={s.headline}>Watch your decision before you make it.</h1>
          <p className={s.sub}>
            Type one action — an acquisition, a launch, a layoff. Wake builds a{" "}
            <em>live world model</em> around it: the real people, communities, and
            platforms involved each reason through what happens next, and every outcome
            cites its cause.
          </p>
          <div className={s.ctaRow}>
            <Link href="/app" className={s.ctaPrimary}>
              Run it now →
            </Link>
            <Link href="/app" className={s.ctaSecondary}>
              See a live example
            </Link>
          </div>
          <div className={s.proofline}>
            <span>one sentence in</span>
            <span className={s.proofSep}>·</span>
            <span>a world out</span>
            <span className={s.proofSep}>·</span>
            <span>
              about <b>2¢</b>
            </span>
          </div>
        </div>
        <MarketingHeroVisual />
      </header>

      <div className={s.divider} />

      {/* Problem beat — the statement paired with the blind-spot visual */}
      <Reveal>
      <section className={s.beat}>
        <div>
          <h2 className={s.beatText}>
            You can map the decision. You can&apos;t map the{" "}
            <em>world it lands in</em>.
          </h2>
          <p className={s.beatSub}>
            You make the call, then you wait. The press runs an angle you didn&apos;t
            anticipate. A community takes it as a signal you never meant to send. A
            competitor moves. By the time you know what actually happened, you&apos;re
            already in damage control — and the standard answer to &ldquo;what happens if we
            do this?&rdquo; was gut, or a consultant&apos;s gut.
          </p>
        </div>
        <BeatVisual />
      </section>
      </Reveal>

      {/* How it works — each step shows the product */}
      <Reveal>
      <section className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>One sentence in. A world out.</h2>
          </div>
          <div className={s.steps}>
            {STEPS.map((step) => (
              <div className={s.step} key={step.n}>
                <div className={s.stepVisual}>{step.visual}</div>
                <div className={s.stepBodyWrap}>
                  <div className={s.stepNum}>{step.n}</div>
                  {step.title && <div className={s.stepTitle}>{step.title}</div>}
                  <div className={s.stepBody}>{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </Reveal>

      <div className={s.divider} />

      {/* The honest claim — paired with the distribution it describes */}
      <Reveal>
      <section className={s.claim}>
        <div className={s.claimCard}>
          <h2 className={s.claimTitle}>A map, not a prediction.</h2>
          <p className={s.claimBody}>
            Wake runs hundreds of imagined futures in parallel — not to predict the one
            that happens, but to show you the space of what can: which trajectories are
            common, which are rare, and the single variable that tips the balance. The
            operator who has seen the <em>distribution of outcomes</em>, before they act,
            isn&apos;t flying blind. They&apos;re flying with a map.
          </p>
          <ClaimVisual />
        </div>
      </section>
      </Reveal>

      {/* Final CTA */}
      <Reveal>
      <section className={s.finalCta}>
        <h2 className={s.finalTitle}>Watch your decision before you make it.</h2>
        <Link href="/app" className={s.ctaPrimary}>
          Run a simulation →
        </Link>
        <div className={s.finalProof}>
          no account needed <span className={s.proofSep}>·</span> a world for <b>~2¢</b>{" "}
          <span className={s.proofSep}>·</span> 32 futures for <b>$3</b>
        </div>
      </section>
      </Reveal>

      <footer className={s.footer}>
        <span>
          Wake<span className={s.dot}>.</span>
        </span>
        <span>Built on Gemini 3.5 Flash</span>
      </footer>
    </div>
  );
}
