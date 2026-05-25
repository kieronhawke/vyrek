"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROGRAMME_DISPLAY,
  determineProgramme,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { Monogram } from "@/components/shared/logo";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Calculating cinematic — Fix 5 upgrade.
 *
 * 4-second sequence per spec:
 *
 *   0.0 - 0.4s   black, Monogram fades in
 *   0.4 - 1.0s   "ANALYSING YOUR ANSWERS" + chartreuse progress line begins
 *   1.0 - 2.0s   text -> "CROSS-REFERENCING 12,000 ATHLETE DATA POINTS"
 *                blurred portrait backdrop @ 8% opacity
 *                corner ticker 8000 -> 12000
 *   2.0 - 3.0s   text -> "BUILDING YOUR {PROGRAMME} PROGRAMME"
 *                chartreuse dot pulses centre
 *   3.0 - 3.8s   text -> "PLAN READY", progress line completes
 *   3.8 - 4.0s   white flash, push to /plan
 *
 * Respects prefers-reduced-motion: skips animation, shows "Plan ready"
 * for ~1s before routing.
 */
export function CalculatingScreen({ answers }: { answers: QuizAnswers }) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();

  const programme = determineProgramme(answers);
  const programmeName = PROGRAMME_DISPLAY[programme];

  // Phase 0 = black + monogram only
  // Phase 1 = "Reading your answers"
  // Phase 2 = "Calibrating loads to your weight"
  // Phase 3 = "Building your {programmeName} programme"
  // Phase 4 = "Plan ready"
  // Phase 5 = white flash
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  // Routing + phase progression
  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase(4);
      setProgress(1);
      const id = window.setTimeout(() => router.push("/plan"), 1000);
      return () => window.clearTimeout(id);
    }

    const timeouts: number[] = [];
    timeouts.push(window.setTimeout(() => setPhase(1), 400));
    timeouts.push(window.setTimeout(() => setPhase(2), 1000));
    timeouts.push(window.setTimeout(() => setPhase(3), 2000));
    timeouts.push(window.setTimeout(() => setPhase(4), 3000));
    timeouts.push(window.setTimeout(() => setPhase(5), 3800));
    timeouts.push(window.setTimeout(() => router.push("/plan"), 4000));
    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, [prefersReducedMotion, router]);

  // Progress line: animate from 0 to 1 over the visible run (0.4s -> 3.8s)
  useEffect(() => {
    if (prefersReducedMotion) return;
    const start = performance.now() + 400;
    const totalMs = 3400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / totalMs));
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  const text =
    phase <= 0
      ? ""
      : phase === 1
        ? "Reading your answers"
        : phase === 2
          ? "Calibrating loads to your weight"
          : phase === 3
            ? `Building your ${programmeName} programme`
            : "Plan ready";

  return (
    <section
      className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-vyrek-base px-6 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Phase 2 backdrop: blurred portrait at 8% opacity */}
      {phase >= 2 && phase < 5 ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/images/v2/coach-james-wright.jpg"
            alt=""
            className="h-full w-full object-cover opacity-[0.08] blur-2xl grayscale"
          />
        </div>
      ) : null}

      {/* Phase 5: white flash overlay */}
      {phase >= 5 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-white"
          style={{
            opacity: 1,
            transition: "opacity 200ms ease",
          }}
        />
      ) : null}

      {/* Monogram, fades in immediately */}
      <div
        className="mb-8 transition-opacity duration-300"
        style={{ opacity: phase >= 0 ? 1 : 0 }}
      >
        <Monogram size={64} />
      </div>

      {/* Phase 3 centre pulse */}
      {phase === 3 ? (
        <div aria-hidden className="relative mb-6 size-3">
          <span className="absolute inset-0 animate-ping rounded-full bg-vyrek-accent/40" />
          <span className="absolute inset-0 rounded-full bg-vyrek-accent" />
        </div>
      ) : null}

      {/* The line */}
      <p
        className="min-h-[1.5em] text-center font-mono text-[14px] uppercase tracking-[0.12em] text-vyrek-accent transition-[opacity,transform] duration-300"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(12px)",
        }}
      >
        {text}
      </p>

      {/* Progress line */}
      <div
        aria-hidden
        className="mt-6 h-px w-[200px] overflow-hidden bg-vyrek-border-subtle"
      >
        <div
          className="h-full bg-vyrek-accent"
          style={{
            width: `${Math.round(progress * 100)}%`,
            transition: "width 80ms linear",
          }}
        />
      </div>
    </section>
  );
}
