import Link from "next/link";
import s from "../app/marketing.module.css";

/** Richer footer - signals a real product, not a demo. */
export default function SiteFooter() {
  return (
    <footer className={s.footer2}>
      <div className={s.footerInner}>
        <div className={s.footerBrandCol}>
          <span className={s.brand}>
            Wake<span className={s.dot}>.</span>
          </span>
          <p className={s.footerTag}>Watch your decision before you make it.</p>
        </div>
        <div className={s.footerCols}>
          <div className={s.footerCol}>
            <div className={s.footerColHead}>Product</div>
            <Link href="/app" className={s.footerLink}>
              Launch app
            </Link>
            <Link href="/app" className={s.footerLink}>
              Prebuilt worlds
            </Link>
          </div>
          <div className={s.footerCol}>
            <div className={s.footerColHead}>Learn</div>
            <a href="#how" className={s.footerLink}>
              How it works
            </a>
            <a href="#pricing" className={s.footerLink}>
              Pricing
            </a>
            <a href="#faq" className={s.footerLink}>
              FAQ
            </a>
          </div>
          <div className={s.footerCol}>
            <div className={s.footerColHead}>Company</div>
            <Link href="/privacy" className={s.footerLink}>
              Privacy
            </Link>
            <Link href="/terms" className={s.footerLink}>
              Terms
            </Link>
          </div>
        </div>
      </div>
      <div className={s.footerBar}>
        <span>Built on Google Gemini</span>
        <span>© 2026 Wake</span>
      </div>
    </footer>
  );
}
