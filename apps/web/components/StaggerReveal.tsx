"use client";

/**
 * Like Reveal, but staggers its direct children in as the block enters view
 * (each child rises + fades with an incremental delay). Layout-safe: it only
 * animates opacity/transform, so grid placement (e.g. spanning tiles) is
 * unaffected. Respects prefers-reduced-motion via CSS. Pass the layout class
 * (e.g. the grid class) so this element IS the grid container.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "../app/marketing.module.css";

export default function StaggerReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
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
    <div ref={ref} className={`${className} ${s.stagger} ${shown ? s.staggerIn : ""}`}>
      {children}
    </div>
  );
}
