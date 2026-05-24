"use client";

import { cn } from "@/lib/utils";

/**
 * Week circles for the /plan page.
 *
 * Was a row of text pills ("Week 1", "Week 2", ...) where the long labels
 * cropped at the viewport edge. Now a row of fixed-size circles with the
 * week number inside and a lock SVG on locked weeks.
 *
 * Active week  : filled chartreuse, black number, 2px ring
 * Unlocked     : chartreuse-bordered, chartreuse number
 * Locked       : neutral-bordered, dim number with a small lock glyph
 *                stacked above
 */
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
    <nav aria-label="Programme weeks">
      <div
        role="tablist"
        aria-label="Programme weeks"
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3"
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
              aria-label={
                locked
                  ? `Week ${w} (locked, tap to unlock)`
                  : `Week ${w}`
              }
              onClick={() => (locked ? onLockedTap?.() : onSelect(w))}
              className={cn(
                "snap-start group relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 font-mono text-base font-bold tabular-nums transition-[border,background,color,transform] duration-fast active:scale-[0.95]",
                isActive &&
                  "border-vyrek-accent bg-vyrek-accent text-[#0A0A0A] shadow-[0_0_0_4px_rgba(163,230,53,0.12)]",
                !isActive &&
                  !locked &&
                  "border-vyrek-accent/60 bg-transparent text-vyrek-accent hover:border-vyrek-accent",
                locked &&
                  "border-vyrek-border-subtle bg-vyrek-elevated/50 text-vyrek-text-tertiary hover:border-vyrek-border hover:text-vyrek-text-secondary",
              )}
            >
              <span aria-hidden>{w}</span>
              {locked ? (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-vyrek-base p-0.5 text-vyrek-text-tertiary"
                >
                  <rect x="5" y="11" width="14" height="9" rx="1.5" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        Week {active}
        {active > unlockedWeeks ? " · locked" : null}
      </p>
    </nav>
  );
}
