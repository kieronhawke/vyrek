import { STATION_IDS, STATION_LABEL, type StationId } from "@/lib/results/model";
import { formatSplit } from "@/lib/results/format";
import { MicroLabel } from "../ui/primitives";

/**
 * The race strip — the signature element of the whole section.
 *
 * One horizontal bar for the entire race, runs and stations in order, each
 * segment's width proportional to the time it took. Chartreuse where the
 * athlete beat the division average for that segment, muted where they did
 * not. In one glance you can see the shape of a race: where it was won, where
 * it fell apart, how much of it was spent standing in the Roxzone.
 *
 * Nothing on the reference site does this. Their breakdown is a table of
 * numbers; this is the race.
 *
 * Server-rendered inline SVG — no chart library, no client JS, no layout shift.
 */
export function RaceStrip({
  runs, stations, roxzoneSeconds, averageRuns, averageStations,
}: {
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  averageRuns: number[];
  averageStations: Record<StationId, number>;
}) {
  type Segment = {
    key: string; label: string; seconds: number; average: number; kind: "run" | "station";
  };

  const segments: Segment[] = [];
  STATION_IDS.forEach((station, i) => {
    segments.push({
      key: `run-${i + 1}`, label: `Run ${i + 1}`, kind: "run",
      seconds: runs[i] ?? 0, average: averageRuns[i] ?? 0,
    });
    segments.push({
      key: station, label: STATION_LABEL[station], kind: "station",
      seconds: stations[station] ?? 0, average: averageStations[station] ?? 0,
    });
  });

  const working = segments.reduce((sum, s) => sum + s.seconds, 0);
  const total = working + roxzoneSeconds;
  if (total <= 0) return null;

  let cursor = 0;
  const placed = segments.map((segment) => {
    const width = (segment.seconds / total) * 100;
    const x = cursor;
    cursor += width;
    return { ...segment, x, width };
  });
  const roxWidth = (roxzoneSeconds / total) * 100;

  return (
    <figure className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ THE RACE ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">
          Segment width is time. Chartreuse beat the division average.
        </span>
      </figcaption>

      <svg
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        className="mt-3 h-16 w-full md:h-20"
        role="img"
        aria-label={
          `Race timeline. ${placed.map((s) => `${s.label} ${formatSplit(s.seconds)}`).join(", ")}, `
          + `Roxzone ${formatSplit(roxzoneSeconds)}.`
        }
      >
        {placed.map((segment) => {
          const faster = segment.average > 0 && segment.seconds < segment.average;
          return (
            <rect
              key={segment.key}
              x={segment.x}
              y={segment.kind === "run" ? 0 : 4}
              width={Math.max(0.15, segment.width - 0.12)}
              height={segment.kind === "run" ? 12 : 8}
              rx={0.2}
              className={
                faster
                  ? "fill-[var(--results-segment-fast)]"
                  : segment.kind === "run"
                    ? "fill-[var(--results-run)]"
                    : "fill-[var(--results-station)]"
              }
            >
              {/* Single string child: multiple text nodes inside an SVG <title>
                  serialise differently on server and client and trip hydration. */}
              <title>
                {`${segment.label}: ${formatSplit(segment.seconds)}${
                  segment.average > 0 ? ` (division average ${formatSplit(segment.average)})` : ""
                }`}
              </title>
            </rect>
          );
        })}
        <rect
          x={cursor}
          y={0}
          width={Math.max(0.15, roxWidth - 0.12)}
          height={12}
          rx={0.2}
          className="fill-[var(--results-roxzone)]"
        >
          <title>{`Roxzone (transitions): ${formatSplit(roxzoneSeconds)}`}</title>
        </rect>
      </svg>

      {/* Legend. Runs are the full-height blocks, stations the inset ones —
          without saying so the strip is decorative rather than readable. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-suth-text-tertiary">
        <LegendKey className="bg-[var(--results-segment-fast)]" label="Faster than average" />
        <LegendKey className="bg-[var(--results-run)]" label="Run" />
        <LegendKey className="bg-[var(--results-station)]" label="Station" />
        <LegendKey className="bg-[var(--results-roxzone)]" label="Roxzone" />
      </ul>
    </figure>
  );
}

function LegendKey({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-[2px] ${className}`} aria-hidden />
      {label}
    </li>
  );
}
