"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { DaysValue } from "@/lib/quiz-flow";

/**
 * Shown on both rails, so the detail lines come in pairs.
 *
 * "Race-ready in 16 weeks" and "for experienced athletes" were shown to
 * everybody, including somebody who had just said they had not trained in
 * years and wanted to lose weight. The beginner rail is supposed to never
 * mention a race; three shared screens were quietly doing it anyway.
 */
const OPTIONS: Array<{
  value: DaysValue;
  label: string;
  detail: string;
  beginnerDetail?: string;
  recommended?: boolean;
  /** Offered only where it helps: an athlete asking for a race plan is not
      served by being told one day a week is fine, and a beginner is not
      served by a scale that starts above what they can commit to. */
  beginnerOnly?: boolean;
  recommendedForBeginner?: boolean;
}> = [
  {
    value: 1,
    label: "1 day",
    detail: "A single quality session while life is busy.",
    beginnerDetail: "One a week, kept every week, beats four for a fortnight.",
    beginnerOnly: true,
  },
  {
    value: 2,
    label: "2 days",
    detail: "Just getting started. Slow, sustainable base building.",
    beginnerDetail: "A gentle start you can actually keep to.",
  },
  {
    value: 3,
    label: "3 days",
    detail: "Solid foundation. Race-ready in 16 weeks.",
    beginnerDetail: "Enough to see real change in twelve weeks.",
    recommendedForBeginner: true,
  },
  {
    value: 4,
    label: "4 days",
    detail: "Best balance of progress and recovery.",
    beginnerDetail: "The best balance of progress and rest.",
    recommended: true,
  },
  {
    value: 5,
    label: "5 days",
    detail: "Faster progress. More recovery demand.",
    beginnerDetail: "Quicker progress, if the week allows it.",
  },
  {
    value: 6,
    label: "6 days",
    detail: "Advanced volume. For experienced athletes.",
    beginnerDetail: "A lot. Only if you already train most days.",
  },
];

export function FrequencyScreen({
  value,
  onChange,
  beginner,
}: {
  value: DaysValue | undefined;
  onChange: (v: DaysValue) => void;
  /** Swaps in copy that never mentions a race. */
  beginner?: boolean;
}) {
  return (
    <div>
      <QuestionHeader
        question="How many days a week can you train?"
        helper={
          beginner
            ? "Whatever you pick is enough to start. Ben builds the week around it."
            : "Be honest about what you can stick to."
        }
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {OPTIONS.filter((opt) => beginner || !opt.beginnerOnly).map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              detail={beginner ? (opt.beginnerDetail ?? opt.detail) : opt.detail}
              badge={
                (beginner ? opt.recommendedForBeginner : opt.recommended)
                  ? "Most people"
                  : undefined
              }
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
