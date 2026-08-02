"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { GlobalSearch } from "./global-search";

/**
 * The landing page's hero search.
 *
 * The brief calls search "the page's job — make it the thesis", and it is the
 * clearest gap on the reference site, where search is a small header field.
 * This is a full-width target that opens the same palette the ⌘K hotkey does,
 * so there is one search implementation, not two.
 */
export function HeroSearch({ athleteCount, eventCount }: { athleteCount: number; eventCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-md border border-suth-border
                   bg-suth-elevated px-4 py-4 text-left transition-colors
                   hover:border-suth-accent/40 md:py-5
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
      >
        <Search className="size-5 shrink-0 text-suth-text-tertiary transition-colors
                           group-hover:text-suth-accent" aria-hidden />
        <span className="flex-1 text-base text-suth-text-secondary md:text-lg">
          Search any athlete or event
        </span>
        <kbd className="results-num hidden rounded-sm border border-suth-border px-2 py-1
                        text-[11px] text-suth-text-tertiary md:inline-block">
          ⌘K
        </kbd>
      </button>

      <p className="mt-2.5 text-xs text-suth-text-tertiary">
        <span className="results-num text-suth-text-secondary">
          {athleteCount.toLocaleString("en-GB")}
        </span>{" "}
        athletes across{" "}
        <span className="results-num text-suth-text-secondary">{eventCount}</span> events
      </p>

      <GlobalSearch open={open} onClose={() => setOpen(false)} />
    </>
  );
}
