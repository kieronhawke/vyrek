"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { ActivityValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{
  value: ActivityValue;
  label: string;
  detail: string;
}> = [
  {
    value: "athletic",
    label: "Training 5+ days a week",
    detail: "Athletic. Used to high volume.",
  },
  {
    value: "regular",
    label: "Training 3-4 days a week",
    detail: "Regular. Solid base.",
  },
  {
    value: "occasional",
    label: "Training 1-2 days a week",
    detail: "Occasional. Building back.",
  },
  {
    value: "returning",
    label: "Just getting back into it",
    detail: "Returning after a break.",
  },
  {
    value: "beginner",
    label: "Brand new to training",
    detail: "Start from scratch.",
  },
];

export function ActivityBaselineScreen({
  value,
  onChange,
}: {
  value: ActivityValue | undefined;
  onChange: (v: ActivityValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="How active are you right now?"
        helper="Be honest. We'll start where you are."
      />
      <ul role="list" className="space-y-3">
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              detail={opt.detail}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
