"use client";

import { cn } from "@/lib/utils";

export function WeekTabs({
  total = 12,
  active,
  onSelect,
}: {
  total?: number;
  active: number;
  onSelect: (week: number) => void;
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
        const locked = w !== 1 && active !== w;
        return (
          <button
            key={w}
            type="button"
            role="tab"
            aria-selected={active === w}
            onClick={() => onSelect(w)}
            className={cn(
              "snap-start whitespace-nowrap rounded-pill border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-[border,background,color] duration-fast",
              active === w
                ? "border-vyrek-accent bg-vyrek-accent text-[#0A0A0A]"
                : locked
                  ? "border-vyrek-border-subtle text-vyrek-text-tertiary"
                  : "border-vyrek-border text-vyrek-text hover:border-vyrek-border-strong",
            )}
          >
            Week {w}
            {w !== 1 ? "  ·  locked" : ""}
          </button>
        );
      })}
    </div>
  );
}
