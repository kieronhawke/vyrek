"use client";

import { ContinueButton } from "@/components/quiz-v3/continue-button";

/**
 * Screen 7 — Padding interstitial #2. Headline + 3-photo grid + Continue.
 */
export function ReassuranceScreen2({ onContinue }: { onContinue: () => void }) {
  return (
    <section
      aria-label="Programme overview"
      className="flex min-h-svh flex-col bg-vyrek-base pt-[var(--safe-top)]"
    >
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="mx-auto max-w-md pt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ 12-WEEK FIRST RACE PROGRAMME ]
          </p>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.03em] text-vyrek-text md:text-4xl">
            Give us 4 sessions a week. We&apos;ll give you Hyrox-ready fitness
            in 12 weeks.
          </h1>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="col-span-2 aspect-[16/10] overflow-hidden rounded-lg bg-vyrek-elevated">
              <img
                src="/media/images/bento-plan.jpg"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="aspect-square overflow-hidden rounded-lg bg-vyrek-elevated">
              <img
                src="/media/images/programme-doubles.jpg"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="aspect-square overflow-hidden rounded-lg bg-vyrek-elevated">
              <img
                src="/media/images/quiz-interstitial-1.jpg"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <p className="mt-8 text-base leading-relaxed text-vyrek-text-secondary">
            You don&apos;t need more hours in the gym. You need better
            programming — where every block has a purpose, and every session
            builds on the last.
          </p>
        </div>
      </div>

      <footer className="sticky bottom-0 border-t border-vyrek-border-subtle bg-vyrek-base/90 px-6 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <ContinueButton onClick={onContinue} />
        </div>
      </footer>
    </section>
  );
}
