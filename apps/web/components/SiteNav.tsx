"use client";

/**
 * Site nav that undocks into a floating glass island once you scroll past the
 * hero. At the top it sits flush and transparent (part of the hero); past ~70%
 * of the first viewport it contracts into a centered, blurred pill. rAF-throttled
 * scroll, no layout thrash.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import s from "../app/marketing.module.css";

export default function SiteNav() {
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setDocked(window.scrollY > window.innerHeight * 0.7);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <nav className={`${s.nav} ${docked ? s.navDocked : ""}`}>
      <div className={s.navInner}>
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
      </div>
    </nav>
  );
}
