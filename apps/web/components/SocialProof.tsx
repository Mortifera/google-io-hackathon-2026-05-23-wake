import StaggerReveal from "./StaggerReveal";
import s from "../app/marketing.module.css";

/**
 * Social proof. IMPORTANT: these testimonials are illustrative/representative
 * (fictitious people, attributed to a role + company-type, never a real named
 * person or a real company logo). Swap for real beta quotes when available.
 */
const QUOTES = [
  {
    highlight: "I ran a month of quiet work before we said a word.",
    quote:
      "Wake showed that two manager segments would read the layoff criteria as arbitrary, and that a specific alumni community would amplify it within hours. So we did not just rewrite the message. Over the four weeks before the announcement, we seeded that community with context through three people they already trusted, and rebuilt the all-hands deck for those two segments. The story I had been losing sleep over never appeared.",
    name: "Meredith",
    role: "Head of Communications",
    org: "Series C SaaS",
    color: "#f0556b",
  },
  {
    highlight: "It found the variable the financial model missed.",
    quote:
      "The financials were clean, but Wake surfaced a power-user segment already eyeing alternatives, the retention driver for an outsized share of revenue. Over the five weeks to close we ran a sequence: a private briefing before any announcement, a roadmap session where they shaped the first ninety days, then a reference-call chain they anchored. By announcement day they were on record as supporters, and six-month retention was the best of any deal in three years.",
    name: "Daniel",
    role: "VP, Corporate Development",
    org: "late-stage tech",
    color: "#5b9cf0",
  },
  {
    highlight: "I turned the people most likely to kill it into the ones who launched it.",
    quote:
      "The board backed the pricing change, but Wake showed me our top power sellers would read it as a margin grab and go to press within a day. I had two weeks, so I called the eleven biggest sellers individually, walked them through the unit economics, and asked each to co-design the transition terms. By announcement day, four had already posted in support, and the story that would have run never had a hook.",
    name: "Jasmine",
    role: "Co-founder & CEO",
    org: "Series B marketplace",
    color: "#4fd18b",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

export default function SocialProof() {
  return (
    <section className={s.proof}>
      <div className={s.wrap}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>The operators who stopped guessing and started knowing.</h2>
          <p className={s.sectionSub}>Heads of comms, corp dev, and founders, before the irreversible call.</p>
        </div>
        <StaggerReveal className={s.proofGrid}>
          {QUOTES.map((q) => (
            <figure className={s.proofCard} key={q.name}>
              <div>
                <p className={s.proofHighlight}>{q.highlight}</p>
                <blockquote className={s.proofQuote}>&ldquo;{q.quote}&rdquo;</blockquote>
              </div>
              <figcaption className={s.proofWho}>
                <span
                  className={s.proofAvatar}
                  style={{ background: `${q.color}1f`, color: q.color, borderColor: `${q.color}55` }}
                  aria-hidden="true"
                >
                  {initials(q.name)}
                </span>
                <span className={s.proofMeta}>
                  <span className={s.proofName}>{q.name}</span>
                  <span className={s.proofRole}>
                    {q.role}, {q.org}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
