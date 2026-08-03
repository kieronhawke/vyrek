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

/**
 * How long content may stay hidden waiting to be scrolled to.
 *
 * The reveal starts at `opacity: 0`, which means content is invisible until the
 * observer fires — and if it never fires, the content is invisible for good.
 * That is not theoretical: a full-page screenshot of the tools directory came
 * back with an entire section blank, because nothing below the fold had been
 * scrolled past. The same happens when printing, when a page is rendered
 * off-screen, and on any browser where the observer is unavailable.
 *
 * So the reveal is now a progressive enhancement with a deadline. If the
 * element has not been seen within this window it settles anyway, visible and
 * un-animated. Two seconds is long enough that a real reader scrolling down a
 * page still gets the effect, and short enough that nobody ever stares at a
 * blank block wondering whether it failed to load.
 */
const REVEAL_DEADLINE_MS = 2000;

/** Fires once, the first time the element scrolls into view — or on a deadline. */
function useInView(enabled: boolean, rootMargin = "0px 0px -8% 0px", threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver at all: show everything rather than nothing.
    // Deferred to a timeout callback rather than set here — a synchronous
    // setState in an effect body cascades renders, which the lint rule in this
    // repo rejects for good reason.
    if (typeof IntersectionObserver === "undefined") {
      const immediate = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(immediate);
    }

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

    const deadline = window.setTimeout(() => {
      setInView(true);
      observer.disconnect();
    }, REVEAL_DEADLINE_MS);

    return () => { window.clearTimeout(deadline); observer.disconnect(); };
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
