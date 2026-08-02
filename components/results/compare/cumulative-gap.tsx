import { formatSplit } from "@/lib/results/format";

/**
 * Cumulative gap across the race.
 *
 * The single most useful thing you can draw from two sets of splits: the
 * running difference, segment by segment. A flat line then a cliff says the
 * race turned at one station; a steady slope says it was attrition. The
 * reference site's compare view gives you per-segment deltas in a table and
 * leaves you to add them up in your head.
 *
 * Zero line is dead level. Above means the first athlete is ahead.
 */
export function CumulativeGap({
  segments, leftName, rightName,
}: {
  segments: { key: string; label: string; a: number; b: number }[];
  leftName: string;
  rightName: string;
}) {
  // Running total of (b − a): positive means the first athlete is ahead.
  // Built with a scan rather than a mutable closure so nothing is reassigned
  // across render — the React Compiler rejects the latter.
  const points = segments.reduce<{ label: string; gap: number }[]>((acc, segment) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].gap : 0;
    acc.push({ label: segment.label, gap: previous + (segment.b - segment.a) });
    return acc;
  }, []);

  const gaps = points.map((p) => p.gap);
  const extent = Math.max(Math.abs(Math.min(...gaps, 0)), Math.abs(Math.max(...gaps, 0)), 30);

  const W = 100;
  const H = 40;
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * W;
  const y = (gap: number) => H / 2 - (gap / extent) * (H / 2) * 0.9;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.gap).toFixed(2)}`)
    .join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(2)},${H / 2} L0,${H / 2} Z`;
  const final = points[points.length - 1]?.gap ?? 0;
  const leader = final > 0 ? leftName : rightName;

  return (
    <div>
      <div className="relative mt-3 h-32 w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={
            `Cumulative gap across ${points.length} segments. `
            + `${leader} finished ahead by ${formatSplit(Math.abs(final))}.`
          }
        >
          <path d={area} className="fill-suth-accent/10" />
          <line
            x1={0} y1={H / 2} x2={W} y2={H / 2}
            className="stroke-suth-border-strong"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path}
            fill="none"
            strokeWidth={1.4}
            className="stroke-suth-accent"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>

        {points.map((point, i) => (
          <span
            key={point.label}
            className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-suth-accent/70"
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(point.gap) / H) * 100}%` }}
            title={`After ${point.label}: ${point.gap === 0 ? "level" : `${formatSplit(Math.abs(point.gap))} to ${point.gap > 0 ? leftName : rightName}`}`}
          />
        ))}
      </div>

      <p className="mt-2 text-xs text-suth-text-secondary">
        {final === 0
          ? "Dead level at the line."
          : <>
              <span className="text-suth-text">{leader}</span> finished{" "}
              <span className="results-num text-suth-accent">{formatSplit(Math.abs(final))}</span>{" "}
              ahead.
            </>}
      </p>
    </div>
  );
}
