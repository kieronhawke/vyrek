"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_ADVANCE_MS = 4000;

/**
 * Reassurance interstitial. Full-bleed image with dark gradient and an
 * overlaid headline. Auto-advances after 4 seconds or on any tap.
 */
export function InterstitialScreen({
  image,
  headline,
  caption,
  onAdvance,
}: {
  image: string;
  headline: string;
  caption: string;
  onAdvance: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(onAdvance, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [paused, onAdvance]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Continue"
      onClick={onAdvance}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative isolate flex min-h-svh w-full flex-col justify-end overflow-hidden bg-vyrek-base text-left"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vyrek-base via-vyrek-base/40 to-vyrek-base/10" />
      </div>

      <div className="relative z-10 px-6 pb-[max(3rem,calc(var(--safe-bottom)+3rem))] pt-12">
        <p className="max-w-[24ch] text-2xl font-black leading-[1.1] tracking-[-0.03em] text-vyrek-text md:text-4xl">
          {headline}
        </p>
        <p className="mt-6 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          [ {caption} ]
        </p>
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary/70">
          Tap to continue
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-vyrek-text/15"
      >
        {!paused && (
          <span
            className="interstitial-bar block h-full bg-vyrek-accent"
            style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }}
          />
        )}
      </div>

      <style jsx>{`
        .interstitial-bar {
          animation-name: fill;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes fill {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </button>
  );
}
