"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { LocationValue } from "@/lib/quiz-flow";

/**
 * Where they train. Asked on both rails, and the shared version leaked.
 *
 * The top option was "Full Hyrox gym — sled, ski erg, rower, wall balls",
 * shown to somebody who had said they wanted to lose weight and had not
 * trained in years. It is the same underlying answer either way; only the
 * words have to change, because a list of race equipment is either a
 * useful specification or a reason to close the tab, depending on who is
 * reading it.
 */
const OPTIONS: Array<{
  value: LocationValue;
  label: string;
  detail: string;
  beginnerLabel?: string;
  beginnerDetail?: string;
}> = [
  {
    value: "gym-full",
    label: "Full Hyrox gym",
    detail: "Sled, ski erg, rower, wall balls",
    beginnerLabel: "A really well-equipped gym",
    beginnerDetail: "Machines, free weights, plenty of space",
  },
  {
    value: "gym-standard",
    label: "Standard commercial gym",
    detail: "Dumbbells, barbells, machines",
    beginnerLabel: "A normal gym",
    beginnerDetail: "Dumbbells, barbells, machines",
  },
  {
    value: "home",
    label: "Home setup",
    detail: "Limited or specialised kit",
    beginnerLabel: "At home",
    beginnerDetail: "Whatever you have, or nothing at all",
  },
];

export function LocationScreen({
  value,
  onChange,
  beginner,
}: {
  value: LocationValue | undefined;
  onChange: (v: LocationValue) => void;
  /** Swaps in copy that names no race equipment. */
  beginner?: boolean;
}) {
  return (
    <div>
      <QuestionHeader
        question="Where will you train?"
        helper={
          beginner
            ? "We'll build the plan around what you can actually get to."
            : "We'll adapt your plan to your space and kit."
        }
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {OPTIONS.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={
                beginner ? (opt.beginnerLabel ?? opt.label) : opt.label
              }
              detail={
                beginner ? (opt.beginnerDetail ?? opt.detail) : opt.detail
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
