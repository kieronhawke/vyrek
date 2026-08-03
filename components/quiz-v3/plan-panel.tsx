"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  determineStartDate,
  isBeginnerRail,
  programmeLabel,
  type QuizAnswers,
} from "@/lib/quiz-flow";

/**
 * The live plan panel: the thing the user is buying, visibly assembling
 * itself as they answer.
 *
 * This is the single biggest lesson from the Noom teardown and the piece
 * the old quiz was missing entirely. Answers went into state and the user
 * saw nothing back until the reveal, so every screen was a cost with no
 * return. Here each answer fills a row, in front of them.
 *
 * It doubles as the fix for desktop: the quiz shell used to be a `max-w-md`
 * phone column at every breakpoint, so a 27" monitor showed a narrow strip
 * of nothing. The panel is the right-hand pane from `md` up, and collapses
 * to a tappable strip under the progress bar on mobile.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 7.
 */

type PlanRow = {
  label: string;
  /** null renders the placeholder dash, which is what makes filling visible. */
  value: string | null;
};

const SESSION_LENGTH_LABEL: Record<string, string> = {
  "20": "20 minutes",
  "30": "30 minutes",
  "45": "45 minutes",
  "60": "60 minutes",
  "90": "90 minutes",
};

const WHERE_LABEL: Record<string, string> = {
  "gym-full": "Full Hyrox gym",
  "gym-standard": "Standard gym",
  home: "Home setup",
};

const INJURY_LABEL: Record<string, string> = {
  none: "Nothing to work around",
  "lower-back": "Your lower back",
  knee: "Your knee",
  shoulder: "Your shoulder",
  "achilles-calf": "Your achilles or calf",
  other: "What you noted",
};

const SUPPORT_LABEL: Record<string, string> = {
  coached: "Coached by Ben",
  self: "Suth Club, self-paced",
  unsure: "We'll recommend",
};

/**
 * Whole weeks between the start date and the race. Falls back to the
 * standard twelve-week block when there is no race date to count back from.
 */
function planWeeks(startDate: Date, raceDate?: Date): number {
  if (!raceDate) return 12;
  const days = Math.round(
    (raceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weeks = Math.floor(days / 7);
  return Math.max(1, Math.min(weeks, 12));
}

function planRows(answers: QuizAnswers, startDate: Date): PlanRow[] {
  const label = programmeLabel(answers);
  const beginner = isBeginnerRail(answers);

  return [
    {
      /* The length was hardcoded to "12 weeks" whatever the race date said,
         so a race four weeks out produced "First Race, 12 weeks. Starts
         Tuesday 4 August. Race day 30 August 2026", which does not add up
         on the screen where the user is deciding whether to trust us.
         Show the runway they actually have. */
      label: "Programme",
      value: label
        ? `${label}, ${planWeeks(startDate, answers.raceDate)} weeks`
        : null,
    },
    { label: "Starts", value: format(startDate, "EEEE d MMMM") },
    // A race row on the beginner rail is a row that can only ever show a
    // dash, and a HYROX word in front of someone who hasn't asked for one.
    ...(beginner
      ? []
      : [
          {
            label: "Race day",
            value: answers.raceDate
              ? format(answers.raceDate, "d MMMM yyyy")
              : null,
          },
        ]),
    {
      label: "Sessions",
      value: answers.days ? `${answers.days} days a week` : null,
    },
    {
      label: "Each session",
      value: answers.sessionLength
        ? (SESSION_LENGTH_LABEL[answers.sessionLength] ??
          `${answers.sessionLength} minutes`)
        : null,
    },
    {
      label: "Where",
      value: answers.location
        ? (WHERE_LABEL[answers.location] ?? answers.location)
        : null,
    },
    {
      label: "Built around",
      value: answers.injuries
        ? (INJURY_LABEL[answers.injuries] ?? answers.injuries)
        : null,
    },
    {
      label: "Support",
      value: answers.supportPreference
        ? (SUPPORT_LABEL[answers.supportPreference] ?? null)
        : null,
    },
  ];
}

function useRows(answers: QuizAnswers) {
  // Computed once per mount rather than per render: the start date must not
  // shift under the user mid-quiz if they sit on a screen past midnight.
  const startDate = useMemo(() => determineStartDate(), []);
  return useMemo(() => planRows(answers, startDate), [answers, startDate]);
}

function RowList({ rows }: { rows: PlanRow[] }) {
  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 border-b border-suth-border-subtle pb-3 last:border-b-0"
        >
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
            {row.label}
          </dt>
          <dd
            className={
              row.value
                ? "text-right text-sm font-medium leading-snug text-suth-text"
                : "text-right text-sm text-suth-text-tertiary/50"
            }
          >
            {row.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LockedInCount({ rows }: { rows: PlanRow[] }) {
  const filled = rows.filter((r) => r.value).length;
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
      {filled} of {rows.length} locked in
    </p>
  );
}

/** Desktop right-hand pane. Hidden below `md`. */
export function PlanPanel({ answers }: { answers: QuizAnswers }) {
  const rows = useRows(answers);

  return (
    <aside
      aria-label="Your plan so far"
      className="hidden w-[340px] shrink-0 border-l border-suth-border-subtle bg-suth-elevated/40 md:block lg:w-[380px]"
    >
      <div className="sticky top-0 px-7 py-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ Your plan ]
        </p>
        <h2 className="mt-3 text-xl font-black tracking-[-0.02em] text-suth-text">
          Building as you answer
        </h2>

        <div className="mt-7">
          <RowList rows={rows} />
        </div>

        <div className="mt-7 border-t border-suth-border-subtle pt-5">
          <LockedInCount rows={rows} />
          <p className="mt-3 text-xs leading-relaxed text-suth-text-secondary">
            Nothing here is guesswork. Every line comes from something you
            told us.
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * Mobile equivalent: a collapsed strip under the progress bar that expands
 * in place. Deliberately not a modal, because a modal on a form screen eats
 * the back gesture on iOS.
 */
export function PlanStrip({ answers }: { answers: QuizAnswers }) {
  const rows = useRows(answers);
  const [open, setOpen] = useState(false);
  const filled = rows.filter((r) => r.value).length;

  return (
    <div className="border-b border-suth-border-subtle md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
          Your plan so far
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent">
            {filled} locked in
          </span>
          <span
            aria-hidden
            className="text-xs text-suth-text-tertiary transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          >
            ▾
          </span>
        </span>
      </button>

      {open ? (
        <div className="px-5 pb-5">
          <RowList rows={rows} />
        </div>
      ) : null}
    </div>
  );
}
