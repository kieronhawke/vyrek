import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatSplit, formatPercent } from "@/lib/results/format";
import { stationGuideHref } from "@/lib/results/model";
import { MicroLabel, Delta } from "../ui/primitives";
import { GrowBar } from "../ui/reveal";
import type { StationStanding } from "@/lib/results/analysis";

/**
 * Every station against the division average, sorted worst-first.
 *
 * Sorting by standing rather than by race order is the point: the thing you
 * need to fix should be the first thing you read, not the eighth. The
 * reference site lists stations in race order and leaves the ranking to you.
 */
export function StationBars({ standings }: { standings: StationStanding[] }) {
  const ranked = [...standings].sort((a, b) => a.percentile - b.percentile);
  const max = Math.max(...standings.map((s) => Math.max(s.seconds, s.averageSeconds)), 1);

  return (
    <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ STATIONS, WEAKEST FIRST ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">vs division average</span>
      </div>

      <ul className="mt-3 space-y-2.5">
        {ranked.map((standing) => {
          const width = Math.max(3, (standing.seconds / max) * 100);
          const averageMark = Math.min(100, (standing.averageSeconds / max) * 100);
          const faster = standing.deltaSeconds <= 0;
          return (
            <li key={standing.station}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <Link
                  href={stationGuideHref(standing.station)}
                  data-inline-tap
                  className="truncate text-suth-text hover:text-suth-accent
                             focus-visible:outline-2 focus-visible:outline-suth-accent"
                >
                  {standing.label}
                </Link>
                <span className="flex shrink-0 items-baseline gap-2.5">
                  <span className="results-num text-suth-text">{formatSplit(standing.seconds)}</span>
                  <Delta seconds={standing.deltaSeconds} className="w-14 text-right" />
                  <span className="results-num w-12 text-right text-suth-text-tertiary">
                    {formatPercent(standing.percentile)}
                  </span>
                </span>
              </div>
              <div className="relative mt-1 h-2 overflow-hidden rounded-sm bg-suth-overlay">
                <GrowBar
                  width={width}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-sm",
                    faster ? "bg-[var(--results-faster-bar)]" : "bg-[var(--results-slower-bar)]",
                  )}
                />
                <div
                  className="absolute inset-y-0 w-px bg-suth-text-secondary"
                  style={{ left: `${averageMark}%` }}
                  aria-hidden
                  title="Division average"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-suth-text-tertiary">
        The percentage is where this split places you in the division at this event. The vertical
        line marks the division average.
      </p>
    </section>
  );
}
