"use client";

import Link from "next/link";

/**
 * Top-of-page announcement bar with rolling "next training block starts X"
 * urgency. Anchored to "next Tuesday" — Vyrek programmes start on Tuesdays.
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

function formatNextTuesday(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function CohortBanner() {
  const tue = nextTuesday();
  const label = formatNextTuesday(tue);
  return (
    <div className="relative isolate w-full border-b border-vyrek-border-subtle bg-vyrek-base/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-5 py-2 text-center md:px-8">
        <span aria-hidden className="inline-flex size-1.5 shrink-0 rounded-full bg-vyrek-accent animate-pulse" />
        <p className="text-xs leading-tight text-vyrek-text-secondary md:text-sm">
          <span className="text-vyrek-text">Next training block starts {label}.</span>{" "}
          <Link
            href="/quiz"
            className="text-vyrek-accent underline-offset-4 hover:underline"
          >
            Build your plan
          </Link>
        </p>
      </div>
    </div>
  );
}
