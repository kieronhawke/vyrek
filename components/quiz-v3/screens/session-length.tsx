"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { SessionLengthValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{
  value: SessionLengthValue;
  label: string;
  detail: string;
  /** Shown instead of `detail` on the beginner rail. See frequency.tsx. */
  beginnerDetail?: string;
  recommended?: boolean;
}> = [
  {
    value: "30",
    label: "30 min",
    detail: "Tight on time. We'll cut runs over strength.",
    beginnerDetail: "Short and focused. Better than skipping it.",
  },
  { value: "45", label: "45 min", detail: "Most members pick this." },
  {
    value: "60",
    label: "60 min",
    detail: "Full warm-up, main set and cool-down.",
    recommended: true,
  },
  {
    value: "90",
    label: "90 min or more",
    detail: "Race-pace blocks fit comfortably.",
    beginnerDetail: "Plenty of room, if you have the time.",
  },
];

export function SessionLengthScreen({
  value,
  onChange,
  beginner,
}: {
  value: SessionLengthValue | undefined;
  onChange: (v: SessionLengthValue) => void;
  /** Swaps in copy that never mentions a race. */
  beginner?: boolean;
}) {
  return (
    <div>
      <QuestionHeader
        question="How long can your sessions be?"
        helper="We'll build workouts that fit your time."
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              detail={beginner ? (opt.beginnerDetail ?? opt.detail) : opt.detail}
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
