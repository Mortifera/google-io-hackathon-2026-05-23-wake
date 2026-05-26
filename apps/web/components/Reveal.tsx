"use client";

/**
 * Reveal-on-scroll: fades + rises a block in the first time it enters the
 * viewport. Lightweight (one IntersectionObserver, disconnects after firing).
 * Respects prefers-reduced-motion via the CSS (content shows immediately there).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "../app/marketing.module.css";

export default function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${s.reveal} ${shown ? s.revealIn : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
