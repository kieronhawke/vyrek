"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { WelcomeSlide } from "@/lib/quiz-flow-v2";

const SLIDE_DURATION_MS = 4000;
type TouchTarget = HTMLElement;

/**
 * Screen 1. Instagram-story-style carousel. 3 full-bleed slides advance
 * automatically every 4 seconds, swipeable, with thin top progress bars.
 *
 * Tap anywhere to advance to the next slide. Bottom CTA skips remaining
 * slides and lands on Screen 2 (primary intent).
 */
export function WelcomeCarousel({
  slides,
  skipLabel,
  onAdvance,
}: {
  slides: WelcomeSlide[];
  skipLabel: string;
  onAdvance: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const router = useRouter();

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => {
      if (index < slides.length - 1) {
        setIndex(index + 1);
      } else {
        onAdvance();
      }
    }, SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, slides.length, onAdvance]);

  // Swipe handling
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent<TouchTarget>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent<TouchTarget>) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    setPaused(false);
    if (start === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && index < slides.length - 1) setIndex(index + 1);
    else if (dx > 0 && index > 0) setIndex(index - 1);
  };

  const onTapNext = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else onAdvance();
  };

  const slide = slides[index];

  return (
    <section
      aria-labelledby="welcome-heading"
      className="relative isolate min-h-svh overflow-hidden bg-vyrek-base"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top safe area + progress bars */}
      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-[max(0.75rem,calc(var(--safe-top)+0.5rem))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className="relative h-0.5 flex-1 overflow-hidden rounded-pill bg-vyrek-text/20"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 block bg-vyrek-text",
                    i < index && "w-full",
                    i === index && "story-bar-active",
                    i > index && "w-0",
                  )}
                  style={
                    i === index
                      ? ({
                          animationDuration: `${SLIDE_DURATION_MS}ms`,
                        } as React.CSSProperties): undefined
                  }
                />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text/80 transition-colors hover:text-vyrek-text"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Full-bleed image */}
      <button
        type="button"
        onClick={onTapNext}
        aria-label="Next slide"
        className="absolute inset-0 z-0"
      >
        <img
          src={slide?.image ?? ""}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-vyrek-base via-vyrek-base/30 to-transparent"
        />
      </button>

      {/* Bottom overlay */}
      <div className="relative z-10 flex min-h-svh flex-col justify-end px-6 pb-[max(2rem,calc(var(--safe-bottom)+2rem))]">
        <h1
          id="welcome-heading"
          className="max-w-[14ch] text-4xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
        >
          {slide?.headline}
        </h1>
        <button
          type="button"
          onClick={onAdvance}
          className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
        >
          {skipLabel}
        </button>
      </div>

      <style jsx>{`.story-bar-active {
          animation-name: fill-bar;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes fill-bar {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
