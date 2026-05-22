"use client";

import { cn } from "@/lib/utils";
import type { OptionWithDetail } from "@/lib/quiz-flow-v2";

/**
 * Multi-select chips. Requires the user to press Continue (rendered by the
 * orchestrator) — selection alone does not advance.
 */
export function MultiSelectScreen({
  options,
  selected,
  onToggle,
  onHaptic,
}: {
  options: OptionWithDetail[];
  selected: string[];
  onToggle: (value: string) => void;
  onHaptic?: () => void;
}) {
  return (
    <ul role="list" className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => {
                onHaptic?.();
                onToggle(opt.value);
              }}
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
  );
}
