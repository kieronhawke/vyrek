"use client";

import { useEffect, useState } from "react";
import { MicroLabel } from "../ui/primitives";

/**
 * Countdown to an upcoming race.
 *
 * Rendered client-side because it ticks, but it renders a stable server-safe
 * placeholder first so there is no hydration mismatch and no layout shift when
 * the real figures arrive.
 */
export function EventCountdown({ startDate }: { startDate: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(startDate).getTime();
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  const parts = splitDuration(remaining);

  return (
    <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-5">
      <MicroLabel>[ TIME TO RACE DAY ]</MicroLabel>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {parts.map((part) => (
          <div key={part.label}>
            <div className="results-num text-2xl leading-none text-suth-text md:text-4xl">
              {part.value}
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
              {part.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function splitDuration(ms: number | null) {
  if (ms === null) {
    return [
      { label: "days", value: "––" },
      { label: "hrs", value: "––" },
      { label: "min", value: "––" },
      { label: "sec", value: "––" },
    ];
  }
  const total = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    { label: "days", value: pad(Math.floor(total / 86400)) },
    { label: "hrs", value: pad(Math.floor((total % 86400) / 3600)) },
    { label: "min", value: pad(Math.floor((total % 3600) / 60)) },
    { label: "sec", value: pad(total % 60) },
  ];
}
