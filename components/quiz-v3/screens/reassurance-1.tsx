"use client";

import { ContinueButton } from "@/components/quiz-v3/continue-button";

/**
 * Screen 3. Reassurance interstitial #1. Full-bleed portrait, testimonial,
 * stat, then Continue. Marchon-verified pattern, Vyrek-themed.
 */
export function ReassuranceScreen1({ onContinue }: { onContinue: () => void }) {
  return (
    <section
      aria-label="Reassurance"
      className="relative isolate flex min-h-svh flex-col bg-vyrek-base"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/media/images/v2/quiz-interstitial-1.jpg"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-vyrek-base via-vyrek-base/80 to-vyrek-base/20"
        />
      </div>

      <div className="relative z-10 flex min-h-svh flex-col justify-end px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-[var(--safe-top)]">
        <div className="mb-8 max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ NEXT FEW QUESTIONS ]
          </p>
          <p className="mt-4 text-balance text-2xl font-bold leading-snug tracking-[-0.02em] text-vyrek-text md:text-3xl">
            Half the work is honest answers.
          </p>
          <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary">
            What you train at home is not what you train at the gym. What you
            did at 25 is not what you do now. Tell us where you are, not
            where you wish you were. We adapt every Sunday.
          </p>
        </div>

        <ContinueButton onClick={onContinue} />
      </div>
    </section>
  );
}
