import StaggerReveal from "./StaggerReveal";
import s from "../app/marketing.module.css";

/**
 * Social proof. IMPORTANT: these testimonials are illustrative/representative
 * (fictitious people, attributed to a role + company-type, never a real named
 * person or a real company logo). Swap for real beta quotes when available.
 */
const QUOTES = [
  {
    highlight: "I saw the audience before I addressed it.",
    quote:
      "Forty-eight hours before a 30% layoff, Wake surfaced the managers who would read the criteria as arbitrary, and the alumni community ready to amplify it. We rewrote for them directly, and the second story I had been dreading never broke.",
    name: "Maya Ellison",
    role: "Head of Communications",
    org: "Series C SaaS",
    color: "#f0556b",
  },
  {
    highlight: "It found what the diligence missed.",
    quote:
      "The financials were clean, but Wake surfaced the power users who would read the acquisition as an end-of-life signal, with alternatives already lined up. We rebuilt the comms around it, and six-month retention was the best of any deal in three years.",
    name: "Priya Nair",
    role: "VP, Corporate Development",
    org: "late-stage tech",
    color: "#5b9cf0",
  },
  {
    highlight: "I walked into the board knowing.",
    quote:
      "The board backed the pricing change. What I had not modeled was the power sellers who would turn it into press within a day, so we called them first and made them our earliest supporters.",
    name: "David Reyes",
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
