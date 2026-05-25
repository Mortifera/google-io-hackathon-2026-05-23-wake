import Link from "next/link";
import s from "../app/marketing.module.css";

/** Pricing - transparent, usage-based, no lock-in. Dissolves risk before the CTA. */
export default function Pricing() {
  return (
    <section id="pricing" className={s.pricing}>
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>Honest, usage-based, no lock-in.</h2>
          <p className={s.sectionSub}>
            No subscription. No account. You only pay for the futures you run.
          </p>
        </div>
        <div className={s.priceRow}>
          <div className={s.priceCard}>
            <div className={s.priceTag}>Explore</div>
            <div className={s.priceBig}>Free</div>
            <ul className={s.priceList}>
              <li>Prebuilt worlds</li>
              <li>Precomputed runs, instantly</li>
              <li>No key, no account</li>
            </ul>
            <Link href="/app" className={s.priceCta}>
              Open a prebuilt world
            </Link>
          </div>
          <div className={`${s.priceCard} ${s.priceCardLive}`}>
            <div className={s.priceTag}>
              <span className={s.priceTagDot} aria-hidden="true" /> Run live
            </div>
            <div className={s.priceBig}>
              ~2¢ <span>/ world</span>
            </div>
            <ul className={s.priceList}>
              <li>Build your own world with Gemini</li>
              <li>32 futures for about $3</li>
              <li>Bring your own key, never stored</li>
            </ul>
            <Link href="/app" className={s.priceCtaLive}>
              Run a simulation →
            </Link>
          </div>
        </div>
        <p className={s.priceNote}>
          A world is one modeled scenario. A typical decision is a single world; a full
          fan of 32 futures runs about $3.
        </p>
      </div>
    </section>
  );
}
