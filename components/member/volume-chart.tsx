import type { WeekVolume } from "@/lib/member/demo";

/**
 * Inline SVG stacked-bar chart for weekly training volume. Server-rendered.
 *
 * Each week is a column with three stacked segments (running km, strength
 * min, stations min). The y-axis is in "load units", running km is x3
 * because a km counts for more than a minute of lifting in this rough
 * weighting. The point isn't precision, it's the shape.
 */
export function VolumeChart({ data }: { data: WeekVolume[] }) {
  const W = 320;
  const H = 120;
  const PAD = 16;
  const colW = (W - PAD * 2) / data.length;

  const load = data.map((w) => w.runningKm * 3 + w.strengthMin + w.stationsMin);
  const max = Math.max(...load, 1);
  const barW = Math.max(6, colW * 0.6);

  return (
    <figure className="rounded-2xl border border-vyrek-border-subtle bg-vyrek-elevated/60 p-4">
      <figcaption className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Weekly load · last {data.length} weeks
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          Run · Strength · Stations
        </p>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 block w-full"
        role="img"
        aria-label="Weekly training volume by category"
      >
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
        {data.map((w, i) => {
          const x = PAD + i * colW + (colW - barW) / 2;
          const runH = (w.runningKm * 3) / max * (H - PAD * 2);
          const strH = (w.strengthMin) / max * (H - PAD * 2);
          const staH = (w.stationsMin) / max * (H - PAD * 2);
          const base = H - PAD;
          return (
            <g key={w.weekNumber}>
              <rect
                x={x}
                y={base - runH}
                width={barW}
                height={runH}
                fill="#FF6B2B"
                opacity={0.95}
                rx={1.5}
              />
              <rect
                x={x}
                y={base - runH - strH}
                width={barW}
                height={strH}
                fill="#F5A77E"
                opacity={0.95}
                rx={1.5}
              />
              <rect
                x={x}
                y={base - runH - strH - staH}
                width={barW}
                height={staH}
                fill="#F8DAC6"
                opacity={0.9}
                rx={1.5}
              />
              <text
                x={x + barW / 2}
                y={H - 4}
                fill="rgba(255,255,255,0.45)"
                fontSize={9}
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                W{w.weekNumber}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
