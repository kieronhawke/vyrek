"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import type { gsap as GsapType } from "gsap";
import {
  PROGRAMME_DISPLAY,
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
        // Stagger was 0.25s × ~9 lines = 2.25s total — too slow for a
        // funnel screen people are trying to scan. Tightened to 60ms
        // per line so the whole summary lands in under 900ms even on
        // the longest variant.
        tl.to(lines, {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.06,
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

      {/* PROGRAMME_TAG already ends with "PROGRAMME" (all caps), and the
          template was appending " Programme" so the h1 read
          "FIRST RACE PROGRAMME Programme". Switched to PROGRAMME_DISPLAY
          ("First Race" / "Sub-90" / ...) which is mixed-case and reads
          well as an h1 with a single trailing " Programme". */}
      <h1
        data-summary-line
        className="mt-3 text-balance text-3xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-4xl"
      >
        {PROGRAMME_DISPLAY[programme]} Programme
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
        Built around your answers
      </p>

      <ul
        data-summary-line
        role="list"
        className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3"
      >
        {summariseAnswers(answers).map((row) => (
          <li
            key={row.label}
            className="rounded-md border border-vyrek-border-subtle bg-vyrek-elevated/60 p-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              {row.label}
            </p>
            <p className="mt-1 font-medium leading-snug text-vyrek-text">
              {row.value}
            </p>
          </li>
        ))}
      </ul>

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

      <div
        data-summary-line
        className="mt-8 rounded-lg border border-vyrek-accent/40 bg-vyrek-accent/[0.06] p-5"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
          What you pay
        </p>
        <p className="mt-2 text-base font-medium leading-snug text-vyrek-text">
          Free for 7 days. Then £8.99 a month, cancel in two taps from the
          app. No card needed to start your trial.
        </p>
      </div>
    </div>
  );
}

const SESSION_LENGTH_LABEL: Record<string, string> = {
  "30": "30 minutes",
  "45": "45 minutes",
  "60": "60 minutes",
  "90": "90 minutes",
};

const LOCATION_LABEL: Record<string, string> = {
  "gym-full": "A full Hyrox gym",
  "gym-standard": "A standard gym",
  home: "Home setup",
};

const INJURY_LABEL: Record<string, string> = {
  none: "No injuries to plan around",
  "lower-back": "Lower-back-safe alternatives",
  knee: "Knee-safe alternatives",
  shoulder: "Shoulder-safe alternatives",
  "achilles-calf": "Achilles + calf safe alternatives",
  other: "Custom alternatives, noted in app",
};

function summariseAnswers(a: QuizAnswers): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (a.days) rows.push({ label: "Sessions", value: `${a.days} days a week` });
  if (a.sessionLength)
    rows.push({
      label: "Each session",
      value: SESSION_LENGTH_LABEL[a.sessionLength] ?? a.sessionLength,
    });
  if (a.location)
    rows.push({
      label: "Where",
      value: LOCATION_LABEL[a.location] ?? a.location,
    });
  if (a.weight)
    rows.push({
      label: "Calibrated to",
      value: `${a.weight} kg`,
    });
  if (a.injuries)
    rows.push({
      label: "Adjusted for",
      value: INJURY_LABEL[a.injuries] ?? a.injuries,
    });
  if (a.partner && a.partner !== "solo")
    rows.push({
      label: "Style",
      value: a.partner === "doubles" ? "Doubles" : "Solo + partner later",
    });
  return rows.slice(0, 6);
}
