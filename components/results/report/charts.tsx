import { formatTime, formatSplit, formatDelta } from "@/lib/results/format";
import { BAND_ORDER, BAND_LABEL, type BandName } from "@/lib/results/race-report";
import { cn } from "@/lib/utils";

/**
 * Charts for the race report.
 *
 * Inline SVG throughout, and no charting library — the section has a
 * zero-new-dependency rule, and a report that has to be printable is better
 * served by markup we control anyway. A canvas chart is a blank rectangle on
 * paper and invisible to a screen reader; an SVG is neither.
 *
 * Two rules every chart here follows:
 *
 * 1. **Colour is never the only channel.** Every series is also labelled,
 *    positioned or shaped. The report prints in greyscale as often as not, and
 *    roughly one man in twelve cannot separate the red-green pair these charts
 *    would otherwise lean on.
 * 2. **Ink comes from CSS variables, not hex.** `results-print.css` inverts the
 *    whole document for paper; a hardcoded fill would survive that inversion
 *    and come out as dark-on-dark.
 *
 * Each chart carries a `<title>` and a text summary for screen readers, because
 * the numbers are the point and a shape alone does not convey them.
 */

/* ── Shared ─────────────────────────────────────────────────────────── */

const AXIS = "var(--report-axis, #3A3A38)";
const INK = "var(--report-ink, #F5F5F3)";
const DIM = "var(--report-dim, #8A8A88)";
const ACCENT = "var(--report-accent, #A3E635)";
const WARN = "var(--report-warn, #F59E0B)";

/** Band fills, fastest to slowest. Also distinguishable by position in a row. */
const BAND_FILL: Record<BandName, string> = {
  excellent: "var(--report-band-1, #A3E635)",
  great: "var(--report-band-2, #C7E88A)",
  expected: "var(--report-band-3, #6B7A55)",
  subpar: "var(--report-band-4, #4A4A44)",
  poor: "var(--report-band-5, #2E2E2C)",
};

function ChartFrame({
  title, summary, children, className, viewBox,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
  className?: string;
  viewBox: string;
}) {
  return (
    <figure className={cn("report-chart", className)}>
      <svg
        viewBox={viewBox}
        className="w-full"
        role="img"
        aria-label={`${title}. ${summary}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{`${title}. ${summary}`}</title>
        {children}
      </svg>
    </figure>
  );
}

/* ── Radar: percentile by station ───────────────────────────────────── */

export type RadarPoint = { label: string; percentile: number };

/**
 * The signature chart of the report: how you rank on each station, all at once.
 *
 * A radar is the wrong tool for comparing magnitudes and the right one for
 * showing *shape* — and shape is exactly the question here. An athlete does not
 * want eight numbers, they want to see which side of the octagon is caved in.
 *
 * The athlete's own overall standard is drawn as a second ring, which is what
 * makes it readable: the gap between the two outlines is the report's whole
 * thesis rendered as a picture.
 */
export function StationRadar({
  points, standardPercentile,
}: {
  points: RadarPoint[];
  standardPercentile: number;
}) {
  if (points.length < 3) return null;

  // The viewBox is deliberately much wider than the plot.
  //
  // The first version sized everything off one `size` and placed the labels at
  // 1.22x the radius, which put "Sandbag Lunges" partly outside the canvas and
  // clipped it to "ndbag Lunges". A radar's labels need roughly as much room
  // again as the plot itself, and the widest label here is fourteen characters.
  const width = 500;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2 + 4;
  const radius = 104;
  const labelRadius = radius + 30;
  const n = points.length;

  // Start at 12 o'clock and go clockwise, which is how people read a dial.
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const at = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  };
  /** Label positions use an absolute offset from the ring, not a percentage. */
  const labelAt = (i: number) =>
    [cx + Math.cos(angle(i)) * labelRadius, cy + Math.sin(angle(i)) * labelRadius] as const;

  const path = (values: number[]) =>
    values.map((v, i) => {
      const [x, y] = at(i, v);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z";

  const weakest = points.reduce((a, b) => (b.percentile < a.percentile ? b : a));
  const strongest = points.reduce((a, b) => (b.percentile > a.percentile ? b : a));

  return (
    <ChartFrame
      title="Percentile by station"
      summary={
        `Your overall standard is the ${Math.round(standardPercentile)}th percentile. `
        + `Strongest: ${strongest.label} at the ${Math.round(strongest.percentile)}th. `
        + `Weakest: ${weakest.label} at the ${Math.round(weakest.percentile)}th.`
      }
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Grid rings at 20-point intervals, labelled once so the scale is legible. */}
      {[20, 40, 60, 80, 100].map((ring) => (
        <polygon
          key={ring}
          points={points.map((_, i) => at(i, ring).join(",")).join(" ")}
          fill="none"
          stroke={AXIS}
          strokeWidth="0.75"
        />
      ))}
      {points.map((_, i) => {
        const [x, y] = at(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={AXIS} strokeWidth="0.5" />;
      })}

      {/* The athlete's own standard, as a reference ring. */}
      <polygon
        points={points.map((_, i) => at(i, standardPercentile).join(",")).join(" ")}
        fill="none"
        stroke={DIM}
        strokeWidth="1.25"
        strokeDasharray="4 3"
      />

      <path d={path(points.map((p) => p.percentile))} fill={ACCENT} fillOpacity="0.16" stroke={ACCENT} strokeWidth="2" />

      {points.map((p, i) => {
        const [x, y] = at(i, p.percentile);
        const [lx, ly] = labelAt(i);
        const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
        return (
          <g key={p.label}>
            <circle cx={x} cy={y} r="3" fill={ACCENT} />
            <text
              x={lx} y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="9"
              fill={DIM}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      <text x={cx} y={cy - radius - 4} textAnchor="middle" fontSize="8" fill={AXIS}>100</text>
      <text x={cx} y={cy - radius * 0.5 - 3} textAnchor="middle" fontSize="8" fill={AXIS}>50</text>
    </ChartFrame>
  );
}

/* ── Run splits ─────────────────────────────────────────────────────── */

export function RunSplitBars({
  runs, countedIndexes, fastestIndex, slowestIndex,
}: {
  runs: number[];
  countedIndexes: number[];
  fastestIndex: number;
  slowestIndex: number;
}) {
  const width = 640;
  const height = 220;
  const padL = 34;
  const padB = 34;
  const padT = 22;
  const max = Math.max(...runs) * 1.08;
  const barW = (width - padL - 10) / runs.length;

  return (
    <ChartFrame
      title="Run splits"
      summary={
        `Eight runs from ${formatSplit(Math.min(...runs))} to ${formatSplit(Math.max(...runs))}. `
        + `Runs 1 and 8 are shown but excluded from the variation figure.`
      }
      viewBox={`0 0 ${width} ${height}`}
    >
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + (height - padT - padB) * (1 - f);
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={width - 6} y2={y} stroke={AXIS} strokeWidth="0.5" strokeDasharray="3 3" />
            <text x={padL - 5} y={y + 3} textAnchor="end" fontSize="8" fill={AXIS}>
              {formatSplit(Math.round(max * f))}
            </text>
          </g>
        );
      })}

      {runs.map((seconds, i) => {
        const counted = countedIndexes.includes(i);
        const h = ((height - padT - padB) * seconds) / max;
        const x = padL + i * barW + barW * 0.16;
        const y = height - padB - h;
        const w = barW * 0.68;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={w} height={h} rx="2"
              fill={counted ? ACCENT : DIM}
              fillOpacity={counted ? 1 : 0.32}
            />
            <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize="9" fill={INK}>
              {formatSplit(seconds)}
            </text>
            <text x={x + w / 2} y={height - padB + 13} textAnchor="middle" fontSize="9" fill={DIM}>
              {i + 1}
            </text>
            {i === fastestIndex || i === slowestIndex ? (
              <text
                x={x + w / 2} y={height - padB + 25}
                textAnchor="middle" fontSize="7.5" fill={i === fastestIndex ? ACCENT : WARN}
              >
                {i === fastestIndex ? "fastest" : "slowest"}
              </text>
            ) : null}
          </g>
        );
      })}

      <line x1={padL} y1={height - padB} x2={width - 6} y2={height - padB} stroke={AXIS} strokeWidth="1" />
    </ChartFrame>
  );
}

/* ── Five-band range with your marker ───────────────────────────────── */

/**
 * One station's five bands with the athlete's time marked on it.
 *
 * There is deliberately no numeric axis. The first version drew one on the top
 * row only, which read as a shared scale across all eight rows — and it is not:
 * every station is scaled to its own distribution, so 5:22 on the ski erg row
 * and 5:22 on the sled row sit at completely different positions. A scale that
 * looks shared and is not is worse than none.
 *
 * Everything the reader needs is still present: the marker carries the actual
 * time, and the row's own caption carries the band and the delta.
 */
export function BandBar({
  edges, actualSeconds,
}: {
  edges: number[];
  actualSeconds: number;
}) {
  const width = 420;
  const height = 22;
  // The bar spans a little past the outer edges so a marker at either extreme
  // is still inside the drawing rather than clipped against the border.
  const lo = edges[0] - (edges[4] - edges[0]) * 0.12;
  const hi = edges[4] + (edges[4] - edges[0]) * 0.12;
  const span = Math.max(1, hi - lo);
  const x = (s: number) => ((s - lo) / span) * width;

  const barY = 4;
  const barH = 14;
  const markerX = Math.max(2, Math.min(width - 2, x(actualSeconds)));

  return (
    <ChartFrame
      title="Performance band"
      summary={`Your ${formatSplit(actualSeconds)} against an expected ${formatSplit(edges[2])}.`}
      viewBox={`0 0 ${width} ${height}`}
      className="report-bandbar"
    >
      {BAND_ORDER.map((name, i) => {
        const from = i === 0 ? 0 : x(edges[i - 1]);
        const to = i === BAND_ORDER.length - 1 ? width : x(edges[i]);
        return (
          <rect
            key={name}
            x={from} y={barY} width={Math.max(0, to - from)} height={barH}
            fill={BAND_FILL[name]} rx="1.5"
          />
        );
      })}

      {/* The marker is a notch plus a label, not just a colour change — the
          bands behind it are already colour, and one more hue would not read. */}
      <line x1={markerX} y1={barY - 3} x2={markerX} y2={barY + barH + 3} stroke={INK} strokeWidth="2" />
      <rect
        x={Math.max(0, Math.min(width - 46, markerX - 23))} y={barY + 1}
        width="46" height="12" rx="2" fill={INK}
      />
      <text
        x={Math.max(23, Math.min(width - 23, markerX))} y={barY + 10}
        textAnchor="middle" fontSize="8.5" fontWeight="700"
        fill="var(--report-base, #0A0A0A)"
      >
        {formatSplit(actualSeconds)}
      </text>
    </ChartFrame>
  );
}

export function BandLegend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-suth-text-tertiary">
      {BAND_ORDER.map((name) => (
        <li key={name} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-[2px]"
            style={{ background: BAND_FILL[name] }}
          />
          {BAND_LABEL[name]}
        </li>
      ))}
    </ul>
  );
}

/* ── The story of the race ──────────────────────────────────────────── */

export function PaceStoryLine({
  checkpoints, finishSeconds,
}: {
  checkpoints: { label: string; projectedFinishSeconds: number }[];
  finishSeconds: number;
}) {
  if (checkpoints.length < 2) return null;

  const width = 660;
  const height = 250;
  const padL = 46;
  const padR = 12;
  const padT = 18;
  const padB = 62;

  const values = checkpoints.map((c) => c.projectedFinishSeconds);
  const lo = Math.min(...values, finishSeconds) * 0.995;
  const hi = Math.max(...values, finishSeconds) * 1.005;
  const span = Math.max(1, hi - lo);

  const x = (i: number) => padL + (i / (checkpoints.length - 1)) * (width - padL - padR);
  const y = (s: number) => padT + (1 - (s - lo) / span) * (height - padT - padB);

  const line = checkpoints
    .map((c, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(c.projectedFinishSeconds).toFixed(1)}`)
    .join(" ");

  const first = values[0];
  const last = values[values.length - 1];

  return (
    <ChartFrame
      title="Projected finish through the race"
      summary={
        `Started projecting ${formatTime(first)} and finished on ${formatTime(last)}. `
        + `${last < first ? "The line fell, so you gained on the field as the race went on."
          : "The line rose, so you gave time back as the race went on."}`
      }
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* A band behind the finish line: above it is slower than you finished. */}
      <rect
        x={padL} y={padT} width={width - padL - padR}
        height={Math.max(0, y(finishSeconds) - padT)}
        fill={WARN} fillOpacity="0.07"
      />
      <line
        x1={padL} y1={y(finishSeconds)} x2={width - padR} y2={y(finishSeconds)}
        stroke={ACCENT} strokeWidth="1" strokeDasharray="5 4"
      />
      <text x={width - padR} y={y(finishSeconds) - 5} textAnchor="end" fontSize="8.5" fill={ACCENT}>
        finished {formatTime(finishSeconds)}
      </text>

      {[0, 0.5, 1].map((f) => {
        const v = lo + span * f;
        return (
          <text key={f} x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="8" fill={AXIS}>
            {formatTime(Math.round(v))}
          </text>
        );
      })}

      <path d={line} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {checkpoints.map((c, i) => (
        <g key={c.label + i}>
          <circle cx={x(i)} cy={y(c.projectedFinishSeconds)} r="2.5" fill={INK} />
          {/* Every checkpoint is labelled, rotated so sixteen of them fit.
              Labelling every *other* one looked tidier and was wrong: the
              segments alternate run, station, run, station, so skipping the
              odd indices silently dropped every station from the axis and left
              a chart that appeared to plot eight runs. */}
          <text
            x={x(i)} y={height - padB + 10}
            fontSize="7.5" fill={i % 2 === 0 ? DIM : AXIS}
            transform={`rotate(-54 ${x(i)} ${height - padB + 10})`}
            textAnchor="end"
          >
            {c.label}
          </text>
        </g>
      ))}

      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={AXIS} strokeWidth="1" />
    </ChartFrame>
  );
}

/* ── Diverging bars: this race against your last ────────────────────── */

export function SplitDeltaBars({
  deltas,
}: {
  deltas: { label: string; deltaSeconds: number }[];
}) {
  if (deltas.length === 0) return null;

  const rowH = 20;
  const width = 640;
  const height = deltas.length * rowH + 30;
  const labelW = 128;
  const plotW = width - labelW - 56;
  const mid = labelW + plotW / 2;
  const max = Math.max(30, ...deltas.map((d) => Math.abs(d.deltaSeconds)));
  const scale = (plotW / 2) / max;

  const gained = deltas.filter((d) => d.deltaSeconds < 0).length;

  return (
    <ChartFrame
      title="Split differences against your last race"
      summary={`${gained} of ${deltas.length} splits were faster than last time.`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <line x1={mid} y1="4" x2={mid} y2={height - 26} stroke={AXIS} strokeWidth="1" />

      {deltas.map((d, i) => {
        const y = 6 + i * rowH;
        const w = Math.abs(d.deltaSeconds) * scale;
        const faster = d.deltaSeconds < 0;
        const x = faster ? mid - w : mid;
        return (
          <g key={d.label}>
            <text x={labelW - 8} y={y + 11} textAnchor="end" fontSize="9" fill={DIM}>
              {d.label}
            </text>
            <rect
              x={x} y={y + 2} width={Math.max(w, d.deltaSeconds === 0 ? 0 : 1.5)} height={rowH - 8}
              rx="1.5" fill={faster ? ACCENT : WARN}
            />
            <text
              x={faster ? x - 5 : x + w + 5} y={y + 11}
              textAnchor={faster ? "end" : "start"}
              fontSize="8.5" fill={faster ? ACCENT : WARN}
            >
              {d.deltaSeconds === 0 ? "—" : formatDelta(d.deltaSeconds)}
            </text>
          </g>
        );
      })}

      <text x={mid - 8} y={height - 10} textAnchor="end" fontSize="8" fill={ACCENT}>← faster</text>
      <text x={mid + 8} y={height - 10} textAnchor="start" fontSize="8" fill={WARN}>slower →</text>
    </ChartFrame>
  );
}

/* ── Benchmark: you, the winner, the fastest split ──────────────────── */

/**
 * The gap to the winner, drawn as a gap.
 *
 * The first version plotted your bar and the winner's bar at nearly the same
 * length and asked the reader to eyeball the difference between two 400px
 * bars — which is exactly the comparison a bar chart is worst at. It also
 * carried a legend entry for "fastest split in the division", a series we do
 * not have: the timing feed gives us the winner's splits, not per-segment
 * records across the field, so the dashed line was drawn on top of the solid
 * one and the legend was advertising data that did not exist.
 *
 * Now the winner's time is the baseline and the only thing rendered at length
 * is *your difference from it*. A reader can rank the segments by eye in a
 * second, which is the entire question this section answers.
 */
export function BenchmarkBars({
  rows,
}: {
  rows: { label: string; yourSeconds: number; winnerSeconds: number }[];
}) {
  const usable = rows.filter((r) => r.yourSeconds > 0 && r.winnerSeconds > 0);
  if (usable.length === 0) return null;

  const rowH = 21;
  const width = 640;
  const height = usable.length * rowH + 40;
  const labelW = 128;
  const plotW = width - labelW - 96;
  const maxGap = Math.max(15, ...usable.map((r) => Math.abs(r.yourSeconds - r.winnerSeconds)));
  const scale = plotW / maxGap;

  const behind = usable.filter((r) => r.yourSeconds > r.winnerSeconds).length;

  return (
    <ChartFrame
      title="Where the gap to the winner is"
      summary={
        `You were behind the winner on ${behind} of ${usable.length} segments. `
        + `The largest single gap was ${formatSplit(maxGap)}.`
      }
      viewBox={`0 0 ${width} ${height}`}
    >
      <text x={labelW} y="10" fontSize="8.5" fill={DIM}>
        Seconds behind the winner on each segment — longer is worse
      </text>

      <line x1={labelW} y1="16" x2={labelW} y2={height - 22} stroke={AXIS} strokeWidth="1" />

      {usable.map((r, i) => {
        const y = 20 + i * rowH;
        const gap = r.yourSeconds - r.winnerSeconds;
        const w = Math.abs(gap) * scale;
        const behindWinner = gap > 0;
        return (
          <g key={r.label}>
            <text x={labelW - 8} y={y + 11} textAnchor="end" fontSize="9" fill={DIM}>
              {r.label}
            </text>
            <rect
              x={behindWinner ? labelW : Math.max(0, labelW - w)}
              y={y + 3}
              width={Math.max(w, gap === 0 ? 0 : 1.5)}
              height={rowH - 9}
              rx="1.5"
              fill={behindWinner ? WARN : ACCENT}
              fillOpacity={behindWinner ? 0.85 : 1}
            />
            <text
              x={labelW + w + 6} y={y + 11}
              fontSize="8.5" fill={behindWinner ? WARN : ACCENT}
            >
              {gap === 0 ? "level" : formatDelta(gap)}
            </text>
            <text x={width - 4} y={y + 11} textAnchor="end" fontSize="8.5" fill={INK}>
              {formatSplit(r.yourSeconds)}
            </text>
          </g>
        );
      })}

      <text x={labelW} y={height - 8} fontSize="8" fill={DIM}>
        winner&rsquo;s time
      </text>
    </ChartFrame>
  );
}

/* ── Race history heatmap ───────────────────────────────────────────── */

export function HistoryHeatmap({
  races, columns,
}: {
  races: { label: string; finishSeconds: number; values: (number | null)[] }[];
  columns: string[];
}) {
  if (races.length === 0) return null;

  // Shade each column against its own range: a 4-minute ski erg and a
  // 90-second farmers carry share no scale, and one global ramp would paint
  // every ski erg cell dark and every carry cell light regardless of quality.
  const ranges = columns.map((_, c) => {
    const vals = races.map((r) => r.values[c]).filter((v): v is number => v != null && v > 0);
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  });

  return (
    <div className="report-heatmap overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-[11px]">
        <caption className="sr-only">
          Split times for each race, shaded darkest where the time was fastest for that column
        </caption>
        <thead>
          <tr>
            <th scope="col" className="px-2 py-1.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-suth-text-tertiary">
              Race
            </th>
            <th scope="col" className="px-2 py-1.5 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-suth-text-tertiary">
              Finish
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-1.5 py-1.5 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-suth-text-tertiary">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {races.map((race) => (
            <tr key={race.label}>
              <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-normal text-suth-text-secondary">
                {race.label}
              </th>
              <td className="results-num px-2 py-1 text-right text-suth-text">
                {formatTime(race.finishSeconds)}
              </td>
              {race.values.map((v, c) => {
                const range = ranges[c];
                let intensity = 0;
                if (v != null && v > 0 && range && range.max > range.min) {
                  // 1 = fastest in this column.
                  intensity = 1 - (v - range.min) / (range.max - range.min);
                }
                return (
                  <td
                    key={c}
                    className="results-num px-1.5 py-1 text-right text-suth-text"
                    style={{
                      background: v == null || v <= 0
                        ? "transparent"
                        : `color-mix(in srgb, var(--report-accent, #A3E635) ${Math.round(intensity * 42)}%, transparent)`,
                    }}
                  >
                    {v != null && v > 0 ? formatSplit(v) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
