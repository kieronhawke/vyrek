"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Workout } from "@/lib/plan-generator";

const TYPE_TAG: Record<Workout["type"], { label: string; tone: string }> = {
  hyrox: { label: "Race-specific", tone: "text-vyrek-accent" },
  run: { label: "Z2 endurance", tone: "text-vyrek-text-secondary" },
  strength: { label: "Strength", tone: "text-vyrek-text-secondary" },
  recovery: { label: "Recovery", tone: "text-vyrek-success" },
  rest: { label: "Rest", tone: "text-vyrek-text-tertiary" },
};

export function DayCard({
  workout,
  onOpen,
  locked = false,
}: {
  workout: Workout;
  onOpen?: () => void;
  locked?: boolean;
}) {
  const date = new Date(workout.date);
  const tag = TYPE_TAG[workout.type];
  const isRest = workout.type === "rest";

  return (
    <button
      type="button"
      onClick={isRest || locked ? undefined : onOpen}
      disabled={isRest || locked}
      aria-disabled={isRest || locked}
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-lg border bg-vyrek-elevated p-4 text-left transition-[border,background,transform] duration-fast ease-out",
        "border-vyrek-border",
        !isRest && !locked && "hover:border-vyrek-border-strong active:scale-[0.99] cursor-pointer",
        isRest && "opacity-60 cursor-default",
        locked && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          {workout.day} · {format(date, "d MMM")}
        </span>
        <span className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", tag.tone)}>
          {tag.label}
        </span>
      </div>
      <p className="text-base font-semibold leading-snug text-vyrek-text">
        {workout.title}
      </p>
      <p className="text-sm text-vyrek-text-secondary">
        {isRest
          ? "Optional walk. No structured training."
          : (
            <>
              <span data-day-duration data-target={workout.durationMin}>
                {workout.durationMin}
              </span>{" "}
              min
              {workout.intensityZone ? ` · ${workout.intensityZone}` : ""}
            </>
          )}
      </p>
      {!isRest && !locked ? (
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">
          Tap for full session →
        </span>
      ) : null}
    </button>
  );
}
