"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { DaysValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{
  value: DaysValue;
  label: string;
  detail: string;
  recommended?: boolean;
}> = [
  {
    value: 2,
    label: "2 days",
    detail: "Just getting started. Slow, sustainable base building.",
  },
  {
    value: 3,
    label: "3 days",
    detail: "Solid foundation. Race-ready in 16 weeks.",
  },
  {
    value: 4,
    label: "4 days",
    detail: "Best balance of progress and recovery.",
    recommended: true,
  },
  {
    value: 5,
    label: "5 days",
    detail: "Faster progress. More recovery demand.",
  },
  {
    value: 6,
    label: "6 days",
    detail: "Advanced volume. For experienced athletes.",
  },
];

export function FrequencyScreen({
  value,
  onChange,
}: {
  value: DaysValue | undefined;
  onChange: (v: DaysValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="How many days a week can you train?"
        helper="Be honest about what you can stick to."
      />
      <ul role="list" className="space-y-3">
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              detail={opt.detail}
              badge={opt.recommended ? "Recommended" : undefined}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
