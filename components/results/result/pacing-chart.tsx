import { formatSplit } from "@/lib/results/format";
import { MicroLabel, Delta } from "../ui/primitives";
import type { PacingReport } from "@/lib/results/analysis";

/**
 * Run pacing across the eight 1km runs, with the fitted drift line.
 *
 * The reference site plots every career split as a dot strip and lets you hover
 * — clever, but it never says what the shape means. This chart names it: even,
 * fading, or a negative split, plus a consistency score you can train against.
 *
 * Inline SVG, server-rendered.
 */
export function PacingChart({
  runs, averageRuns, pacing,
}: {
  runs: number[];
  averageRuns: number[];
  pacing: PacingReport;
}) {
  const valid = runs.filter((r) => r > 0);
  if (valid.length < 2) return null;

  const all = [...valid, ...averageRuns.filter((r) => r > 0)];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  // Pad so the fastest and slowest runs are not welded to the frame edge.
  const lo = min - span * 0.25;
  const hi = max + span * 0.25;

  const W = 100;
  const H = 40;
  const x = (i: number) => (i / (valid.length - 1)) * W;
  const y = (seconds: number) => H - ((seconds - lo) / (hi - lo)) * H;

  const line = valid.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(s).toFixed(2)}`).join(" ");
  const averageLine = averageRuns.length === valid.length
    ? averageRuns.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(s).toFixed(2)}`).join(" ")
    : null;

  const verdictLabel = {
    even: "Even pacing",
    fading: "Faded in the back half",
    "negative-split": "Negative split",
  }[pacing.verdict];

  return (
    <figure className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ RUN PACING ]</MicroLabel>
        <span className="text-[11px] text-suth-text-secondary">
          {verdictLabel} ·{" "}
          <span className="results-num text-suth-text">{pacing.consistency}</span>
          <span className="text-suth-text-tertiary">/100 consistency</span>
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-3 h-28 w-full"
        role="img"
        aria-label={
          `Run splits: ${valid.map((s, i) => `run ${i + 1} ${formatSplit(s)}`).join(", ")}. `
          + `${verdictLabel}, consistency ${pacing.consistency} out of 100.`
        }
      >
        {averageLine ? (
          <path
            d={averageLine}
            fill="none"
            strokeWidth={0.6}
            strokeDasharray="2 2"
            className="stroke-suth-text-tertiary/60"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path
          d={line}
          fill="none"
          strokeWidth={1.4}
          className="stroke-suth-accent"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {valid.map((seconds, i) => (
          <circle key={i} cx={x(i)} cy={y(seconds)} r={0.9} className="fill-suth-accent">
            <title>{`Run ${i + 1}: ${formatSplit(seconds)}`}</title>
          </circle>
        ))}
      </svg>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-suth-text-tertiary">
        {valid.map((_, i) => <span key={i}>{i + 1}</span>)}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-suth-border-subtle pt-3 text-[11px]">
        <div>
          <dt className="text-suth-text-tertiary">Fastest</dt>
          <dd className="results-num mt-0.5 text-suth-text">
            {formatSplit(pacing.fastestRun.seconds)}
            <span className="ml-1 text-suth-text-tertiary">run {pacing.fastestRun.index + 1}</span>
          </dd>
        </div>
        <div>
          <dt className="text-suth-text-tertiary">Slowest</dt>
          <dd className="results-num mt-0.5 text-suth-text">
            {formatSplit(pacing.slowestRun.seconds)}
            <span className="ml-1 text-suth-text-tertiary">run {pacing.slowestRun.index + 1}</span>
          </dd>
        </div>
        <div>
          <dt className="text-suth-text-tertiary">Half split</dt>
          <dd className="mt-0.5"><Delta seconds={pacing.splitDifferenceSeconds} /></dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-suth-text-tertiary">
        Dotted line is the division average for each run.
      </p>
    </figure>
  );
}
