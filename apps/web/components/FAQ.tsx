import s from "../app/marketing.module.css";

/**
 * FAQ — objection handling (Schwartz's Concentration: dissolve the last doubts).
 * Native <details> for keyboard accessibility with zero JS.
 */
const QA = [
  {
    q: "Isn't this just predicting the future?",
    a: "No — and that's the point. Wake shows you a distribution of what can happen, not a single forecast. It's a map you read before you act, not an oracle.",
  },
  {
    q: "Is my data safe?",
    a: "Wake is stateless. There's no database and no account; nothing you type is stored. If you bring your own Gemini key, it's used for your request only and never persisted.",
  },
  {
    q: "Do I need an API key?",
    a: "No. Prebuilt worlds and precomputed runs are free and instant. To build your own world or run it live, bring a Gemini key — or use ours.",
  },
  {
    q: "How accurate is it?",
    a: "It's an instrument, not a prophecy. The value is in the shape of the distribution — which outcomes are common, which are rare, and the one variable that tips it.",
  },
  {
    q: "What model runs it?",
    a: "Google's Gemini. Every actor's reasoning, public and private, is generated and cited back to the event that caused it.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className={s.faq}>
      <div className={s.wrapNarrow}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>Questions, answered.</h2>
        </div>
        <div className={s.faqList}>
          {QA.map((x, i) => (
            <details key={i} className={s.faqItem}>
              <summary className={s.faqQ}>
                <span>{x.q}</span>
                <span className={s.faqMark} aria-hidden="true" />
              </summary>
              <p className={s.faqA}>{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
