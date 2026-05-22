"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Standard option card used across single-select and multi-select question
 * screens. The dot top-right is the canonical "selected" affordance the
 * design system uses across the quiz.
 */
export function OptionCard({
  label,
  detail,
  badge,
  selected,
  onClick,
  icon,
}: {
  label: string;
  detail?: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex w-full items-start gap-4 rounded-md border bg-vyrek-elevated px-5 py-4 text-left transition-[border,background,transform] duration-fast ease-out active:scale-[0.99]",
        "min-h-[4rem]",
        selected
          ? "border-vyrek-accent bg-vyrek-overlay text-vyrek-text"
          : "border-vyrek-border text-vyrek-text hover:border-vyrek-border-strong",
      )}
    >
      {icon ? (
        <span aria-hidden className="mt-0.5 text-2xl leading-none">
          {icon}
        </span>
      ) : null}
      <span className="flex flex-1 flex-col">
        <span className="flex items-center justify-between gap-3">
          <span className="text-base font-medium">{label}</span>
          {badge ? (
            <span className="rounded-pill border border-vyrek-accent/40 bg-vyrek-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-vyrek-accent">
              {badge}
            </span>
          ) : null}
        </span>
        {detail ? (
          <span className="mt-1 text-sm leading-snug text-vyrek-text-secondary">
            {detail}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden
        className={cn(
          "absolute right-3 top-3 flex size-3 items-center justify-center rounded-full transition-[background,transform] duration-fast",
          selected
            ? "scale-100 bg-vyrek-accent"
            : "scale-0 bg-transparent",
        )}
      />
    </button>
  );
}
