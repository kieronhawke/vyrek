import { formatSplit } from "@/lib/results/format";
import type { Distribution } from "@/lib/results/percentiles";

/**
 * How long a station takes the field — the shape behind a goal split.
 *
 * A guide can tell you a good wall balls time is 4:30, and the number means
 * nothing on its own. The distribution is the context: where the mass sits, how
 * long the slow tail runs, and how much of the field is inside the split you are
 * chasing. `Distribution.histogram` is computed for exactly this and had no
 * chart to render it.
 *
 * Deliberately plain SVG, server-rendered. It is a static shape on a guide page
 * — no interaction to justify shipping a chart library, and a bar chart drawn as
 * `<rect>` is legible in a screenshot, which is how these pages get shared.
 */

const WIDTH = 640;
const HEIGHT = 150;
const PAD_BOTTOM = 22;
const PAD_LEFT = 2;

export function StationHistogram({
  distribution,
  stationName,
  divisionLabel,
  markSeconds,
}: {
  distribution: Distribution;
  stationName: string;
  divisionLabel: string;
  /** Optional goal split to draw across the field, e.g. the sub-60 target. */
  markSeconds?: number;
}) {
  const buckets = distribution.histogram.filter((b) => Number.isFinite(b.count));

  // ⚠️ Renders nothing rather than an empty axis. A station with no splits yet
  // is the normal state early in a season, and an empty chart reads as breakage.
  if (buckets.length === 0 || distribution.count === 0) return null;

  const peak = Math.max(...buckets.map((b) => b.count), 1);
  const lo = buckets[0].from;
  const hi = buckets[buckets.length - 1].to;
  const span = Math.max(1, hi - lo);
  const plotH = HEIGHT - PAD_BOTTOM;
  const barW = (WIDTH - PAD_LEFT * 2) / buckets.length;
  const x = (seconds: number) => PAD_LEFT + ((seconds - lo) / span) * (WIDTH - PAD_LEFT * 2);

  const median = distribution.breakpoints[50];
  const markX = markSeconds !== undefined && markSeconds >= lo && markSeconds <= hi
    ? x(markSeconds)
    : null;

  const summary =
    `${stationName} times across ${distribution.count.toLocaleString("en-GB")} ${divisionLabel} `
    + `results. Median ${formatSplit(median)}, ranging from ${formatSplit(distribution.min)} `
    + `to ${formatSplit(distribution.max)}.`;

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
      >
        {buckets.map((bucket, i) => {
          const h = (bucket.count / peak) * (plotH - 6);
          return (
            <rect
              key={`${bucket.from}-${i}`}
              x={PAD_LEFT + i * barW + 0.5}
              y={plotH - h}
              width={Math.max(0.5, barW - 1)}
              height={h}
              rx="1"
              className="fill-suth-accent/35"
            />
          );
        })}

        {/* Median first, because it is the number most people are placing
            themselves against. */}
        <line
          x1={x(median)} y1={0} x2={x(median)} y2={plotH}
          className="stroke-suth-text-tertiary"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {markX !== null ? (
          <line
            x1={markX} y1={0} x2={markX} y2={plotH}
            className="stroke-suth-accent"
            strokeWidth="2"
          />
        ) : null}

        <line
          x1={0} y1={plotH} x2={WIDTH} y2={plotH}
          className="stroke-suth-border"
          strokeWidth="1"
        />

        <text x={PAD_LEFT} y={HEIGHT - 6} fontSize="11" className="fill-suth-text-tertiary">
          {formatSplit(lo)}
        </text>
        <text
          x={x(median)} y={HEIGHT - 6} fontSize="11" textAnchor="middle"
          className="fill-suth-text-tertiary"
        >
          median {formatSplit(median)}
        </text>
        <text
          x={WIDTH - PAD_LEFT} y={HEIGHT - 6} fontSize="11" textAnchor="end"
          className="fill-suth-text-tertiary"
        >
          {formatSplit(hi)}
        </text>
      </svg>

      <figcaption className="mt-2 text-xs text-suth-text-tertiary">
        {summary}
        {markSeconds !== undefined ? (
          <>
            {" "}
            The solid line is a {formatSplit(markSeconds)} target.
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
