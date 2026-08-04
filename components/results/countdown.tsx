"use client";

import { useEffect, useState } from "react";
import { formatRelativeDate } from "@/lib/results/format";

/**
 * The line on an upcoming event card, ticking.
 *
 * ⚠️ It renders `initial` — the server's text — until it has mounted.
 *
 * A relative time computed on the client during the first render is a
 * hydration mismatch by construction: the server rendered "in 20 hours" some
 * seconds ago and the browser would now say "in 19 hours", so React throws away
 * the markup and re-renders. Taking the server's answer for one frame and only
 * then starting to tick costs nothing and keeps the page static until it has
 * genuinely changed.
 *
 * The interval matches the unit on display. A card reading "in 3 months" that
 * recomputes every second is 2.6 million renders to change one word, on a page
 * that may be showing a dozen of them.
 */
export function Countdown({
  startDate,
  initial,
  className,
}: {
  startDate: string;
  initial: string;
  className?: string;
}) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    const target = new Date(startDate).getTime();
    if (!startDate || Number.isNaN(target)) return;

    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const now = new Date();
      setText(formatRelativeDate(startDate, now));

      const away = Math.abs(target - now.getTime());
      // Seconds only inside the last hour, minutes inside the last day, and an
      // hour beyond that — nothing further away can change sooner.
      const every = away < 3_600_000 ? 1_000 : away < 86_400_000 ? 30_000 : 3_600_000;
      timer = setTimeout(tick, every);
    };

    tick();
    return () => clearTimeout(timer);
  }, [startDate]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
