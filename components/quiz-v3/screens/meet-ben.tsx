"use client";

import { ContinueButton } from "@/components/quiz-v3/continue-button";
import { InterstitialBack } from "@/components/quiz-v3/interstitial-back";
import { BEN, BEN_ATHLETE_PROOF, BEN_BEGINNER_PROOF } from "@/lib/ben";

/**
 * Meet Ben. The last screen before the reveal, and the one that answers the
 * question every funnel eventually has to: why you and not the app I
 * already pay for?
 *
 * Every long onboarding funnel worth copying puts a human moment right
 * before the ask. Until now ours had none: the quiz went from "any
 * injuries?" straight to a plan and a price-free CTA, with nothing
 * establishing who was behind it.
 *
 * Rail-aware, because the two audiences need opposite things here. An
 * athlete wants the record: world records, British records, Elite 15. A
 * beginner reading that same list feels further away, not closer, so they
 * get the fact he coaches people who have never trained, and the records
 * sit quietly underneath as reassurance rather than as the headline.
 *
 * Photography is the real July 2026 intake, cleared for use. Portrait 2:3,
 * which is why this screen is full-bleed rather than in the shell.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 5.1, screen 19.
 */
export function MeetBenScreen({
  beginner,
  onContinue,
  onBack,
}: {
  beginner: boolean;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const proof = beginner ? BEN_BEGINNER_PROOF : BEN_ATHLETE_PROOF;

  return (
    <section
      aria-label="Meet Ben Sutherland"
      className="relative isolate flex min-h-svh flex-col bg-suth-base"
    >
      <InterstitialBack onBack={onBack} />
      <div aria-hidden className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BEN.portrait}
          alt=""
          className="h-full w-full object-cover object-top"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-suth-base via-suth-base/85 to-suth-base/10" />
        {/* Second wash on desktop only: the portrait is 2:3, so a wide
            viewport shows far more background than a phone does and the
            text needs help holding contrast. */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-suth-base/90 via-suth-base/40 to-transparent md:block" />
      </div>

      <div className="relative z-10 flex min-h-svh flex-col justify-end px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-[var(--safe-top)] md:px-12">
        <div className="mb-8 max-w-md md:max-w-lg">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ Who&apos;s behind your plan ]
          </p>

          <h1 className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-5xl">
            {BEN.name}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
            {beginner ? BEN.beginnerPromise : BEN.intro}
          </p>

          <ul
            role="list"
            className="mt-6 flex flex-wrap gap-2"
            aria-label={
              beginner ? "About Ben" : "Ben Sutherland's racing record"
            }
          >
            {proof.map((item) => (
              <li
                key={item}
                className="rounded-pill border border-suth-border-strong bg-suth-base/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text backdrop-blur-sm"
              >
                {item}
              </li>
            ))}
          </ul>

          {beginner ? (
            <p className="mt-5 text-sm leading-relaxed text-suth-text-tertiary">
              He races at the top of the sport. That is not what you are
              buying. You are buying the fact that he knows how to start
              someone from nothing without breaking them.
            </p>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-suth-text-tertiary">
              {BEN.athletePromise}
            </p>
          )}
        </div>

        <ContinueButton label="See my plan →" onClick={onContinue} />
      </div>
    </section>
  );
}
