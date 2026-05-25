import s from "../app/marketing.module.css";

/** Slim credibility band under the hero — borrowed believability, mono, restrained. */
const ITEMS = [
  "Built on Google Gemini",
  "Hundreds of futures per run",
  "Every outcome traces to its cause",
  "No account needed",
];

export default function TrustStrip() {
  return (
    <div className={s.trust}>
      <div className={s.trustInner}>
        {ITEMS.map((t, i) => (
          <span className={s.trustItem} key={i}>
            <span className={s.trustTick} aria-hidden="true" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
