"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight scroll-reveal hook.
 * Attaches IntersectionObserver to all .reveal-on-scroll elements.
 * Respects prefers-reduced-motion (observers still fire; CSS handles no-op).
 */
export function useScrollReveal() {
  const observed = useRef(false);

  useEffect(() => {
    if (observed.current) return;
    observed.current = true;

    const els = document.querySelectorAll<HTMLElement>(".reveal-on-scroll");
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

/** Thin component wrapper so pages can drop it anywhere. */
export function ScrollRevealProvider() {
  useScrollReveal();
  return null;
}
