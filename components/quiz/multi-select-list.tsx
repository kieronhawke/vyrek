"use client";

import { cn } from "@/lib/utils";
import type { Option } from "@/lib/quiz-schema";

export function MultiSelectList({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <ul role="list" className="space-y-3">
      {options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => onToggle(opt.value)}
              aria-pressed={on}
              className={cn(
                "flex h-14 w-full items-center justify-between rounded-md border bg-vyrek-elevated px-5 text-left text-base font-medium transition-[border,background,transform] duration-fast ease-out active:scale-[0.99]",
                on
                  ? "border-vyrek-accent bg-vyrek-overlay text-vyrek-text"
                  : "border-vyrek-border text-vyrek-text hover:border-vyrek-border-strong",
              )}
            >
              <span>{opt.label}</span>
              <span
                aria-hidden
                className={cn(
                  "flex size-5 items-center justify-center rounded-sm border transition-colors",
                  on
                    ? "border-vyrek-accent bg-vyrek-accent text-[#0A0A0A]"
                    : "border-vyrek-border-strong text-transparent",
                )}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
