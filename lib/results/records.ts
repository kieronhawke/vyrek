/**
 * The record book.
 *
 * A record is the fastest time ever set inside some scope — the world, a
 * country, an age group — and the whole point of a record book is that it is
 * *complete* and that it *changes*. Both are things the previous implementation
 * did not manage: it read the winner of each event, kept the best per division,
 * and stamped every single entry `countryIso: "gb"`, so a Swedish world record
 * flew a British flag.
 *
 * Everything here is pure. It takes finished results and returns the book, so
 * it can be tested exhaustively without a data source and reused by the page,
 * the banner and the feed.
 */

import type { DivisionCode } from "./types";

/** One finisher, flattened to the fields a record needs. */
export type RecordCandidate = {
  resultId: string;
  divisionCode: DivisionCode;
  divisionLabel: string;
  athleteSlug: string;
  athleteName: string;
  countryIso: string;
  ageGroup: string;
  finishSeconds: number;
  eventSlug: string;
  eventName: string;
  eventCity: string;
  /** ISO date. May be empty — much of the ingested catalogue has no date yet. */
  date: string;
};

export type RecordScope = "world" | "national" | "age-group";

export type RecordRow = {
  scope: RecordScope;
  /** The key the record is held within: division, division+country, division+age. */
  key: string;
  divisionCode: DivisionCode;
  divisionLabel: string;
  /** Set for national records only. */
  countryIso?: string;
  /** Set for age-group records only. */
  ageGroup?: string;
  holder: RecordCandidate;
  /** The time this beat, when the scope has ever had a different holder. */
  previousSeconds?: number;
  previousHolderName?: string;
  /** How much the record was improved by, in seconds. */
  marginSeconds?: number;
  /** How many times this record has changed hands in the data we hold. */
  timesBroken: number;
};

/**
 * Records are only meaningful over *finished* races with a real time, and a
 * DNF or a zero is neither. Filtering here rather than at each call site means
 * a caller cannot forget.
 */
function usable(candidates: RecordCandidate[]): RecordCandidate[] {
  return candidates.filter((c) => c.finishSeconds > 0 && c.athleteSlug && c.divisionCode);
}

/**
 * Chronological order, so "what did this beat" means something.
 *
 * Undated results sort last rather than first: an undated row inserted at the
 * front would claim to be the original record and make every later, faster time
 * look like a break of it. Ordering them last means they can only ever *take*
 * a record, which is the conservative reading.
 */
function chronological(a: RecordCandidate, b: RecordCandidate): number {
  if (a.date && b.date) return a.date.localeCompare(b.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return 0;
}

/** Walk one scope's candidates in time order and keep the progression. */
function progressionFor(candidates: RecordCandidate[]): {
  holder: RecordCandidate;
  previous?: RecordCandidate;
  timesBroken: number;
} | null {
  const sorted = [...candidates].sort(chronological);
  let holder: RecordCandidate | null = null;
  let previous: RecordCandidate | undefined;
  let timesBroken = 0;

  for (const candidate of sorted) {
    if (!holder) { holder = candidate; continue; }
    if (candidate.finishSeconds < holder.finishSeconds) {
      previous = holder;
      holder = candidate;
      timesBroken += 1;
    }
  }

  return holder ? { holder, previous, timesBroken } : null;
}

function toRow(
  scope: RecordScope,
  key: string,
  progression: NonNullable<ReturnType<typeof progressionFor>>,
  extra: Partial<RecordRow> = {},
): RecordRow {
  const { holder, previous, timesBroken } = progression;
  return {
    scope,
    key,
    divisionCode: holder.divisionCode,
    divisionLabel: holder.divisionLabel,
    holder,
    timesBroken,
    ...(previous
      ? {
          previousSeconds: previous.finishSeconds,
          previousHolderName: previous.athleteName,
          marginSeconds: previous.finishSeconds - holder.finishSeconds,
        }
      : {}),
    ...extra,
  };
}

function group<T>(items: T[], keyOf: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** The fastest time in each division, anywhere. */
export function worldRecords(candidates: RecordCandidate[]): RecordRow[] {
  const rows: RecordRow[] = [];
  for (const [key, bucket] of group(usable(candidates), (c) => c.divisionCode)) {
    const progression = progressionFor(bucket);
    if (progression) rows.push(toRow("world", key, progression));
  }
  return rows.sort(byDivisionThenTime);
}

/** The fastest time in each division by athletes of one nationality. */
export function nationalRecords(
  candidates: RecordCandidate[],
  countryIso: string,
): RecordRow[] {
  const iso = countryIso.toLowerCase();
  const own = usable(candidates).filter((c) => c.countryIso?.toLowerCase() === iso);
  const rows: RecordRow[] = [];
  for (const [division, bucket] of group(own, (c) => c.divisionCode)) {
    const progression = progressionFor(bucket);
    if (progression) {
      rows.push(toRow("national", `${iso}:${division}`, progression, { countryIso: iso }));
    }
  }
  return rows.sort(byDivisionThenTime);
}

/** The fastest time in each division-and-age-group pairing, anywhere. */
export function ageGroupRecords(candidates: RecordCandidate[]): RecordRow[] {
  const rows: RecordRow[] = [];
  const keyed = group(usable(candidates), (c) => (c.ageGroup ? `${c.divisionCode}:${c.ageGroup}` : null));
  for (const [key, bucket] of keyed) {
    const progression = progressionFor(bucket);
    if (progression) {
      rows.push(toRow("age-group", key, progression, { ageGroup: progression.holder.ageGroup }));
    }
  }
  return rows.sort(
    (a, b) => a.divisionLabel.localeCompare(b.divisionLabel)
      || (a.ageGroup ?? "").localeCompare(b.ageGroup ?? ""),
  );
}

/**
 * HOW SIGNIFICANT EACH DIVISION'S RECORD IS.
 *
 * Records were ordered by `divisionLabel.localeCompare` — alphabetically. The
 * record book therefore opened on **Adaptive Men**, and the fastest HYROX ever
 * run by a human being appeared some way down the page between Doubles and
 * Team Relay. Alphabetical order is not neutral here; it actively misinforms,
 * because a reader reasonably assumes the first record on a record page is the
 * important one.
 *
 * This is the order the sport actually cares about:
 *
 *   1. **Elite** — the Elite 15 field. These are the outright world bests and
 *      the only two numbers most people came to see.
 *   2. **Pro** — open pro division, heavier sled, full field.
 *   3. **Open** — the division nearly everybody reading this races in.
 *   4. **Doubles**, then **Team Relay** — different formats, not lesser ones,
 *      but not what "the HYROX world record" means unqualified.
 *   5. **Adaptive** — last by convention, not by worth. It stays fully listed
 *      and identically styled; only its position changes.
 *
 * Anything unlisted sorts to the end rather than to the front, so a division
 * added upstream degrades into the tail instead of silently taking top billing.
 */
const DIVISION_SIGNIFICANCE: string[] = [
  "hyrox-elite-men",
  "hyrox-elite-women",
  "hyrox-pro-men",
  "hyrox-pro-women",
  "hyrox-men",
  "hyrox-women",
  "hyrox-pro-doubles-men",
  "hyrox-pro-doubles-women",
  "hyrox-doubles-men",
  "hyrox-doubles-women",
  "hyrox-doubles-mixed",
  "hyrox-team-relay-men",
  "hyrox-team-relay-women",
  "hyrox-team-relay-mixed",
  "hyrox-adaptive-men",
  "hyrox-adaptive-women",
];

export function divisionRank(code: string): number {
  const i = DIVISION_SIGNIFICANCE.indexOf(code);
  return i === -1 ? DIVISION_SIGNIFICANCE.length : i;
}

/**
 * The two records that deserve to be presented as events rather than rows.
 *
 * Kept to two on purpose. "Everything is a headline" is the state the page was
 * already in — sixteen identical cards — and promoting six would recreate it
 * with bigger type.
 */
export function isBlueRiband(code: string): boolean {
  return code === "hyrox-elite-men" || code === "hyrox-elite-women";
}

function byDivisionThenTime(a: RecordRow, b: RecordRow): number {
  return divisionRank(a.divisionCode) - divisionRank(b.divisionCode)
    // Same division: the faster time is the record. Falling back to the label
    // keeps the order stable for any division not in the list above.
    || a.holder.finishSeconds - b.holder.finishSeconds
    || a.divisionLabel.localeCompare(b.divisionLabel);
}

/** Every country that holds at least one record, most records first. */
export function countriesWithRecords(candidates: RecordCandidate[]): string[] {
  const counts = new Map<string, number>();
  for (const c of usable(candidates)) {
    const iso = c.countryIso?.toLowerCase();
    if (!iso) continue;
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([iso]) => iso);
}

/* ── Freshness ──────────────────────────────────────────────────────── */

/**
 * A record is "new" for a fortnight after it is set.
 *
 * Two weeks is long enough that someone who raced on a Saturday still sees it
 * celebrated when they check back the following weekend, and short enough that
 * the banner does not become permanent furniture nobody reads. A record with no
 * date is never new — we cannot know, and quietly guessing would put a
 * three-year-old time under a "just set" banner.
 */
export const NEW_RECORD_DAYS = 14;

export function daysSince(isoDate: string, now: Date): number | null {
  if (!isoDate) return null;
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  const ms = now.getTime() - then;
  if (ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

export function isFresh(row: RecordRow, now: Date, windowDays = NEW_RECORD_DAYS): boolean {
  const days = daysSince(row.holder.date, now);
  return days != null && days <= windowDays;
}

/** Freshly set records, newest first — what the banner announces. */
export function freshRecords(
  rows: RecordRow[],
  now: Date,
  windowDays = NEW_RECORD_DAYS,
): RecordRow[] {
  return rows
    .filter((row) => isFresh(row, now, windowDays))
    .sort((a, b) => (b.holder.date || "").localeCompare(a.holder.date || ""));
}

/**
 * The sentence the banner shows.
 *
 * Scope-accurate on purpose: calling a national record a world record is the
 * one mistake this feature cannot make, and it is the easy one to make when a
 * single template is reused for all three.
 */
export function announce(row: RecordRow, countryName?: string): string {
  const who = row.holder.athleteName;
  const division = row.divisionLabel.replace("HYROX ", "");
  const where = row.holder.eventName;

  const scopeText = row.scope === "world"
    ? "world record"
    : row.scope === "national"
      ? `${countryName ?? row.countryIso?.toUpperCase() ?? "national"} record`
      : `${row.ageGroup} record`;

  const margin = row.marginSeconds && row.marginSeconds > 0
    ? ` — ${formatSecondsShort(row.marginSeconds)} off the previous mark`
    : "";

  return `New ${division} ${scopeText}: ${who} at ${where}${margin}.`;
}

function formatSecondsShort(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}
