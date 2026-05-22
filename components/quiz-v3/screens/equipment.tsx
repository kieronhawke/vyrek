"use client";

import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "dumbbells", label: "Dumbbells" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "rower", label: "Rower" },
  { value: "ski-erg", label: "Ski erg" },
  { value: "sled", label: "Sled" },
  { value: "sandbag", label: "Sandbag" },
  { value: "wall-ball", label: "Wall ball" },
  { value: "pull-up-bar", label: "Pull-up bar" },
  { value: "bodyweight", label: "Bodyweight only" },
];

export function EquipmentScreen({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="What kit do you have at home?"
        helper="Pick everything you've got. We'll use what we can."
      />
      <ul
        role="list"
        className="flex flex-wrap gap-2.5"
      >
        {OPTIONS.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onToggle(opt.value)}
                aria-pressed={on}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-pill border px-4 text-sm font-medium transition-[border,background,transform] duration-fast ease-out active:scale-[0.97]",
                  on
                    ? "border-vyrek-accent bg-vyrek-accent text-[#0A0A0A]"
                    : "border-vyrek-border bg-vyrek-elevated text-vyrek-text hover:border-vyrek-border-strong",
                )}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
