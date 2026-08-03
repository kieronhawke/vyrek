"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { stationGuideHref } from "@/lib/results/model";
import { formatSplit, formatPercent } from "@/lib/results/format";
import { MicroLabel } from "../ui/primitives";
import type { StationProfile } from "@/lib/results/athlete-analytics";

/**
 * Career station profile — sortable.
 *
 * This is the table that answers "what should I train", which is the question
 * behind every visit to an athlete page. Sorted weakest-first by default,
 * because the answer is usually at that end.
 *
 * Volatility earns its column: a station that is sometimes excellent and
 * sometimes poor is a technique or pacing problem, and a station that is
 * consistently mediocre is a fitness one. Those need different work, and no
 * single average distinguishes them.
 */

type SortKey = "standing" | "volatility" | "best" | "races";

export function StationProfileTable({ profile }: { profile: StationProfile[] }) {
  const [sort, setSort] = useState<SortKey>("standing");

  const sorted = [...profile].sort((a, b) => {
    switch (sort) {
      case "volatility": return b.volatility - a.volatility;
      case "best": return a.bestSeconds - b.bestSeconds;
      case "races": return b.races - a.races;
      default: return a.averagePercentile - b.averagePercentile;
    }
  });

  const columns: { key: SortKey; label: string }[] = [
    { key: "standing", label: "Standing" },
    { key: "volatility", label: "Volatility" },
    { key: "best", label: "Best" },
    { key: "races", label: "Races" },
  ];

  return (
    <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ STATION PROFILE ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">Across every race on record</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {columns.map((column) => (
          <button
            key={column.key}
            type="button"
            onClick={() => setSort(column.key)}
            aria-pressed={sort === column.key}
            className={cn(
              "min-h-[32px] rounded-pill border px-2.5 text-[11px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
              sort === column.key
                ? "border-suth-accent/40 bg-suth-accent/10 text-suth-accent"
                : "border-suth-border text-suth-text-secondary hover:text-suth-text",
            )}
          >
            {column.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {sorted.map((station) => (
          <li key={station.station}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <Link
                href={stationGuideHref(station.station)}
                data-inline-tap
                className="truncate text-suth-text hover:text-suth-accent
                           focus-visible:outline-2 focus-visible:outline-suth-accent"
              >
                {station.label}
              </Link>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="results-num text-suth-text">{formatSplit(station.bestSeconds)}</span>
                <span className="results-num w-10 text-right text-suth-text-tertiary">
                  {formatPercent(station.averagePercentile)}
                </span>
              </span>
            </div>

            <div className="relative mt-1 h-2 overflow-hidden rounded-sm bg-suth-overlay">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-sm",
                  station.averagePercentile >= 50
                    ? "bg-[var(--results-faster-bar)]"
                    : "bg-[var(--results-slower-bar)]",
                )}
                style={{ width: `${Math.max(2, station.averagePercentile)}%` }}
              />
            </div>

            <p className="mt-1 text-[10px] text-suth-text-tertiary">
              {station.races} race{station.races === 1 ? "" : "s"} ·{" "}
              {station.volatility >= 45
                ? "swings a lot — usually pacing or technique"
                : station.volatility >= 20
                  ? "moderately consistent"
                  : "very repeatable"}
              {station.worstSeconds > station.bestSeconds
                ? ` · ${formatSplit(station.bestSeconds)}–${formatSplit(station.worstSeconds)}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
