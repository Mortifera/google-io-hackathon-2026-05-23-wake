import type { CSSProperties } from "react";
import StaggerReveal from "./StaggerReveal";
import s from "../app/marketing.module.css";

/**
 * Use cases - the page's one LIGHT section: "step into daylight and see your own
 * decisions" (identification beat + mid-page relief). Asymmetric bento, not a
 * 3-equal-card grid; the affect colours appear as small accents on light.
 */
const CASES = [
  {
    k: "acquisition",
    t: "Acquisitions & M&A",
    d: "Announce the deal and watch the indie community, the press, and your power users diverge, before the leak does.",
    big: true,
    c: "#f0556b",
  },
  { k: "launch", t: "Product launches", d: "See which segments rally and which feel quietly abandoned.", c: "#4fd18b" },
  { k: "layoff", t: "Layoffs & restructuring", d: "Model the morale hit, the leak, and the narrative that forms.", c: "#f2b450" },
  { k: "pricing", t: "Pricing changes", d: "Find the threshold that flips loyalty into churn.", c: "#5b9cf0" },
  { k: "crisis", t: "Crisis comms", d: "Test the statement before it becomes the statement.", c: "#b06bf0" },
];

export default function UseCases() {
  return (
    <section className={s.uc}>
      <div className={s.wrap}>
        <div className={s.ucHead}>
          <h2 className={s.ucTitle}>For the decisions you can&apos;t take back.</h2>
          <p className={s.ucSub}>
            The moves where being blindsided is expensive, and where seeing the room
            first changes the call.
          </p>
        </div>
        <StaggerReveal className={s.ucGrid}>
          {CASES.map((c) => (
            <article
              key={c.k}
              className={`${s.ucTile} ${c.big ? s.ucTileBig : ""}`}
              style={{ "--tileAccent": c.c } as CSSProperties}
            >
              <span className={s.ucDot} style={{ background: c.c, boxShadow: `0 0 10px ${c.c}55` }} />
              <h3 className={s.ucName}>{c.t}</h3>
              <p className={s.ucDesc}>{c.d}</p>
            </article>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
