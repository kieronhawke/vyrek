import { formatTime } from "@/lib/results/format";
import { STATUS_DESCRIPTION, type ResultStatus } from "@/lib/results/status";

/**
 * SAYING WHAT ACTUALLY HAPPENED TO THIS ENTRY.
 *
 * The race report checked whether the *event* was finished and never whether
 * the *athlete* was. So a disqualified entry got the full treatment — twelve
 * sections, percentiles, band charts, a division rank — presenting a struck
 * result as a valid one. Nothing on the page said otherwise.
 *
 * The report is not withheld, and that is deliberate. A DNF athlete's splits up
 * to the point they stopped are real and are often the most useful thing they
 * have; refusing to show them would delete somebody's race because it ended
 * badly. What has to change is the framing, and specifically the comparative
 * claims: a rank and a percentile both assume a valid finish, and neither means
 * anything for an entry that was struck or never completed.
 *
 * ── PENALTIES ──────────────────────────────────────────────────────────
 *
 * Separately: HYROX penalties are applied as added time, and organisers publish
 * the penalised finish. So an athlete reading their own report can find that
 * their splits do not add up to their finish time, with nothing explaining the
 * difference. Where a penalty is published, it is stated here.
 *
 * Nothing is *inferred* from a gap between the splits and the finish. Split
 * timing carries its own rounding, and telling somebody they were penalised
 * when they were not is a considerably worse error than staying quiet.
 */

export function ResultStatusNotice({
  status,
  penaltySeconds,
}: {
  status: ResultStatus;
  penaltySeconds?: number;
}) {
  const hasPenalty = typeof penaltySeconds === "number" && penaltySeconds > 0;

  // A clean finish needs no notice — a banner on every page is wallpaper by
  // the second one, and stops being read exactly when it matters.
  if (status === "finished" && !hasPenalty) return null;

  if (status !== "finished") {
    return (
      <aside
        role="note"
        className="mt-4 rounded-sm border border-suth-warning/40 bg-suth-warning/5 px-4 py-3"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-warning">
          [ {STATUS_DESCRIPTION[status]} ]
        </p>
        <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
          {COPY[status]}
        </p>
        {hasPenalty ? <PenaltyLine seconds={penaltySeconds!} /> : null}
      </aside>
    );
  }

  return (
    <aside
      role="note"
      className="mt-4 rounded-sm border border-suth-border bg-suth-elevated px-4 py-3"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        [ TIME PENALTY APPLIED ]
      </p>
      <PenaltyLine seconds={penaltySeconds!} />
    </aside>
  );
}

function PenaltyLine({ seconds }: { seconds: number }) {
  return (
    <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
      Officials added <strong className="text-suth-text">{formatTime(seconds)}</strong>{" "}
      to this race. The finish time already includes it, which is why the splits
      below add up to less than the total.
    </p>
  );
}

const COPY: Record<Exclude<ResultStatus, "finished">, string> = {
  dnf:
    "This entry did not finish, so there is no finishing position and no "
    + "percentile — both assume a completed race. The splits below are real and "
    + "are shown as recorded, up to the point the race ended.",
  dsq:
    "This result was disqualified, so the time does not stand and the position "
    + "and percentile do not apply. The splits below are shown as they were "
    + "recorded on the day.",
  dns:
    "This athlete entered but did not start, so there is nothing recorded for "
    + "this race.",
};
