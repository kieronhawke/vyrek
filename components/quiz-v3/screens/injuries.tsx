"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { InjuryValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{ value: InjuryValue; label: string }> = [
  { value: "none", label: "No injuries, all clear" },
  { value: "lower-back", label: "Lower back" },
  { value: "knee", label: "Knee" },
  { value: "shoulder", label: "Shoulder" },
  { value: "achilles-calf", label: "Achilles or calf" },
  { value: "other", label: "Other — I'll note in the app later" },
];

export function InjuriesScreen({
  value,
  onChange,
}: {
  value: InjuryValue | undefined;
  onChange: (v: InjuryValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="Any injuries we should plan around?"
        helper="We'll adjust the plan to protect what needs protecting."
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
