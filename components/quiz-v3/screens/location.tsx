"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { LocationValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{
  value: LocationValue;
  label: string;
  detail: string;
}> = [
  {
    value: "gym-full",
    label: "Full Hyrox gym",
    detail: "Sled, ski erg, rower, wall balls",
  },
  {
    value: "gym-standard",
    label: "Standard commercial gym",
    detail: "Dumbbells, barbells, machines",
  },
  {
    value: "home",
    label: "Home setup",
    detail: "Limited or specialised kit",
  },
];

export function LocationScreen({
  value,
  onChange,
}: {
  value: LocationValue | undefined;
  onChange: (v: LocationValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="Where will you train?"
        helper="We'll adapt your plan to your space and kit."
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
