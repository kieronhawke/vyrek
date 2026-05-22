"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { OptionWithDetail } from "@/lib/quiz-flow-v2";

const AUTO_ADVANCE_MS = 200;

/**
 * Single-select screen with the Phase B2 auto-advance rule:
 * tapping any option commits the answer, lights up the card, and routes to
 * the next screen 200ms later. No Next button.
 */
export function SingleSelectScreen({
  options,
  current,
  onSelect,
  onHaptic,
}: {
  options: OptionWithDetail[];
  current: string | undefined;
  onSelect: (value: string) => void;
  onHaptic?: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => onSelect(pending), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [pending, onSelect]);

  return (
    <ul role="list" className="space-y-3">
      {options.map((opt) => {
        const selected = pending === opt.value || current === opt.value;
        return (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => {
                if (pending) return; // prevent double-tap
                onHaptic?.();
                setPending(opt.value);
              }}
              aria-pressed={selected}
              className={cn(
                "flex w-full flex-col rounded-md border bg-vyrek-elevated px-5 py-4 text-left transition-[border,background,transform] duration-fast ease-out active:scale-[0.99]",
                selected
                  ? "border-vyrek-accent bg-vyrek-overlay text-vyrek-text"
                  : "border-vyrek-border text-vyrek-text hover:border-vyrek-border-strong",
                opt.detail ? "min-h-[5rem]" : "min-h-16",
              )}
            >
              <span className="flex items-center justify-between gap-4">
                <span className="text-base font-medium">{opt.label}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    selected
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
              </span>
              {opt.detail && (
                <span className="mt-2 text-sm leading-snug text-vyrek-text-secondary">
                  {opt.detail}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
