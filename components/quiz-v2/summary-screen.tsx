"use client";

import { format } from "date-fns";
import { Eyebrow } from "@/components/shared/eyebrow";
import {
  determineProgramme,
  determineStartDate,
  determineRaceDate,
  type RunnaQuizAnswers,
  type ProgramSlug,
} from "@/lib/quiz-schema";

const PROGRAMME_TAG: Record<ProgramSlug, string> = {
  "first-race": "FIRST RACE PROGRAMME",
  "sub-90": "SUB-90 PROGRAMME",
  doubles: "DOUBLES PROGRAMME",
  pro: "PRO PROGRAMME",
};

const PROGRAMME_WEEKS = 12;

const LOCATION_LABEL: Record<string, string> = {
  "gym-full": "Full Hyrox gym",
  "gym-standard": "Standard gym",
  home: "Home setup",
};

const PARTNER_LABEL: Record<string, string> = {
  solo: "Solo",
  doubles: "Doubles",
};

const INJURY_LABEL: Record<string, string> = {
  none: "No injuries",
  "lower-back": "Lower back",
  knee: "Knee",
  shoulder: "Shoulder",
  "achilles-calf": "Achilles / calf",
  other: "Other — noted in app",
};

/**
 * Screen 14 — a review, not a question. Renders the user's answers in the
 * editorial style of a training journal, plus a single CTA into the email
 * gate. Uses the Phase B2 §3.4 date helpers.
 */
export function SummaryScreen({
  answers,
}: {
  answers: Partial<RunnaQuizAnswers>;
}) {
  // The summary should never appear with incomplete answers, but the type
  // system gives us partials so we narrow defensively.
  const full = answers as RunnaQuizAnswers;
  const programme = determineProgramme(full);
  const startDate = determineStartDate();
  const raceDate = determineRaceDate(
    startDate,
    PROGRAMME_WEEKS,
    full.raceDate,
  );

  const rows = [
    `${PROGRAMME_WEEKS} weeks · ${full.days ?? 4} sessions per week`,
    `${full.sessionLength ?? 60} min sessions · ${
      LOCATION_LABEL[full.location ?? "gym-standard"] ?? "Standard gym"
    } · ${PARTNER_LABEL[full.partner ?? "solo"] ?? "Solo"}`,
    INJURY_LABEL[full.injuries ?? "none"] ?? "No injuries",
  ];

  return (
    <div>
      <Eyebrow>Your plan</Eyebrow>
      <p className="mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-vyrek-accent">
        [ {PROGRAMME_TAG[programme]} ]
      </p>

      <ul className="mt-6 space-y-2 text-base leading-relaxed text-vyrek-text md:text-lg">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>

      <div className="mt-10 border-t border-vyrek-border-subtle pt-6">
        <p className="text-base text-vyrek-text-secondary">
          Starting{" "}
          <span className="text-vyrek-text">
            {format(startDate, "EEEE d MMMM")}
          </span>
        </p>
        <p className="mt-1 text-base text-vyrek-text-secondary">
          Race-ready:{" "}
          <span className="text-vyrek-text">
            {format(raceDate, "EEEE d MMMM yyyy")}
          </span>
        </p>
      </div>
    </div>
  );
}
