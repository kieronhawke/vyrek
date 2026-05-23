"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Apple-style number counter, animates from 0 (or a chosen start value) to
 * the target when the element scrolls into view, with an ease-out curve.
 *
 * - SSR-safe: renders the final value as the initial markup so the layout
 *   is stable and search engines see the real number.
 * - Reduced-motion: skips the animation, shows the value instantly.
 * - Single-fire: only animates the first time the element enters the
 *   viewport. Subsequent scrolls leave it as-is.
 */
export function CountUp({
  value,
  start = 0,
  durationMs = 900,
  className,
  format = (n) => n.toLocaleString("en-GB"),
}: {
  value: number;
  start?: number;
  durationMs?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number>(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // Already initialised to `value` via useState, no setState needed.
      return;
    }

    // Seed to the start value before the IntersectionObserver fires so the
    // first paint after observe shows the start, not the target.
    let fired = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(start);

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired) continue;
          fired = true;
          obs.disconnect();

          const t0 = performance.now();
          const range = value - start;
          const tick = (now: number) => {
            const elapsed = now - t0;
            const t = Math.min(1, elapsed / durationMs);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            setShown(start + Math.round(range * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, start, durationMs]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(shown)}
    </span>
  );
}
