"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { PartnerValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{
  value: PartnerValue;
  label: string;
  detail: string;
}> = [
  { value: "solo", label: "Solo", detail: "Just me" },
  {
    value: "doubles",
    label: "Doubles (partner confirmed)",
    detail: "Training together",
  },
  {
    value: "solo-partner-later",
    label: "Solo for now, partner later",
    detail: "Switch when partner joins",
  },
];

export function PartnerScreen({
  value,
  onChange,
}: {
  value: PartnerValue | undefined;
  onChange: (v: PartnerValue) => void;
}) {
  return (
    <div>
      <QuestionHeader question="Training solo or with a partner?" />
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
