"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * Motion primitives for the Results section.
 *
 * The design thesis is a stadium timing board, so motion here is restrained on
 * purpose: things settle into place, they do not bounce or slide across the
 * screen. Every effect is 150–500ms, and every one is fully off under
 * `prefers-reduced-motion` — off, not slowed.
 *
 * Content is in the DOM and readable from the first frame; motion only touches
 * opacity, a few pixels of translate, and bar width. Nothing makes a reader
 * wait for data.
 */

/* ─── Reduced motion ──────────────────────────────────────────────
   useSyncExternalStore rather than useState + useEffect: a media query is
   external state, and subscribing to it this way avoids a synchronous
   setState during an effect (which cascades renders). */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false, // server: assume motion is fine, then correct on hydrate
  );
}

/** Fires a callback once, the first time the element scrolls into view. */
function useInView(enabled: boolean, rootMargin = "0px 0px -8% 0px", threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Async callback, not a synchronous effect body — safe to set here.
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold]);

  return { ref, inView };
}

/** Fades and lifts a block into place the first time it is seen. */
export function Reveal({
  children, delay = 0, className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView(!reduced);
  // Derived, so nothing has to be written to state when motion is off.
  const settled = reduced || inView;

  return (
    <div
      ref={ref}
      className={cn(
        !reduced && "transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        !reduced && (settled ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"),
        className,
      )}
      style={!reduced && !settled ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Counts a headline number up to its value.
 *
 * Only for the one big figure on a page — a finish time, a percentile. Running
 * it over a table would be unreadable and slightly insulting to somebody
 * scanning for their own name.
 *
 * The final value is what renders server-side, so crawlers and reduced-motion
 * visitors see the real number immediately.
 */
export function CountUp({
  value, format, durationMs = 700, className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic: quick, then settles — a timing board stopping, not a
      // slot machine spinning.
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduced]);

  const shown = reduced ? value : value * progress;
  return <span className={className}>{format(shown)}</span>;
}

/** Grows a bar from zero to its width once visible. */
export function GrowBar({
  width, className, style,
}: {
  width: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView(!reduced, "0px", 0.2);
  const grown = reduced || inView;

  return (
    <span
      ref={ref as unknown as React.RefObject<HTMLSpanElement>}
      className={cn(
        className,
        !reduced && "transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
      )}
      style={{ ...style, width: grown ? `${width}%` : "0%" }}
    />
  );
}
