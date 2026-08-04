import { formatTime } from "@/lib/results/format";
import { MicroLabel } from "../ui/primitives";
import type { AthleteRace } from "@/lib/results/source";

/**
 * Finish times across a career, oldest to newest.
 *
 * The reference site's equivalent is a bare min–max range strip per division:
 * two numbers and a line, which tells you the spread but not the trajectory.
 * This plots every race in order so you can see whether someone is actually
 * getting faster — which is the only question an athlete asks of their own
 * history.
 *
 * Divisions are drawn as separate series because a Doubles time and an Open
 * time on one axis is a meaningless comparison.
 */
export function ProgressionChart({ races }: { races: AthleteRace[] }) {
  const finished = races.filter((r) => r.finishSeconds > 0);
  if (finished.length < 2) return null;

  // Year is the tiebreak, because most races carry no date at all.
  const ordered = [...finished].sort((a, b) => {
    const byDate = (a.date || `${a.year}-00-00`).localeCompare(b.date || `${b.year}-00-00`);
    return byDate !== 0 ? byDate : a.year - b.year;
  });
  const byDivision = new Map<string, AthleteRace[]>();
  for (const race of ordered) {
    if (!byDivision.has(race.division)) byDivision.set(race.division, []);
    byDivision.get(race.division)!.push(race);
  }

  // Only plot divisions with enough races to show a trend; the rest would be
  // a single floating dot pretending to be a trajectory.
  const series = [...byDivision.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);

  if (series.length === 0) return null;

  const times = series.flatMap(([, list]) => list.map((r) => r.finishSeconds));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  // ⚠️ Placed by position, not by date, unless every race has one.
  //
  // `new Date("")` is Invalid Date and every sum from it is NaN, so an `x` of
  // NaN put every point at the same place: the chart rendered as two dots
  // stacked against the left edge. Most races have no date — the published
  // calendar covers upcoming events only — so this was the normal case.
  //
  // Even spacing loses the gap between races, which is a real loss. It is a
  // smaller one than a chart that does not draw.
  const stamps = ordered.map((r) => new Date(r.date).getTime());
  const datedThroughout = stamps.every((t) => Number.isFinite(t));
  const firstDate = datedThroughout ? stamps[0] : 0;
  const dateSpan = datedThroughout ? stamps[stamps.length - 1] - firstDate || 1 : 1;

  const positionOf = new Map(ordered.map((r, i) => [r.resultId, i]));
  const lastIndex = Math.max(1, ordered.length - 1);

  const W = 100;
  const H = 42;
  const x = (race: AthleteRace) =>
    datedThroughout
      ? ((new Date(race.date).getTime() - firstDate) / dateSpan) * W
      : ((positionOf.get(race.resultId) ?? 0) / lastIndex) * W;
  // Lower time is better, so faster sits higher on the chart.
  const y = (seconds: number) => H - ((hi - seconds) / (hi - lo)) * H;

  const STROKES = ["stroke-suth-accent", "stroke-suth-text-secondary", "stroke-[var(--results-slower)]"];
  const DOTS = ["bg-suth-accent", "bg-suth-text-secondary", "bg-[var(--results-slower)]"];

  return (
    <figure className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ PROGRESSION ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">Faster is higher</span>
      </figcaption>

      {/* The line is drawn in a stretched SVG so it spans the full width; the
          markers are HTML positioned over it. Circles inside a
          preserveAspectRatio="none" viewBox render as ovals, and SVG <title>
          tooltips do not fire on touch — HTML dots fix both, and give a real
          tap target. */}
      <div className="relative mt-3 h-36 w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={
            `Finish times across ${finished.length} races, from `
            + `${formatTime(max)} slowest to ${formatTime(min)} fastest.`
          }
        >
          {series.map(([division, list], si) => (
            <path
              key={division}
              d={list
                .map((r, i) => `${i === 0 ? "M" : "L"}${x(r).toFixed(2)},${y(r.finishSeconds).toFixed(2)}`)
                .join(" ")}
              fill="none"
              strokeWidth={1.2}
              className={STROKES[si]}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {series.map(([division, list], si) =>
          list.map((race) => (
            <span
              key={`${division}-${race.resultId}`}
              className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${DOTS[si]}`}
              style={{
                left: `${(x(race) / W) * 100}%`,
                top: `${(y(race.finishSeconds) / H) * 100}%`,
              }}
              title={`${race.eventCity} ${race.year}: ${formatTime(race.finishSeconds)}`}
            />
          )),
        )}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {series.map(([division, list], si) => (
          <li key={division} className="inline-flex items-center gap-1.5 text-suth-text-secondary">
            <span
              className={`inline-block h-0.5 w-3 ${
                si === 0 ? "bg-suth-accent"
                : si === 1 ? "bg-suth-text-secondary"
                : "bg-[var(--results-slower)]"
              }`}
              aria-hidden
            />
            {list[0].divisionLabel.replace("HYROX ", "")}
            <span className="results-num text-suth-text-tertiary">{list.length}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-suth-text-tertiary">
        <span>{ordered[0].year}</span>
        <span>{ordered[ordered.length - 1].year}</span>
      </div>
    </figure>
  );
}
