"use client";

import { cn } from "@/lib/utils";

export function WeekTabs({
  total = 12,
  active,
  unlockedWeeks = 1,
  onSelect,
  onLockedTap,
}: {
  total?: number;
  active: number;
  /** Weeks 1..unlockedWeeks are tappable; the rest are locked and scroll to paywall. */
  unlockedWeeks?: number;
  onSelect: (week: number) => void;
  onLockedTap?: () => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Programme weeks"
      className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2"
      style={{ scrollbarWidth: "none" }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const w = i + 1;
        const locked = w > unlockedWeeks;
        const isActive = active === w;
        return (
          <button
            key={w}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => (locked ? onLockedTap?.() : onSelect(w))}
            className={cn(
              "snap-start inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-[border,background,color] duration-fast",
              isActive
                ? "border-vyrek-accent bg-vyrek-accent text-[#0A0A0A]"
                : locked
                  ? "border-vyrek-border-subtle text-vyrek-text-tertiary hover:border-vyrek-border hover:text-vyrek-text-secondary"
                  : "border-vyrek-border text-vyrek-text hover:border-vyrek-border-strong",
            )}
          >
            <span>Week {w}</span>
            {locked ? (
              <span aria-hidden className="opacity-60">
                ◯
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
