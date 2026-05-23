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
            ★★★★★
          </p>
          <p className="mt-4 text-balance text-xl font-medium leading-snug text-vyrek-text">
            &ldquo;Vyrek got me to my first Hyrox finish feeling fresh. 92 minutes
            when I&apos;d planned for 105.&rdquo;
          </p>
          <p className="mt-3 text-sm text-vyrek-text-secondary">
            Sarah · Bristol
          </p>

          <hr className="my-6 w-12 border-t border-vyrek-border-default" />

          <p className="text-base leading-relaxed text-vyrek-text">
            92% of first-time Vyrek members finish their Hyrox stronger than
            they expected.
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            [ VYREK MEMBER DATA · 2026 ]
          </p>
        </div>

        <ContinueButton onClick={onContinue} />
      </div>
    </section>
  );
}
