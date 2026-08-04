/**
 * WHAT HAPPENED TO AN ENTRY.
 *
 * The model carried `"finished" | "dnf"` and nothing else, which is not what
 * the sport has. Four outcomes are published, and collapsing them lost real
 * information about real people:
 *
 *   • **finished** — crossed the line, time stands.
 *   • **dnf** — started, did not finish. Usually injury or a cut-off.
 *   • **dsq** — finished, but the result was struck. Wall balls that did not
 *     count, a missed lunge, an equipment infringement.
 *   • **dns** — entered and never started.
 *
 * DSQ and DNF are not the same thing and an athlete would not thank you for
 * treating them as one. DNF is a hard day; DSQ is a judgement about your race.
 * Merging them is the sort of small inaccuracy that makes somebody distrust
 * every other number on the page.
 *
 * ── THE RULE EVERYTHING ELSE DEPENDS ON ────────────────────────────────
 *
 * `isFinish` is the single gate. Every ranking, record, average, percentile
 * and report must go through it, so that adding a fifth status later is one
 * edit here rather than a hunt through the codebase for `=== "finished"`.
 *
 * It is an allowlist on purpose. An unrecognised status has to fail *closed*:
 * being wrong that way costs one missing row, and being wrong the other way
 * puts a disqualified athlete in the record book. That exact bug was live —
 * `status === "dnf" ? "dnf" : "finished"` mapped `"dsq"`, `"dns"`, a
 * capitalised `"DNF"` and any CSV typo onto a valid finish.
 */

export type ResultStatus = "finished" | "dnf" | "dsq" | "dns";

export const RESULT_STATUSES: ResultStatus[] = ["finished", "dnf", "dsq", "dns"];

/** Short form, as it appears on a results board. */
export const STATUS_LABEL: Record<ResultStatus, string> = {
  finished: "Finished",
  dnf: "DNF",
  dsq: "DSQ",
  dns: "DNS",
};

/** Said in full, for a screen reader and for anyone who does not know the codes. */
export const STATUS_DESCRIPTION: Record<ResultStatus, string> = {
  finished: "Finished",
  dnf: "Did not finish",
  dsq: "Disqualified",
  dns: "Did not start",
};

/**
 * The only question most callers actually have.
 *
 * A result counts if — and only if — the athlete finished and there is a real
 * time attached. Both halves matter: a "finished" row with a zero time is a
 * data fault, not a result, and it would otherwise sort straight to the top of
 * every leaderboard it touched.
 */
export function isFinish(
  status: string | null | undefined,
  finishSeconds?: number,
): boolean {
  if (status !== "finished") return false;
  if (finishSeconds === undefined) return true;
  return Number.isFinite(finishSeconds) && finishSeconds > 0;
}

/**
 * Coerce whatever the source gave us into a status we recognise.
 *
 * Feeds are inconsistent about case and wording — `DNF`, `Dnf`, `did not
 * finish`, `Disqualified`, `DQ` all occur — and CSV imports carry whatever the
 * spreadsheet column happened to contain. Anything unrecognised becomes `dnf`
 * rather than `finished`, for the reason in the header.
 */
export function normaliseStatus(raw: string | null | undefined): ResultStatus {
  // Punctuation and separators vary between providers: "DID-NOT-START",
  // "did_not_start", "Did Not Start" are all the same outcome.
  const v = (raw ?? "").trim().toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ");

  if (
    v === "finished" || v === "finisher" || v === "finish"
    || v === "ok" || v === "confirmed" || v === "official" || v === "complete"
    || v === "completed" || v === "ranked"
  ) return "finished";

  /*
   * DSQ before DNS before DNF, because the checks are not mutually exclusive
   * once you accept free text: "disqualified, did not finish" appears in real
   * exports and the disqualification is the more specific fact.
   */
  if (/^(dsq|dq|disq|disqualified|disqualification)$/.test(v) || v.startsWith("disqualif")) {
    return "dsq";
  }
  if (
    /^(dns|did not start|no show|noshow|not started|withdrawn|withdrew)$/.test(v)
  ) return "dns";

  // `dnf` and everything else, including the empty string. See the header:
  // unrecognised has to fail closed, never towards a finish.
  return "dnf";
}

/**
 * Whether a status should be shown at all on a public leaderboard.
 *
 * DNS entries are excluded: somebody who never started has no result, and a
 * board padded with hundreds of no-shows is harder to read and tells the
 * reader nothing. They are still stored, because "did this person race" is a
 * question worth being able to answer.
 */
export function isListable(status: ResultStatus): boolean {
  return status !== "dns";
}
