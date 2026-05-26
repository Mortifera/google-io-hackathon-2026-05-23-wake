import Link from "next/link";
import MarketingHeroVisual from "../components/MarketingHeroVisual";
import ProblemBeat from "../components/ProblemBeat";
import HowItWorks from "../components/HowItWorks";
import UseCases from "../components/UseCases";
import ClaimVisual from "../components/ClaimVisual";
import Pricing from "../components/Pricing";
import FAQ from "../components/FAQ";
import SocialProof from "../components/SocialProof";
import TrustStrip from "../components/TrustStrip";
import Reveal from "../components/Reveal";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import s from "./marketing.module.css";

// The landing as one continuous argument (Schwartz: the eye verifies the claim
// before the mind accepts it). Arc: desire (hero) → credibility (trust) →
// recognition (problem) → belief (how) → identification (use cases, the one
// light beat) → trust (claim) → confidence (pricing) → objections (FAQ) →
// invitation (CTA). The page descends into the dark as belief is built.
export const metadata = {
  title: "Wake: watch your decision before you make it",
  description:
    "The first world model for organizational action. Type one decision and watch hundreds of real people and platforms reason through what happens next, live and traceable to the cause.",
};

export default function MarketingPage() {
  return (
    <div className={s.root}>
      <div className={s.aurora} />
      <div className={s.grid} />
      <div className={s.grain} />

      <SiteNav />

      {/* Hero - desire: see the future before you act */}
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <h1 className={s.headline}>Watch your decision before you make it.</h1>
          <p className={s.sub}>
            Type one action: an acquisition, a launch, a layoff. Wake builds a{" "}
            <em>live world model</em> around it: hundreds of the real people,
            communities, and platforms it touches, each reasoning through what happens
            next. You see the outcomes, <em>each traced to its cause</em>, before you commit.
          </p>
          <div className={s.ctaRow}>
            <Link href="/app" className={s.ctaPrimary}>
              Run a simulation →
            </Link>
            <Link href="/app" className={s.ctaSecondary}>
              See a live example →
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

      {/* Credibility */}
      <TrustStrip />

      {/* Recognition - the problem, as a before/after contrast */}
      <Reveal>
        <ProblemBeat />
      </Reveal>

      {/* Belief - the mechanism, one continuous sequence */}
      <Reveal>
        <HowItWorks />
      </Reveal>

      {/* Identification - the one light beat: your own decisions, in daylight */}
      <Reveal>
        <UseCases />
      </Reveal>

      <div className={s.divider} />

      {/* Trust - the honest claim, paired with the distribution it describes */}
      <Reveal>
        <section className={s.claim}>
          <div className={s.claimCard}>
            <h2 className={s.claimTitle}>A map, not a prediction.</h2>
            <p className={s.claimBody}>
              Wake runs hundreds of imagined futures in parallel, not to predict the one
              that happens, but to show you the space of what can: which trajectories are
              common, which are rare, and the single variable that tips the balance. The
              operator who has seen the <em>distribution of outcomes</em>, before they act,
              isn&apos;t flying blind. They&apos;re flying with a map.
            </p>
            <ClaimVisual />
          </div>
        </section>
      </Reveal>

      {/* Confidence - pricing */}
      {/* Trust: operators who could not afford to be blindsided */}
      <Reveal>
        <SocialProof />
      </Reveal>

      <Reveal>
        <Pricing />
      </Reveal>

      {/* Objections - FAQ */}
      <Reveal>
        <FAQ />
      </Reveal>

      {/* Invitation - the turn, without a jar */}
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

      <SiteFooter />
    </div>
  );
}
