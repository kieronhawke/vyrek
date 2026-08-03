"use client";

import type { ReactNode } from "react";
import { ContinueButton } from "@/components/quiz-v3/continue-button";
import { InterstitialBack } from "@/components/quiz-v3/interstitial-back";

/**
 * THE BETWEEN-QUESTIONS SCREENS, on a layout that works on a monitor.
 *
 * These are the screens that read worst on desktop, and they were all
 * built the same way: one full-bleed photograph, the copy pushed into the
 * bottom-left corner, and a Continue button stretched the entire width of
 * the window. On a phone that is a good design. At 1440px the photograph
 * is a wall of empty grey, the copy is a small block in one corner, and
 * the button is a 1400px slab of chartreuse.
 *
 * So they now take the same shape as every question screen: the picture
 * holds one side, the words hold the other, and the button is the size of
 * a button. Mobile keeps the full-bleed treatment, which is the right one
 * there — the difference between the two is the point.
 *
 * `children` is for the screens that carry more than a paragraph (the
 * programme overview and its photo grid). Everything else passes `body`.
 */
export function Interstitial({
  image,
  imagePosition = "50% 50%",
  eyebrow,
  title,
  body,
  children,
  cta = "Continue →",
  onContinue,
  onBack,
  label,
}: {
  image: string;
  imagePosition?: string;
  eyebrow: string;
  title: string;
  body?: ReactNode;
  children?: ReactNode;
  cta?: string;
  onContinue: () => void;
  onBack?: () => void;
  label: string;
}) {
  return (
    <section
      aria-label={label}
      className="quiz-viewport relative isolate flex flex-col overflow-hidden bg-suth-base lg:flex-row"
    >
      <InterstitialBack onBack={onBack} />

      {/* The photograph. Absolute and full-bleed on a phone so the copy can
          sit on top of it; a real column from lg, so nothing sits on top of
          anything and the copy gets a clean ground to be read against. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 lg:relative lg:inset-auto lg:z-auto lg:h-full lg:w-[40%] lg:shrink-0 xl:w-[44%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: imagePosition }}
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-suth-base via-suth-base/80 to-suth-base/20 lg:from-suth-base/70 lg:via-suth-base/30 lg:to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent to-suth-base/60 lg:block" />
      </div>

      <div className="relative z-10 flex h-full flex-1 flex-col justify-end overflow-y-auto px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-[var(--safe-top)] lg:h-full lg:justify-center lg:px-10 lg:py-10">
        <div className="mb-8 max-w-md lg:mx-auto lg:mb-0 lg:w-full lg:max-w-[34rem]">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ {eyebrow} ]
          </p>
          <h1 className="mt-4 text-balance text-2xl font-bold leading-snug tracking-[-0.02em] text-suth-text md:text-3xl">
            {title}
          </h1>
          {body ? (
            <p className="mt-4 text-pretty text-base leading-relaxed text-suth-text-secondary">
              {body}
            </p>
          ) : null}

          {children}

          {/* Desktop: inline, and only as wide as it needs to be. */}
          <div className="mt-8 hidden lg:flex [&>button]:h-12 [&>button]:w-auto [&>button]:min-w-[13rem]">
            <ContinueButton label={cta} onClick={onContinue} />
          </div>
        </div>

        {/* Phone: full-bleed under the thumb. */}
        <div className="lg:hidden">
          <ContinueButton label={cta} onClick={onContinue} />
        </div>
      </div>
    </section>
  );
}
