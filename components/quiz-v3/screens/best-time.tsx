"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { BestTimeValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{ value: BestTimeValue; label: string }> = [
  { value: "under-60", label: "Under 60 min" },
  { value: "60-75", label: "60 to 75 min" },
  { value: "75-90", label: "75 to 90 min" },
  { value: "90-105", label: "90 to 105 min" },
  { value: "over-105", label: "Over 105 min" },
  { value: "unknown", label: "I don't remember" },
];

export function BestTimeScreen({
  value,
  onChange,
}: {
  value: BestTimeValue | undefined;
  onChange: (v: BestTimeValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="What's your best Hyrox time?"
        helper="We'll calibrate your plan to match."
      />
      <ul role="list" className="space-y-3">
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
