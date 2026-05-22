"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import type { gsap as GsapType } from "gsap";
import {
  PROGRAMME_TAG,
  LOCATION_LABEL,
  PARTNER_LABEL,
  INJURY_LABEL,
  determineProgramme,
  determineStartDate,
  determineRaceDate,
  calculateWeeksUntilRace,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Screen 14 — Animated plan summary. Staggered reveal proves the system
 * worked. Respects prefers-reduced-motion (shows everything immediately).
 */
export function PlanSummaryScreen({ answers }: { answers: QuizAnswers }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const programme = determineProgramme(answers);
  const startDate = determineStartDate();
  const raceDate = determineRaceDate(startDate, answers.raceDate);
  const weeksUntil = calculateWeeksUntilRace(raceDate);

  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;
    const lines = Array.from(
      root.querySelectorAll<HTMLElement>("[data-summary-line]"),
    );
    const cta = root.querySelector<HTMLElement>("[data-summary-cta]");

    if (prefersReducedMotion) {
      // Show everything immediately, no animation — no need to load gsap.
      for (const el of lines) {
        el.style.opacity = "1";
        el.style.transform = "none";
      }
      if (cta) {
        cta.style.opacity = "1";
        cta.style.transform = "none";
      }
      return;
    }

    // Initial state set synchronously via inline styles so the animation has
    // something to interpolate from even before gsap finishes loading.
    for (const el of lines) {
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
    }
    if (cta) {
      cta.style.opacity = "0";
      cta.style.transform = "translateY(12px) scale(0.98)";
    }

    let cancelled = false;
    let tl: ReturnType<typeof GsapType.timeline> | null = null;

    // Lazy-load gsap so it doesn't bloat the main quiz bundle. The summary
    // screen is reached towards the end of the funnel — by the time it
    // mounts, gsap fetches in parallel with the user reading the summary.
    import("gsap")
      .then(({ gsap }) => {
        if (cancelled) return;
        // Reset transforms to gsap-managed.
        gsap.set(lines, { opacity: 0, y: 12, clearProps: "transform" });
        if (cta) {
          gsap.set(cta, {
            opacity: 0,
            y: 12,
            scale: 0.98,
            clearProps: "transform",
          });
        }

        tl = gsap.timeline();
        tl.to(lines, {
          opacity: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
          stagger: 0.16,
        });
        if (cta) {
          tl.to(
            cta,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.4,
              ease: "back.out(1.2)",
            },
            "-=0.1",
          );
          tl.to(
            cta,
            {
              scale: 1.02,
              duration: 0.6,
              ease: "power1.inOut",
              yoyo: true,
              repeat: 1,
            },
            "+=0.3",
          );
        }
      })
      .catch(() => {
        // If gsap fails to load, fall back to a CSS transition so users
        // still see the lines appear rather than a permanently-hidden screen.
        for (const el of lines) {
          el.style.transition = "opacity 320ms ease, transform 320ms ease";
          el.style.opacity = "1";
          el.style.transform = "none";
        }
        if (cta) {
          cta.style.transition = "opacity 400ms ease, transform 400ms ease";
          cta.style.opacity = "1";
          cta.style.transform = "none";
        }
      });

    return () => {
      cancelled = true;
      if (tl) tl.kill();
    };
  }, [prefersReducedMotion]);

  const partnerLabel = answers.partner
    ? PARTNER_LABEL[answers.partner]
    : "Solo";
  const locationLabel = answers.location
    ? LOCATION_LABEL[answers.location]
    : "Standard commercial gym";
  const injuryLabel = answers.injuries
    ? INJURY_LABEL[answers.injuries]
    : "No injuries";

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
        {PROGRAMME_TAG[programme]}
      </h1>

      <ul className="mt-8 space-y-2 text-base leading-relaxed text-vyrek-text">
        <li data-summary-line>12 weeks</li>
        <li data-summary-line>{answers.days ?? 4} sessions per week</li>
        <li data-summary-line>{answers.sessionLength ?? "60"} min sessions</li>
        <li data-summary-line>{locationLabel}</li>
        <li data-summary-line>{partnerLabel}</li>
        <li data-summary-line>{injuryLabel}</li>
      </ul>

      <div
        data-summary-line
        className="my-6 h-px w-full bg-vyrek-border-subtle"
      />

      <div data-summary-line className="text-base text-vyrek-text-secondary">
        Starting{" "}
        <span className="text-vyrek-text">
          {format(startDate, "EEEE d MMMM yyyy")}
        </span>
      </div>
      <div data-summary-line className="mt-1 text-base text-vyrek-text-secondary">
        Race-ready:{" "}
        <span className="text-vyrek-text">
          {format(raceDate, "EEEE d MMMM yyyy")}
        </span>
        <span className="mt-1 block text-sm text-vyrek-text-tertiary">
          {weeksUntil} weeks to your race
        </span>
      </div>

      <div className="mt-10" data-summary-cta-wrapper>
        {/* CTA rendered by orchestrator footer; this wrapper just helps position */}
      </div>
    </div>
  );
}
