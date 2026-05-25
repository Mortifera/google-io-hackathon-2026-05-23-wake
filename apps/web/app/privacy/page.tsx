import Link from "next/link";
import s from "../legal.module.css";

export const metadata = {
  title: "Privacy Policy | Wake",
  description: "How Wake handles your data: no accounts, no database, no tracking.",
};

export default function PrivacyPage() {
  return (
    <main className={s.page}>
      <div className={s.top}>
        <Link href="/" className={s.brand}>
          Wake<span className={s.dot}>.</span>
        </Link>
        <Link href="/" className={s.back}>
          ← Back to home
        </Link>
      </div>

      <h1 className={s.title}>Privacy Policy</h1>
      <div className={s.updated}>Last updated May 25, 2026</div>

      <div className={s.prose}>
        <p className={s.lead}>
          Wake is built to need as little of your data as possible. There are no
          accounts, no database, and no tracking. This policy explains exactly what
          that means.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>No account, no sign-up, no database. We don&apos;t store what you type.</li>
          <li>No analytics, no tracking cookies, no advertising trackers.</li>
          <li>
            What you type is sent to Google&apos;s Gemini to generate your simulation.
            That is the one place your input goes.
          </li>
          <li>
            If you bring your own Gemini key, it stays in your browser and is used per
            request. We never store or log it.
          </li>
        </ul>

        <h2>What we collect</h2>
        <p>
          <strong>Almost nothing.</strong> Wake is stateless: there is no database and
          no account system, so the actions, scenarios, and worlds you type are not
          saved on our servers once your request finishes.
        </p>
        <p>
          <strong>Server logs.</strong> Like any website, our host (Vercel) records
          standard request logs, such as IP address, browser type, and timestamps, for
          security and reliability. We do not use these to track or profile you.
        </p>
        <p>
          <strong>In your browser.</strong> So the app is usable, we keep two things in
          your browser&apos;s session storage, which your browser clears when you close
          the tab, and never on our servers: your in-progress draft (the world and
          action you are configuring), and your Gemini API key if you choose to provide
          one.
        </p>

        <h2>Your inputs and Google Gemini</h2>
        <p>
          Wake generates simulations using Google&apos;s Gemini models. When you run a
          simulation, the text you provide (your action, and the world it runs against)
          is sent to the Gemini API to produce the result. Google processes that data
          under Google&apos;s own terms and privacy policy. We send Google nothing beyond
          what is needed to generate your simulation.
        </p>

        <h2>Bring-your-own API key</h2>
        <p>
          If you provide your own Gemini API key, it is stored only in your
          browser&apos;s session storage and cleared when you close the tab. It is sent
          with each request and used once, on the server, to call Gemini on your behalf.
          We do not persist it, log it, or share it, and it is never associated with any
          other user.
        </p>

        <h2>What we don&apos;t do</h2>
        <ul>
          <li>We don&apos;t sell, rent, or share your data.</li>
          <li>We don&apos;t use advertising or marketing trackers.</li>
          <li>We don&apos;t set tracking cookies or build user profiles.</li>
        </ul>

        <h2>Children</h2>
        <p>
          Wake is a tool for organizations and professionals and is not directed to
          children under 13.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy as the product evolves. When we do, we will update
          the date above.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Reach us at <a href="mailto:hello@example.com">[your contact email]</a>.
        </p>
        <p className={s.note}>
          This policy describes Wake&apos;s current, intentionally minimal data
          practices. It is provided in good faith and is not legal advice.
        </p>
      </div>
    </main>
  );
}
