"use client";

import Link from "next/link";

/**
 * Top-of-page announcement bar with rolling "next training block starts X"
 * urgency. Anchored to "next Tuesday". Vyrek programmes start on Tuesdays.
 * Pattern from Tonal / HAC ("OUR 2026 HYROX MEMBERSHIP IS NOW LIVE!").
 *
 * Server-rendered with the next-Tuesday date so the message is honest
 * (real anchor, not fake countdown) and meaningful at first paint.
 */
function nextTuesday(today: Date = new Date()): Date {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  // 2 = Tuesday in JS Date.getDay (0=Sun, 1=Mon, 2=Tue)
  const day = d.getDay();
  const diff = (2 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatLong(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function CohortBanner() {
  const tue = nextTuesday();
  const long = formatLong(tue);
  const short = formatShort(tue);
  return (
    <div className="relative isolate w-full border-b border-vyrek-border-subtle bg-vyrek-base/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center md:gap-3 md:px-8">
        <span aria-hidden className="inline-flex size-1.5 shrink-0 rounded-full bg-vyrek-accent animate-pulse" />
        <p className="text-[11px] leading-tight text-vyrek-text-secondary md:text-sm">
          {/* Mobile: ultra-short label. Desktop: long natural language. */}
          <span className="text-vyrek-text md:hidden">
            Next block: {short}.
          </span>
          <span className="hidden text-vyrek-text md:inline">
            Next training block starts {long}.
          </span>{" "}
          <Link
            href="/quiz"
            className="text-vyrek-accent underline-offset-4 hover:underline"
          >
            <span className="md:hidden">Build plan</span>
            <span className="hidden md:inline">Build your plan</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
