"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROGRAMME_DISPLAY,
  determineProgramme,
  determineStartDate,
  determineRaceDate,
  calculateWeeksUntilRace,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Screen 16. Cinematic transitional ~3.5s, then route to /plan.
 *
 * Five lines reveal in sequence. The user's actual data is interpolated
 * (programme name, race weeks, equipment count) so it feels personal.
 */
const TOTAL_LINES = 5;

export function CalculatingScreen({ answers }: { answers: QuizAnswers }) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Lazy init: skip the animated reveal entirely under reduced motion.
  const [visibleLines, setVisibleLines] = useState<number>(() =>
    prefersReducedMotion ? TOTAL_LINES: 0,
  );

  const programme = determineProgramme(answers);
  const programmeName = PROGRAMME_DISPLAY[programme];
  const startDate = determineStartDate();
  const raceDate = determineRaceDate(startDate, answers.raceDate);
  const weeksUntilRace = calculateWeeksUntilRace(raceDate);
  const equipmentCount = answers.equipment?.length ?? 12;

  const lines = [
    "Analysing your answers...",
    `Cross-referencing 47 ${programmeName} programmes...`,
    `Matching your equipment to ${equipmentCount} workout templates...`,
    `Calibrating to your race in ${weeksUntilRace} weeks...`,
    "Your Week 1 is ready.",
  ];

  useEffect(() => {
    if (prefersReducedMotion) {
      const id = window.setTimeout(() => router.push("/plan"), 800);
      return () => window.clearTimeout(id);
    }

    const stepMs = 700;
    const totalRunMs = stepMs * TOTAL_LINES + 700; // settle pause then route

    const timeouts: number[] = [];
    for (let i = 0; i < TOTAL_LINES; i++) {
      timeouts.push(
        window.setTimeout(() => setVisibleLines(i + 1), stepMs * i),
      );
    }
    timeouts.push(window.setTimeout(() => router.push("/plan"), totalRunMs));

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [prefersReducedMotion, router]);

  return (
    <section className="flex min-h-svh flex-col items-center justify-center bg-vyrek-base px-6 py-16">
      <div className="relative mb-12 size-16">
        <span className="absolute inset-0 animate-ping rounded-full bg-vyrek-accent/30" />
        <span className="absolute inset-3 rounded-full bg-vyrek-accent" />
      </div>

      <ul role="list" className="w-full max-w-md space-y-3 text-center">
        {lines.map((line, i) => (
          <li
            key={i}
            className="font-mono text-sm uppercase tracking-[0.16em] text-vyrek-text-secondary transition-opacity duration-500"
            style={{
              opacity: i < visibleLines ? 1: 0,
              transform: i < visibleLines ? "translateY(0)": "translateY(4px)",
            }}
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
