"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import type { gsap as GsapType } from "gsap";
import {
  PROGRAMME_TAG,
  determineProgramme,
  determineStartDate,
  determineRaceDate,
  calculateWeeksUntilRace,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { getBenefits } from "@/lib/plan-generator";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Screen 14 (brief 3.5 + 3.6). Sales-pitch plan summary.
 *
 * Programme name, race-date anchor, 5 numbered benefits, dates footer.
 * Benefits stagger in 250ms apart. Respects prefers-reduced-motion.
 */
export function PlanSummaryScreen({ answers }: { answers: QuizAnswers }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const programme = determineProgramme(answers);
  const benefits = getBenefits(programme);
  const startDate = determineStartDate();
  const raceDate = determineRaceDate(startDate, answers.raceDate);
  const weeksUntil = calculateWeeksUntilRace(raceDate);

  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;
    const lines = Array.from(
      root.querySelectorAll<HTMLElement>("[data-summary-line]"),
    );

    if (prefersReducedMotion) {
      for (const el of lines) {
        el.style.opacity = "1";
        el.style.transform = "none";
      }
      return;
    }

    for (const el of lines) {
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
    }

    let cancelled = false;
    let tl: ReturnType<typeof GsapType.timeline> | null = null;

    import("gsap")
      .then(({ gsap }) => {
        if (cancelled) return;
        gsap.set(lines, { opacity: 0, y: 12, clearProps: "transform" });
        tl = gsap.timeline();
        tl.to(lines, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.25,
        });
      })
      .catch(() => {
        for (const el of lines) {
          el.style.transition =
            "opacity 320ms ease, transform 320ms ease";
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });

    return () => {
      cancelled = true;
      if (tl) tl.kill();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={containerRef}>
      <div
        data-summary-line
        className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent"
      >
        [ YOUR PLAN ]
      </div>

      <h1
        data-summary-line
        className="mt-3 text-balance text-3xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-4xl"
      >
        {PROGRAMME_TAG[programme]} Programme
      </h1>

      <p
        data-summary-line
        className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg"
      >
        Built around your race on{" "}
        <span className="text-vyrek-text">
          {format(raceDate, "EEEE, d MMMM yyyy")}
        </span>
        .
      </p>

      <div
        data-summary-line
        className="my-8 h-px w-full bg-vyrek-border-subtle"
      />

      <p
        data-summary-line
        className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary"
      >
        What&apos;s included
      </p>

      <ol role="list" className="mt-5 space-y-4">
        {benefits.map((b) => (
          <li
            key={b.number}
            data-summary-line
            className="flex gap-4 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-5"
          >
            <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-vyrek-accent">
              [ {b.number} ]
            </span>
            <div>
              <p className="text-base font-bold text-vyrek-text">{b.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-vyrek-text-secondary">
                {b.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div
        data-summary-line
        className="my-8 h-px w-full bg-vyrek-border-subtle"
      />

      <div
        data-summary-line
        className="space-y-1 text-base text-vyrek-text-secondary"
      >
        <p>
          Starting{" "}
          <span className="text-vyrek-text">
            {format(startDate, "EEEE d MMMM yyyy")}
          </span>
        </p>
        <p>
          Race-ready:{" "}
          <span className="text-vyrek-text">
            {format(raceDate, "EEEE d MMMM yyyy")}
          </span>
        </p>
        <p className="text-sm text-vyrek-text-tertiary">
          {weeksUntil} weeks to your race
        </p>
      </div>
    </div>
  );
}
