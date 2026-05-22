"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { ExperienceValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{ value: ExperienceValue; label: string }> = [
  { value: "never", label: "Never raced" },
  { value: "signed-up", label: "Signed up, not raced yet" },
  { value: "raced-few", label: "Raced once or twice" },
  { value: "raced-many", label: "Raced multiple times" },
];

export function ExperienceScreen({
  value,
  onChange,
}: {
  value: ExperienceValue | undefined;
  onChange: (v: ExperienceValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="Have you raced a Hyrox before?"
        helper="Pick one"
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
