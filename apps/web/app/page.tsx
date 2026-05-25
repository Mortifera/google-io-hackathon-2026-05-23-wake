import Link from "next/link";
import MarketingHeroVisual from "../components/MarketingHeroVisual";
import s from "./marketing.module.css";

// The product front door. The app lives at /app (the Studio flow); this page
// sells the idea. Copy is grounded in a Breakthrough Advertising diagnosis:
// Stage 3 awareness (lead with the desire, not the product) + Stage 1
// sophistication (a direct claim; mechanism in the body; the honest
// "instrument, not oracle" framing is an asset).
export const metadata = {
  title: "Wake — watch your decision before you make it",
  description:
    "The first world model for organizational action. Type one decision and watch hundreds of real people and platforms reason through what happens next — live, and traceable to the cause.",
};

const STEPS = [
  {
    n: "01",
    title: "Build the world",
    body: "One sentence. Wake researches the real cast with Google Search, sizes the graph to a budget, and writes every dossier with Gemini. About two cents. Or start from a prebuilt world.",
  },
  {
    n: "02",
    title: "Drop in your action",
    body: "An acquisition, a launch, a price change, a post. Choose where it enters — then run it once, A/B two decisions, or fan out a hundred futures.",
  },
  {
    n: "03",
    title: "Watch it unfold",
    body: "Hundreds of reasoners think in public and in private, tick by tick. You read who reacts and why, and every outcome cites the events that caused it.",
  },
];

const STATS = [
  {
    num: <>200<span>+</span></>,
    label:
      "people, communities, and platforms in a world — each a Gemini reasoner with a public face and a private interior that can diverge.",
  },
  {
    num: <>~2<span>¢</span></>,
    label:
      "to build a whole world from a single sentence — researched, sized, and written by Gemini Flash.",
  },
  {
    num: <><span>$</span>3</>,
    label:
      "for 32 futures over 200 nodes. Frontier reasoning, cheap enough to run the distribution — not just one guess.",
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
          <div className={`${s.eyebrow} ${s.heroEyebrow}`}>
            The first world model for organizational action
          </div>
          <h1 className={s.headline}>Watch your decision before you make it.</h1>
          <p className={s.sub}>
            Type one action — an acquisition, a launch, a layoff, a post. Wake builds
            the world it lands in and lets <em>hundreds of real people and platforms</em>{" "}
            reason through what happens next. Live, and traceable to the cause.
          </p>
          <div className={s.ctaRow}>
            <Link href="/app" className={s.ctaPrimary}>
              Run a simulation →
            </Link>
            <Link href="/app" className={s.ctaSecondary}>
              See a prebuilt world
            </Link>
          </div>
          <div className={s.proofline}>
            <span>one sentence in</span>
            <span className={s.proofSep}>·</span>
            <span>a runnable world out</span>
            <span className={s.proofSep}>·</span>
            <span>
              about <b>2¢</b>
            </span>
          </div>
        </div>
        <MarketingHeroVisual />
      </header>

      {/* The blind spot */}
      <section className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}>The blind spot</div>
            <h2 className={s.sectionTitle}>
              Every consequential decision ripples through systems you can&apos;t see.
            </h2>
            <p className={s.sectionLede}>
              You announce, you ship, you hire — and it propagates through people,
              press, and markets. By the time you can measure the consequences,
              they&apos;re already loose. Today you answer <em>&ldquo;what happens if we
              do this?&rdquo;</em> by gut, by analogy, or by a consultant who substitutes
              their gut for yours. None of it branches. None of it shows you the world
              you&apos;re about to act on.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}>How it works</div>
            <h2 className={s.sectionTitle}>Three moves, one instrument.</h2>
          </div>
          <div className={s.steps}>
            {STEPS.map((step) => (
              <div className={s.step} key={step.n}>
                <span className={s.stepNum}>{step.n}</span>
                <div className={s.stepTitle}>{step.title}</div>
                <div className={s.stepBody}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The honest claim */}
      <section className={s.claim}>
        <div className={s.claimCard}>
          <div className={s.claimKicker}>Not an oracle</div>
          <h2 className={s.claimTitle}>A map, not a prediction.</h2>
          <p className={s.claimBody}>
            Wake is a Monte Carlo over imagined futures — wrong about any single future
            in the way nobody minds, because that&apos;s what a Monte Carlo is for. What
            it&apos;s right about is the <em>consequence space</em>: the trajectories, the
            distribution, and the one variable that decides which way it goes.
          </p>
        </div>
      </section>

      {/* Why now / proof */}
      <section className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.eyebrow}>Possible only now</div>
            <h2 className={s.sectionTitle}>The cost basis is the product.</h2>
            <p className={s.sectionLede}>
              Every node needs frontier reasoning, output fast enough to tick on screen,
              and a price low enough to run thousands of branches. Gemini 3.5 Flash is the
              first model where all three are true at once.
            </p>
          </div>
          <div className={s.stats}>
            {STATS.map((stat, i) => (
              <div className={s.stat} key={i}>
                <div className={s.statNum}>{stat.num}</div>
                <div className={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={s.finalCta}>
        <h2 className={s.finalTitle}>Watch your decision before you make it.</h2>
        <Link href="/app" className={s.ctaPrimary}>
          Run a simulation →
        </Link>
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
