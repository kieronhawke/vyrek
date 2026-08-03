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
        "relative flex w-full items-start gap-4 rounded-md border bg-suth-elevated px-5 py-4 text-left transition-[border,background,transform] duration-fast ease-out active:scale-[0.99]",
        // 4rem is a thumb target. A mouse does not need one, and on a laptop
        // the extra height is what pushed Continue below the fold on a screen
        // with ten options.
        "min-h-[4rem] lg:min-h-0 lg:py-3",
        "hover:border-suth-border-strong",
        selected
          ? "border-suth-accent bg-suth-overlay text-suth-text"
          : "border-suth-border text-suth-text hover:border-suth-border-strong",
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
            <span className="rounded-pill border border-suth-accent/40 bg-suth-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-accent">
              {badge}
            </span>
          ) : null}
        </span>
        {detail ? (
          <span className="mt-1 text-sm leading-snug text-suth-text-secondary">
            {detail}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden
        className={cn(
          "absolute right-3 top-3 flex size-3 items-center justify-center rounded-full transition-[background,transform] duration-fast",
          selected
            ? "scale-100 bg-suth-accent"
            : "scale-0 bg-transparent",
        )}
      />
    </button>
  );
}
