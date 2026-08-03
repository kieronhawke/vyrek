"use client";

import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";

/**
 * What they have at home.
 *
 * Only shown when somebody says they train at home, which is why this
 * screen survived three passes of stripping racing language out of the
 * beginner rail — no walk had picked "at home" until the stress journeys
 * did, and then it offered a total beginner a ski erg, a sled and a wall
 * ball.
 *
 * The beginner list is the same question asked of somebody's spare room.
 * A ski erg is a real answer for a HYROX athlete and a piece of vocabulary
 * to nobody else, so the race-specific kit simply is not offered — and the
 * stored values stay identical either way.
 */
const ATHLETE_OPTIONS: Array<{ value: string; label: string }> = [
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

const BEGINNER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "dumbbells", label: "Dumbbells" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "resistance-bands", label: "Resistance bands" },
  { value: "pull-up-bar", label: "Pull-up bar" },
  { value: "bench", label: "A bench or step" },
  { value: "mat", label: "A mat" },
  { value: "treadmill-bike", label: "Treadmill or exercise bike" },
  { value: "bodyweight", label: "Nothing yet" },
];

export function EquipmentScreen({
  selected,
  onToggle,
  beginner,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  /** Swaps in kit somebody without a garage gym would recognise. */
  beginner?: boolean;
}) {
  const options = beginner ? BEGINNER_OPTIONS : ATHLETE_OPTIONS;
  return (
    <div>
      <QuestionHeader
        question="What kit do you have at home?"
        helper={
          beginner
            ? "Pick anything you've got. None of it is required."
            : "Pick everything you've got. We'll use what we can."
        }
      />
      <ul
        role="list"
        className="flex flex-wrap gap-2.5"
      >
        {options.map((opt) => {
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
                    ? "border-suth-accent bg-suth-accent text-[#0A0A0A]"
                    : "border-suth-border bg-suth-elevated text-suth-text hover:border-suth-border-strong",
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
