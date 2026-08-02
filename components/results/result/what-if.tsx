import { formatSplit, formatOrdinal, formatCount } from "@/lib/results/format";
import { MicroLabel } from "../ui/primitives";
import type { WhatIfResult } from "@/lib/results/analysis";

/**
 * What-if projection.
 *
 * "Your Sled Push is weak" is a note. "Bringing it to division average moves
 * you from 412th to 341st" is a reason to do something about it. This is the
 * single clearest example of the gap we are filling: the reference site holds
 * all the data needed to compute this and never does.
 *
 * The arithmetic is deliberately conservative — it only counts time saved on
 * the one station, holds every other segment fixed, and never claims a gain
 * where the athlete is already at or above the target.
 */
export function WhatIfCard({
  whatIf, currentRank, fieldSize, division,
}: {
  whatIf: WhatIfResult;
  currentRank: number;
  fieldSize: number;
  division: string;
}) {
  const noGain = whatIf.secondsSaved <= 0;

  return (
    <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <MicroLabel>[ WHAT IF ]</MicroLabel>

      {noGain ? (
        <p className="mt-2 text-sm text-suth-text-secondary">
          Your {whatIf.label} is already at or better than the {division} median at this event.
          There is no easy time left here — the gains are elsewhere.
        </p>
      ) : (
        <>
          <h2 className="mt-2 text-base font-semibold text-suth-text md:text-lg">
            Bring your {whatIf.label} to the {division} median and you finish{" "}
            <span className="text-suth-accent">{formatOrdinal(whatIf.projectedRank)}</span>
            {whatIf.ranksGained > 0 ? (
              <> instead of {formatOrdinal(currentRank)}</>
            ) : null}
            .
          </h2>

          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Your split" value={formatSplit(whatIf.currentSeconds)} />
            <Figure label="Median" value={formatSplit(whatIf.targetSeconds)} />
            <Figure label="Time saved" value={formatSplit(whatIf.secondsSaved)} accent />
            <Figure
              label="Places gained"
              value={whatIf.ranksGained > 0 ? `+${formatCount(whatIf.ranksGained)}` : "—"}
              accent={whatIf.ranksGained > 0}
            />
          </dl>

          <p className="mt-3 text-[11px] text-suth-text-tertiary">
            Projected against the {formatCount(fieldSize)} finishers in this division, holding
            every other split fixed.
          </p>
        </>
      )}
    </section>
  );
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
        {label}
      </dt>
      <dd className={`results-num mt-1 text-lg ${accent ? "text-suth-accent" : "text-suth-text"}`}>
        {value}
      </dd>
    </div>
  );
}
