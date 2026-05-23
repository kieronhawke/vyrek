import { cn } from "@/lib/utils";

/**
 * Inline SVG sparkline. No chart library; ~30 lines that scale to any size.
 * Designed for the 30-day Stat tiles on /admin: shows shape + trend, not
 * specific values.
 */
export function Sparkline({
  values,
  className,
  width = 120,
  height = 36,
  strokeWidth = 1.5,
  filled = true,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  filled?: boolean;
}) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.2}
        />
      </svg>
    );
  }
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const padX = 1;
  const padY = 2;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const pts = values.map((v, i) => {
    const x = padX + (i * innerW) / Math.max(1, values.length - 1);
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(2)},${height} L${pts[0][0].toFixed(2)},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={cn("text-vyrek-accent", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {filled ? (
        <path d={areaPath} fill="currentColor" opacity={0.12} />
      ) : null}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
