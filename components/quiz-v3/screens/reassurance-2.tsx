"use client";

import { ContinueButton } from "@/components/quiz-v3/continue-button";
import { InterstitialBack } from "@/components/quiz-v3/interstitial-back";

/**
 * Screen 7. Padding interstitial #2. Headline + 3-photo grid + Continue.
 */
export function ReassuranceScreen2({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack?: () => void;
}) {
  return (
    <section
      aria-label="Programme overview"
      className="relative flex min-h-svh flex-col bg-suth-base pt-[var(--safe-top)]"
    >
      <InterstitialBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="mx-auto max-w-md pt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ 12-WEEK PROGRAMME ]
          </p>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.03em] text-suth-text md:text-4xl">
            Give us a few sessions a week. We&apos;ll dial in the rest.
          </h1>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="col-span-2 aspect-[16/10] overflow-hidden rounded-lg bg-suth-elevated">
              <img
                src="/media/images/track/straight-elevated-bw.jpg"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="aspect-square overflow-hidden rounded-lg bg-suth-elevated">
              <img
                src="/media/images/track/programme-doubles.jpg"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="aspect-square overflow-hidden rounded-lg bg-suth-elevated">
              <img
                src="/media/images/track/bend-lanes-bw.jpg"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <p className="mt-8 text-base leading-relaxed text-suth-text-secondary">
            You don&apos;t need more hours in the gym. You need better
            programming, where every block has a purpose, and every session
            builds on the last.
          </p>
        </div>
      </div>

      <footer className="sticky bottom-0 border-t border-suth-border-subtle bg-suth-base/90 px-6 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <ContinueButton onClick={onContinue} />
        </div>
      </footer>
    </section>
  );
}
