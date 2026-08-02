"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/results/format";

/**
 * Division switcher.
 *
 * Swipeable on mobile, and it auto-scrolls the active tab into view on load —
 * without that, arriving at Pro Doubles Women on a phone shows you the start
 * of an 16-item rail with no indication of where you are.
 *
 * Entrant counts sit on the tabs so you can tell a 3,000-strong division from
 * a 22-strong one before committing to the tap.
 */
export function DivisionTabs({
  divisions, activeDivision, className,
}: {
  eventSlug: string;
  activeDivision: string;
  divisions: { code: string; label: string; href: string; count: number }[];
  className?: string;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <div
      className={cn(
        "-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0",
        className,
      )}
    >
      {divisions.map((division) => {
        const active = division.code === activeDivision;
        return (
          <Link
            key={division.code}
            href={division.href}
            ref={active ? activeRef : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-2 rounded-pill border px-3",
              "text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-suth-accent",
              active
                ? "border-suth-accent/40 bg-suth-accent/10 text-suth-accent"
                : "border-suth-border bg-suth-elevated text-suth-text-secondary hover:text-suth-text",
            )}
          >
            {division.label}
            <span className="results-num text-[10px] text-suth-text-tertiary">
              {formatCount(division.count)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
