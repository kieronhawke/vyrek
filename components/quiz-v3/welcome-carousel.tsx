"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type WelcomeSlide = {
  image: string;
  headline: string;
};

const SLIDE_DURATION_MS = 3200;

/**
 * The first thing anybody entering the funnel reads.
 *
 * It used to open "Hyrox training, personalised in three minutes" and then
 * "calibrated to your kit and race date". Both are true of half the people
 * who arrive. The other half have come to get fit, have never heard of
 * HYROX, and were told on the entry screen that this is a racing website
 * before being asked a single question. Screen one now offers them a door;
 * it is no use if screen zero has already shown them the wrong building.
 *
 * So neither slide names a sport or a race. They name the thing both
 * audiences actually want, which is a plan that fits them.
 */
export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    image: "/media/images/track/programme-first-race.jpg",
    headline: "Training built around you, not a template.",
  },
  {
    image: "/media/images/track/straight-elevated-bw.jpg",
    headline: "Day one or race day. Same coach.",
  },
];

/**
 * Screen 1. Instagram-story-style carousel. The only auto-advancing screen
 * in the V3 flow: swipe, tap anywhere, or wait out SLIDE_DURATION_MS per
 * slide. The bottom CTA skips straight into the questions.
 */
export function WelcomeCarousel({
  slides = WELCOME_SLIDES,
  onAdvance,
}: {
  slides?: WelcomeSlide[];
  onAdvance: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

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

  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
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
      /* h-svh, not min-h-svh: with a minimum, a headline that wrapped to five
         lines on a laptop grew the section past the viewport and the last
         line and the CTA sat below the fold on the entry screen. */
      className="quiz-viewport relative isolate overflow-hidden bg-suth-base"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-[max(0.75rem,calc(var(--safe-top)+0.5rem))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className="relative h-0.5 flex-1 overflow-hidden rounded-pill bg-suth-text/20"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 block bg-suth-text",
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
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text/80 transition-colors hover:text-suth-text"
          >
            Skip
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onTapNext}
        aria-label="Next slide"
        className="absolute inset-0 z-0"
      >
        {slide?.image ? (
          <Image
            src={slide.image}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-suth-base via-suth-base/30 to-transparent"
        />
      </button>

      {/* pointer-events-none on the wrapper lets the next-slide button
          underneath receive taps on empty space; only the CTA opts back in.
          The heading deliberately does NOT: it used to be pointer-events-auto
          and on a phone it wraps across the middle of the screen, so tapping
          the centre to advance hit the headline and did nothing. A dead zone
          over the biggest tap target on the entry screen. */}
      <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-lg flex-col justify-end px-6 pb-[max(2rem,calc(var(--safe-bottom)+2rem))] md:mx-0 md:max-w-xl md:px-12 lg:px-16 lg:pb-16">
        <h1
          id="welcome-heading"
          /* Capped at 5xl from lg. 6xl on a 1440px screen put four words on
             a line and pushed the CTA off the bottom of a laptop. */
          className="max-w-[15ch] text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-6xl lg:text-5xl xl:text-6xl"
        >
          {slide?.headline}
        </h1>
        <button
          type="button"
          onClick={onAdvance}
          className="pointer-events-auto mt-8 inline-flex h-14 w-full max-w-sm items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-suth-accent-hover active:scale-[0.98]"
        >
          Find your plan →
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
