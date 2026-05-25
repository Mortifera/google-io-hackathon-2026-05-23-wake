import StaggerReveal from "./StaggerReveal";
import s from "../app/marketing.module.css";

/**
 * Social proof. IMPORTANT: these testimonials are illustrative/representative
 * (fictitious people, attributed to a role + company-type, never a real named
 * person or a real company logo). Swap for real beta quotes when available.
 */
const QUOTES = [
  {
    lead: "The whole team had its favorite launch message. I ran all three through Wake before we committed, and watched the audience turn on the one we loved.",
    rest: "It read as hype to exactly the people we needed on our side, and in the sim you could watch them push back, hard. The option we'd nearly cut was the one that spread. We shipped that, and it drove our biggest signup week yet. We'd have launched the favorite and spent months wondering why it fell flat.",
    name: "Marcus",
    role: "Head of Growth, developer tools",
    color: "#4fd18b",
  },
  {
    lead: "Before we dropped prices to fight off a competitor, I ran it a few hundred times in Wake to see how it could go.",
    rest: "Most of the time it was fine, but about a third of the runs turned into a price war, and they all came down to one thing: whether the competitor matched us in the first week. So we prepared for exactly that, and the war never started. I went in knowing the one move that would decide it.",
    name: "Priya",
    role: "Founder, fintech",
    color: "#5b9cf0",
  },
  {
    lead: "Everyone was sure the acquisition would spook our customers, so we were ready to bury the announcement. I ran it through Wake first.",
    rest: "The backlash we were all bracing for barely showed up: in almost every run it was a small, loud minority and the rest shrugged. What actually moved was the enterprise side, the acquisition made us a safer bet and they leaned in. So we did the opposite of the plan and led with it, loudly. We'd have buried our best quarter out of fear.",
    name: "Daniel",
    role: "VP, Corporate Development, late-stage tech",
    color: "#f2b450",
  },
  {
    lead: "I ran our reorg through Wake before we finalized the new structure.",
    rest: "It showed me we were about to push out the exact senior people we were trying to keep, because the new roles would've felt like a demotion. So we redrew the structure itself, not just how we explained it. I caught it before it happened, not in the exit interviews.",
    name: "Elena",
    role: "Chief People Officer, enterprise software",
    color: "#f0556b",
  },
  {
    lead: "Before we announced the layoffs, I ran the rollout through Wake to see where it would break.",
    rest: "What surprised me was that the wording barely mattered. What set people off was the order they found out: when the team leads heard it the same hour as their reports, they felt ambushed and said so, loudly. So we briefed the leads a day ahead and gave them time to sit with it. The backlash everyone braced for never came. We'd have spent that whole month wordsmithing the wrong thing.",
    name: "Meredith",
    role: "Head of Communications, Series C SaaS",
    color: "#b06bf0",
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
        </div>
        <StaggerReveal className={s.proofGrid}>
          {QUOTES.map((q) => (
            <figure className={s.proofCard} key={q.name}>
              <blockquote className={s.proofQuote}>
                &ldquo;<span className={s.proofLead}>{q.lead}</span> {q.rest}&rdquo;
              </blockquote>
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
                  <span className={s.proofRole}>{q.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
