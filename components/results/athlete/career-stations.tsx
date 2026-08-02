import { STATION_IDS, STATION_LABEL, type StationId } from "@/lib/results/model";
import { formatSplit } from "@/lib/results/format";
import { MicroLabel, Delta } from "../ui/primitives";

/**
 * Career splits per station — every race as a dot on one axis.
 *
 * This pattern is adapted from the reference site's Stations tab, which is the
 * best idea on their product. Three things make ours more useful:
 *
 * 1. **A division-average marker.** Theirs shows only the athlete's own spread,
 *    so a tight cluster looks like consistency whether it is fast or slow. The
 *    marker turns the axis into a judgement.
 * 2. **Implausible splits are excluded from the scale.** Their Run 2 axis reads
 *    "3:06 – 42:21" because one bad data point stretched it; every real split
 *    then collapses into the left edge and the chart says nothing. We drop
 *    outliers from the axis and say how many we dropped.
 * 3. **Best and most recent are marked**, so improvement is visible without
 *    hovering anything — which matters, because on a phone there is no hover.
 */

export type CareerSplit = {
  station: StationId;
  seconds: number;
  eventCity: string;
  year: number;
  isLatest: boolean;
};

export function CareerStations({
  splits, divisionAverages,
}: {
  splits: CareerSplit[];
  divisionAverages: Partial<Record<StationId, number>>;
}) {
  if (splits.length === 0) return null;

  return (
    <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ EVERY SPLIT, BY STATION ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">
          Each dot is one race · line marks the division average
        </span>
      </div>

      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {STATION_IDS.map((station) => (
          <StationAxis
            key={station}
            station={station}
            splits={splits.filter((s) => s.station === station)}
            average={divisionAverages[station]}
          />
        ))}
      </ul>
    </section>
  );
}

/** Median absolute deviation — robust to the single wild value that ruins a mean. */
function plausibleRange(values: number[]): { lo: number; hi: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] || median * 0.15;
  return { lo: median - mad * 6, hi: median + mad * 6 };
}

function StationAxis({
  station, splits, average,
}: {
  station: StationId;
  splits: CareerSplit[];
  average?: number;
}) {
  if (splits.length === 0) return null;

  const values = splits.map((s) => s.seconds);
  const { lo, hi } = plausibleRange(values);
  const kept = splits.filter((s) => s.seconds >= lo && s.seconds <= hi);
  const dropped = splits.length - kept.length;
  if (kept.length === 0) return null;

  const keptValues = kept.map((s) => s.seconds);
  const best = Math.min(...keptValues);
  const worst = Math.max(...keptValues);
  const axisLo = Math.min(best, average ?? best);
  const axisHi = Math.max(worst, average ?? worst);
  const span = axisHi - axisLo || 1;
  const pos = (seconds: number) => ((seconds - axisLo) / span) * 100;

  const latest = kept.find((s) => s.isLatest);

  return (
    <li className="rounded-sm border border-suth-border-subtle/60 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-suth-text">{STATION_LABEL[station]}</span>
        <span className="flex items-baseline gap-2 text-[11px]">
          <span className="results-num text-suth-accent">{formatSplit(best)}</span>
          <span className="text-suth-text-tertiary">best</span>
          {average ? <Delta seconds={best - average} className="text-[10px]" /> : null}
        </span>
      </div>

      <div className="relative mt-2.5 h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-suth-border" />

        {average !== undefined && average >= axisLo && average <= axisHi ? (
          <div
            className="absolute top-0 h-4 w-px bg-suth-text-secondary"
            style={{ left: `${pos(average)}%` }}
            aria-hidden
            title={`Division average ${formatSplit(average)}`}
          />
        ) : null}

        {kept.map((split, i) => (
          <div
            key={`${split.eventCity}-${split.year}-${i}`}
            className={
              "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full "
              + (split.isLatest
                ? "bg-suth-accent ring-2 ring-suth-accent/30"
                : split.seconds === best
                  ? "bg-suth-accent/80"
                  : "bg-suth-text-tertiary/60")
            }
            style={{ left: `${pos(split.seconds)}%` }}
            title={`${split.eventCity} ${split.year}: ${formatSplit(split.seconds)}`}
          />
        ))}
      </div>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-suth-text-tertiary">
        <span>{formatSplit(axisLo)}</span>
        {latest ? (
          <span className="text-suth-accent">
            latest {formatSplit(latest.seconds)}
          </span>
        ) : null}
        <span>{formatSplit(axisHi)}</span>
      </div>

      {dropped > 0 ? (
        <p className="mt-1 text-[10px] text-suth-warning">
          {dropped} implausible split{dropped > 1 ? "s" : ""} excluded from this axis
        </p>
      ) : null}
    </li>
  );
}
