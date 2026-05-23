"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { IntentValue } from "@/lib/quiz-flow";

const OPTIONS: Array<{
  value: IntentValue;
  label: string;
  icon: string;
}> = [
  { value: "first-hyrox", label: "Training for my first Hyrox", icon: "🏁" },
  { value: "go-faster", label: "Done a Hyrox, want to go faster", icon: "⚡" },
  {
    value: "doubles",
    label: "Training with a partner (Doubles)",
    icon: "👥",
  },
  { value: "getting-into", label: "Getting into Hyrox-style training", icon: "🌱" },
  { value: "building", label: "Building general Hyrox fitness", icon: "💪" },
];

export function PrimaryIntentScreen({
  selected,
  onToggle,
}: {
  selected: IntentValue[];
  onToggle: (value: IntentValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="What brings you to Vyrek?"
        helper="Select 1 to 2 answers"
      />
      <ul role="list" className="space-y-3">
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              icon={opt.icon}
              selected={selected.includes(opt.value)}
              onClick={() => onToggle(opt.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Toggle helper, pass in current selection + a tap value. Adds the tap,
 * removes if already present, replaces oldest if at max.
 */
export function applyIntentToggle(
  current: IntentValue[],
  value: IntentValue,
  max = 2,
): IntentValue[] {
  if (current.includes(value)) {
    return current.filter((v) => v !== value);
  }
  if (current.length < max) {
    return [...current, value];
  }
  // At max, replace the oldest (front of the array).
  return [...current.slice(1), value];
}
