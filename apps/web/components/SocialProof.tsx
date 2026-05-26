"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import s from "../app/marketing.module.css";

/**
 * Social proof. IMPORTANT: these testimonials are illustrative/representative
 * (fictitious people, attributed to a role + company-type, never a real named
 * person or a real company logo). Swap for real beta quotes when available.
 *
 * `tag` = the scenario, color-coded to Wake's affect palette, so each card has a
 * distinct identity and the set reads as the range of decisions Wake covers.
 */
const QUOTES = [
  {
    tag: "Product launch",
    lead: "The whole team had its favorite launch message. I ran all three through Wake before we committed, and watched the audience turn on the one we loved.",
    rest: "It read as hype to exactly the people we needed on our side, and in the sim you could watch them push back, hard. The option we'd nearly cut was the one that spread. We shipped that, and it drove our biggest signup week yet. We'd have launched the favorite and spent months wondering why it fell flat.",
    name: "Marcus",
    role: "Head of Growth, developer tools",
    color: "#4fd18b",
  },
  {
    tag: "Price war",
    lead: "Before we dropped prices to fight off a competitor, I ran it a few hundred times in Wake to see how it could go.",
    rest: "Most of the time it was fine, but about a third of the runs turned into a price war, and they all came down to one thing: whether the competitor matched us in the first week. So we prepared for exactly that, and the war never started. I went in knowing the one move that would decide it.",
    name: "Priya",
    role: "Founder, fintech",
    color: "#5b9cf0",
  },
  {
    tag: "Acquisition",
    lead: "Everyone was sure the acquisition would spook our customers, so we were ready to bury the announcement. I ran it through Wake first.",
    rest: "The backlash we were all bracing for barely showed up: in almost every run it was a small, loud minority and the rest shrugged. What actually moved was the enterprise side, the acquisition made us a safer bet and they leaned in. So we did the opposite of the plan and led with it, loudly. We'd have buried our best quarter out of fear.",
    name: "Daniel",
    role: "VP, Corporate Development, late-stage tech",
    color: "#f2b450",
  },
  {
    tag: "Reorg",
    lead: "I ran our reorg through Wake before we finalized the new structure.",
    rest: "It showed me we were about to push out the exact senior people we were trying to keep, because the new roles would've felt like a demotion. So we redrew the structure itself, not just how we explained it. I caught it before it happened, not in the exit interviews.",
    name: "Elena",
    role: "Chief People Officer, enterprise software",
    color: "#f0556b",
  },
  {
    tag: "Layoffs",
    lead: "Before we announced the layoffs, I ran the rollout through Wake to see where it would break.",
    rest: "What surprised me was that the wording barely mattered. What set people off was the order they found out: when the team leads heard it the same hour as their reports, they felt ambushed and said so, loudly. So we briefed the leads a day ahead and gave them time to sit with it. The backlash everyone braced for never came. We'd have spent that whole month wordsmithing the wrong thing.",
    name: "Meredith",
    role: "Head of Communications, Series C SaaS",
    color: "#b06bf0",
  },
];

const GAP = 18;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

export default function SocialProof() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  // Keep the dots + arrow disabled-states in sync with scroll position.
  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setActive(Math.round(progress * (QUOTES.length - 1)));
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    sync();
    // The edge fades are a motion cue: on while scrolling, off once a card settles.
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      sync();
      setScrolling(true);
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => setScrolling(false), 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      if (settle) clearTimeout(settle);
    };
  }, [sync]);

  const behavior = (): ScrollBehavior =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

  const step = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const stride = card ? card.offsetWidth + GAP : el.clientWidth;
    el.scrollBy({ left: dir * stride, behavior: behavior() });
  };

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (i / (QUOTES.length - 1)) * max, behavior: behavior() });
  };

  return (
    <section className={s.proof}>
      <div className={s.wrap}>
        <div className={s.proofHead}>
          <h2 className={s.sectionTitle}>The operators who stopped guessing and started knowing.</h2>
          <div className={s.proofNav}>
            <button
              type="button"
              className={s.proofArrow}
              onClick={() => step(-1)}
              disabled={atStart}
              aria-label="Previous testimonial"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={s.proofArrow}
              onClick={() => step(1)}
              disabled={atEnd}
              aria-label="Next testimonial"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`${s.proofScroller} ${scrolling ? s.scrolling : ""} ${atStart ? s.atStart : ""} ${atEnd ? s.atEnd : ""}`}
        >
          <div
            ref={scroller}
            className={s.proofGrid}
            role="region"
            aria-roledescription="carousel"
            aria-label="Customer testimonials"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                step(1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                step(-1);
              }
            }}
          >
            {QUOTES.map((q) => (
              <figure className={s.proofCard} key={q.name} style={{ "--cAccent": q.color } as CSSProperties}>
                <span className={s.proofMark} aria-hidden="true">
                  &ldquo;
                </span>
                <span className={s.proofTag}>{q.tag}</span>
                <blockquote className={s.proofQuote}>
                  <span className={s.proofLead}>{q.lead}</span> {q.rest}
                </blockquote>
                <figcaption className={s.proofWho}>
                  <span className={s.proofAvatar} aria-hidden="true">
                    {initials(q.name)}
                  </span>
                  <span className={s.proofMeta}>
                    <span className={s.proofName}>{q.name}</span>
                    <span className={s.proofRole}>{q.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className={s.proofDots}>
          {QUOTES.map((q, i) => (
            <button
              type="button"
              key={q.name}
              className={`${s.proofDot} ${i === active ? s.proofDotOn : ""}`}
              aria-label={`Go to testimonial ${i + 1}: ${q.name}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
