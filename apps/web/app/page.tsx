import Link from "next/link";
import MarketingHeroVisual from "../components/MarketingHeroVisual";
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

// ── Step visuals (static SVG motifs — show the product, stay lightweight) ──
function StepGraph() {
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true">
      <line className={s.svEdge} x1="42" y1="60" x2="96" y2="32" />
      <line className={s.svEdge} x1="42" y1="60" x2="96" y2="88" />
      <line className={s.svEdge} x1="96" y1="32" x2="150" y2="46" />
      <line className={s.svEdge} x1="96" y1="88" x2="150" y2="80" />
      <line className={s.svEdge} x1="150" y1="46" x2="200" y2="34" />
      <line className={s.svEdge} x1="150" y1="46" x2="200" y2="64" />
      <line className={s.svEdge} x1="150" y1="80" x2="200" y2="96" />
      {[
        [42, 60], [96, 32], [96, 88], [150, 46], [150, 80], [200, 34], [200, 64], [200, 96],
      ].map(([x, y], i) => (
        <circle key={i} className={s.svNode} cx={x} cy={y} r={i === 0 ? 5.5 : 4} />
      ))}
    </svg>
  );
}
function StepAction() {
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true">
      <line className={s.svEdge} x1="48" y1="60" x2="124" y2="40" />
      <line className={s.svEdge} x1="48" y1="60" x2="124" y2="80" />
      <line className={s.svEdge} x1="124" y1="40" x2="196" y2="32" />
      <line className={s.svEdge} x1="124" y1="80" x2="196" y2="64" />
      <line className={s.svEdge} x1="124" y1="80" x2="196" y2="94" />
      {[[124, 40], [124, 80], [196, 32], [196, 64], [196, 94]].map(([x, y], i) => (
        <circle key={i} className={s.svNode} cx={x} cy={y} r={3.6} />
      ))}
      <circle className={s.svPulse} cx={48} cy={60} r={7} />
    </svg>
  );
}
function StepFan() {
  const C = ["#4fd18b", "#f0556b", "#f2b450"];
  const ends = [34, 60, 92];
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true">
      {ends.map((ey, i) => (
        <path
          key={i}
          d={`M 44 60 C 110 60, 150 ${ey}, 196 ${ey}`}
          stroke={C[i]}
          strokeWidth={1.5}
          opacity={0.7}
          fill="none"
        />
      ))}
      {ends.map((ey, i) => (
        <circle key={`d${i}`} cx={196} cy={ey} r={3.4} fill={C[i]} />
      ))}
      <circle cx={44} cy={60} r={6} fill="var(--accent)" />
    </svg>
  );
}

const STEPS = [
  {
    n: "01 · Build the world",
    visual: <StepGraph />,
    title: "From one sentence",
    body: "Wake researches the real people, communities, and platforms involved, and writes every dossier with Gemini. About two cents — or start from a prebuilt world.",
  },
  {
    n: "02 · Drop in your action",
    visual: <StepAction />,
    title: "",
    body: "An acquisition, a launch, a price change, a post. Choose where it enters — then run it once, A/B two decisions, or fan out a hundred futures.",
  },
  {
    n: "03 · Watch it unfold",
    visual: <StepFan />,
    title: "Live, and cited",
    body: "Hundreds of reasoners think live — each with a public face and a private interior that can diverge. You read who reacts, why, and every outcome traces back to the event that caused it.",
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

      {/* One problem beat */}
      <section className={s.beat}>
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
      </section>

      {/* How it works — each step shows the product */}
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

      {/* The honest claim */}
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
        </div>
      </section>

      {/* Final CTA */}
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

      <footer className={s.footer}>
        <span>
          Wake<span className={s.dot}>.</span>
        </span>
        <span>Built on Gemini 3.5 Flash</span>
      </footer>
    </div>
  );
}
