import Link from "next/link";
import s from "./marketing.module.css";

// The product front door. The app itself lives at /app (the Studio flow);
// this page sells the idea and routes people in.
export const metadata = {
  title: "Wake — watch your decision before you make it",
  description:
    "The first world model for organizational action. Build a world from one sentence, drop in an action, and watch hundreds of real people and platforms reason through what happens next.",
};

const PROPS = [
  {
    badge: "◍",
    tint: "var(--accent-sky)",
    title: "A living graph",
    body: "Hundreds of named people, communities, and platforms — each a Gemini reasoner with a public face and a private interior that can diverge.",
  },
  {
    badge: "⌁",
    tint: "var(--accent)",
    title: "A simulation kernel",
    body: "Run it once, A/B two decisions, or fan out hundreds of futures. Wake shows the distribution — and the one variable that decides which way it goes. An instrument, not an oracle.",
  },
  {
    badge: "❓",
    tint: "var(--alarmed)",
    title: "Interpretable by construction",
    body: "Every outcome traces back to your action, cited event by event. Click any node and ask why it ended up where it did.",
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

      <header className={s.hero}>
        <div className={s.eyebrow}>
          A world model for organizational action
        </div>
        <h1 className={s.headline}>Watch your decision before you make it.</h1>
        <p className={s.sub}>
          You have an action — an acquisition, a launch, a layoff, a post. Wake
          builds the world it lands in, gives <em>every person and platform a public
          face and a private interior</em>, and runs your decision forward in waves.
          You watch what happens, live — and every outcome traces back to what you did.
        </p>
        <div className={s.ctaRow}>
          <Link href="/app" className={s.ctaPrimary}>
            Run a simulation →
          </Link>
          <Link href="/app" className={s.ctaSecondary}>
            Explore a prebuilt world
          </Link>
        </div>
        <div className={s.runline}>
          one sentence in · a runnable world out · about <b>2¢</b> to build
        </div>
      </header>

      <section className={s.props}>
        {PROPS.map((p) => (
          <div className={s.prop} key={p.title}>
            <div
              className={s.propBadge}
              style={{ color: p.tint, background: "rgba(255,255,255,0.04)" }}
            >
              {p.badge}
            </div>
            <div className={s.propTitle}>{p.title}</div>
            <div className={s.propBody}>{p.body}</div>
          </div>
        ))}
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
