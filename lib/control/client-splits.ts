/**
 * STATION SPLITS BEN KEEPS FOR A CLIENT.
 *
 * The athlete's Progress screen showed eight station times, a "faster than
 * last block" delta against each, and a percentile bar — all of it fixture
 * data, identical for everybody, with no way for Ben to change a single
 * number. Kieron asked for it to be editable in the admin, and it needs to be
 * for a plainer reason than convenience: a benchmark screen that cannot be
 * updated is a benchmark screen that is wrong from the second week onwards.
 *
 * WHAT BEN TYPES AND WHAT HE DOES NOT
 * -----------------------------------
 * He types times. Two of them per station: where they are now, and where they
 * were at the start of the block.
 *
 * He does **not** type the trend, which is the subtraction of one from the
 * other, and he does **not** type the percentile. A percentile is a claim
 * about thousands of other people's races, and a coach guessing at one and
 * typing it in is exactly the fabricated statistic HARD-RULES §1 forbids —
 * it would arrive on the athlete's screen looking like a measurement.
 * Percentiles come from the results engine, against a real distribution, or
 * they do not appear.
 *
 * WHY TIMES ARE HELD AS SECONDS
 * "4:12" is how it is typed and how it is read, and neither of those is how
 * it should be stored. Held as text, the only way to compare two of them is
 * to parse them at every call site, and the first place somebody forgets is
 * the one that decides whether an athlete is getting faster or slower.
 */

import { STATION_IDS, STATION_LABEL, type StationId } from "@/lib/results/model";

export type ClientSplit = {
  station: StationId;
  /** Seconds. Null means Ben has not recorded one. */
  seconds: number | null;
  /** Seconds at the start of the block, for the trend. Null means unknown. */
  previousSeconds: number | null;
};

export type ClientSplits = {
  /** Matches the tracker athlete's id. */
  id: string;
  /** ISO date Ben last touched these. Shown to the athlete so a stale set reads as stale. */
  updated: string;
  splits: ClientSplit[];
};

export const SPLITS_KEY = "clients.splits.v1";

export function emptySplits(id: string, today: string): ClientSplits {
  return {
    id,
    updated: today,
    splits: STATION_IDS.map((station) => ({
      station,
      seconds: null,
      previousSeconds: null,
    })),
  };
}

/**
 * Parse "4:12", "4:12.5", "72" or "1:02:03" into seconds.
 *
 * Returns null rather than throwing or guessing, because the caller is a text
 * input somebody is halfway through typing. NaN is not an acceptable answer:
 * it propagates silently through arithmetic and surfaces as a blank on
 * somebody's progress screen with nothing to explain it.
 */
export function parseTime(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(text)) return null;

  const parts = text.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;

  /* Minutes and seconds past 59 mean a typo, not a very long minute. "4:75"
     is somebody typing over the top of "4:15", and silently accepting it as
     five and a quarter minutes is worse than refusing it. */
  if (parts.length > 1 && parts.slice(1).some((n) => n >= 60)) return null;

  const seconds = parts.reduce((total, n) => total * 60 + n, 0);
  if (seconds <= 0) return null;
  /* Six hours. Loose on purpose: this parses station splits, where anything
     over ten minutes is already suspect, but it is a general time parser and
     a full race time has to go through it too. The cap is here to catch a
     digit typed twice, not to enforce a station's plausible range — doing
     that here would reject a legitimate finish time from a caller that
     happens to share the function. */
  if (seconds > 21600) return null;
  return seconds;
}

/** Seconds back to "4:12", or "1:02:03" once it passes an hour. */
export function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "";
  const whole = Math.round(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
}

export type Trend = {
  /** Negative is faster. Null when either end is missing. */
  deltaSeconds: number | null;
  /** "8s faster", "4s slower", or null. */
  text: string | null;
  direction: "faster" | "slower" | "level" | "unknown";
};

/**
 * The change, derived rather than typed.
 *
 * Derived because a hand-typed delta drifts from the two times it claims to
 * describe the moment either one is edited, and the athlete has no way to
 * tell which of the three numbers is the wrong one.
 */
export function trendOf(split: ClientSplit): Trend {
  const { seconds, previousSeconds } = split;
  if (seconds === null || previousSeconds === null) {
    return { deltaSeconds: null, text: null, direction: "unknown" };
  }
  const delta = seconds - previousSeconds;
  if (delta === 0) return { deltaSeconds: 0, text: "level", direction: "level" };
  const magnitude = Math.abs(Math.round(delta));
  return {
    deltaSeconds: delta,
    text: `${magnitude}s ${delta < 0 ? "faster" : "slower"}`,
    direction: delta < 0 ? "faster" : "slower",
  };
}

/** How many stations Ben has actually filled in. */
export function recordedCount(s: ClientSplits): number {
  return s.splits.filter((x) => x.seconds !== null).length;
}

/**
 * "6 of 8 stations are faster" — the line at the top of Progress.
 *
 * Counted only over stations with both ends recorded. Counting a station with
 * no previous time as "not faster" would quietly punish an athlete for a gap
 * in Ben's data entry.
 */
export function improvingCount(s: ClientSplits): { faster: number; of: number } {
  const comparable = s.splits.filter(
    (x) => x.seconds !== null && x.previousSeconds !== null,
  );
  return {
    faster: comparable.filter((x) => trendOf(x).direction === "faster").length,
    of: comparable.length,
  };
}

export function labelFor(station: StationId): string {
  return STATION_LABEL[station];
}

/** Seeded blank, deliberately. A benchmark nobody entered is not a benchmark. */
export function splitsFor(
  all: ClientSplits[],
  id: string,
  today: string,
): ClientSplits {
  return all.find((s) => s.id === id) ?? emptySplits(id, today);
}
