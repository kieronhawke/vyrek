/**
 * WHEN BEN IS FREE, AND WHICH SLOTS A CLIENT IS OFFERED.
 *
 * All of the arithmetic, none of the storage — so every rule below is
 * testable without a database, a clock, or a network.
 *
 * THE SHAPE IS THE ONE FROM THE REFERENCE SCREENSHOTS: a set of weekly
 * hours ("Mondays 9:00am – 5:00pm", with a toggle per day) plus date
 * overrides for the exceptions. It is the right model because it matches
 * how somebody actually thinks about their week — you set it once and then
 * only touch the days that differ.
 *
 * TIMES ARE WALL CLOCK, STORED AS MINUTES FROM MIDNIGHT, and that is a
 * deliberate choice rather than laziness. "Ben works 9 to 5" means nine
 * o'clock as read on a clock in London, in March and in July. Store it as
 * an instant and the whole diary shifts by an hour twice a year. The
 * conversion to a real instant happens at the last possible moment, per
 * date, in `wallClockToInstant`.
 */

export const TZ = "Europe/London";

/** 0 = Sunday, matching Date#getDay, so no mapping table is needed. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/** Minutes from midnight, local wall clock. 9am is 540. */
export type Window = { start: number; end: number };

export type WeeklyHours = Record<Weekday, Window[]>;

/**
 * An exception to the weekly pattern, keyed by ISO date (YYYY-MM-DD).
 * An empty `windows` array means "nothing available that day", which is
 * how a holiday is expressed — distinct from having no override at all.
 */
export type DateOverride = { date: string; windows: Window[] };

export type Availability = {
  weekly: WeeklyHours;
  overrides: DateOverride[];
  /** How long one consultation runs. */
  slotMinutes: number;
  /** Dead time after a call before the next can start. */
  bufferMinutes: number;
  /** How soon somebody may book. Stops a 7am call booked at 6:55am. */
  minNoticeHours: number;
  /** How far ahead the calendar opens. */
  horizonDays: number;
};

/**
 * The starting diary, until Ben sets his own in the admin calendar.
 *
 * Weekday evenings and weekend mornings, because the people booking a free
 * consultation are mostly working and the call is thirty minutes. These
 * are placeholders by agreement with Kieron — the point is that the
 * calendar has something in it on day one rather than showing every
 * visitor an empty month.
 */
export const DEFAULT_AVAILABILITY: Availability = {
  weekly: {
    0: [],
    1: [{ start: 17 * 60, end: 20 * 60 }],
    2: [{ start: 17 * 60, end: 20 * 60 }],
    3: [{ start: 12 * 60, end: 14 * 60 }, { start: 17 * 60, end: 20 * 60 }],
    4: [{ start: 17 * 60, end: 20 * 60 }],
    5: [{ start: 12 * 60, end: 15 * 60 }],
    6: [{ start: 9 * 60, end: 12 * 60 }],
  },
  overrides: [],
  slotMinutes: 30,
  bufferMinutes: 10,
  minNoticeHours: 12,
  horizonDays: 28,
};

/* ── Time zone ─────────────────────────────────────────────────────────── */

/**
 * Minutes that `tz` is ahead of UTC at a given instant. +60 during BST.
 *
 * Done with Intl rather than a library because the alternative is shipping
 * a tz database to do one subtraction.
 */
export function zoneOffsetMinutes(at: Date, tz = TZ): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // hour comes back as 24 for midnight under hour12:false in some engines.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return Math.round((asIfUtc - at.getTime()) / 60000);
}

/**
 * A wall-clock time on a given local date, as a real instant.
 *
 * Two passes, because the offset depends on the answer: guess using the
 * offset at the naive instant, then correct using the offset at the guess.
 * That is what makes the hour either side of a clock change come out right.
 */
export function wallClockToInstant(
  dateISO: string,
  minutes: number,
  tz = TZ,
): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const first = naive - zoneOffsetMinutes(new Date(naive), tz) * 60000;
  const second = naive - zoneOffsetMinutes(new Date(first), tz) * 60000;
  return new Date(second);
}

/** The local calendar date of an instant, as YYYY-MM-DD. */
export function localDateISO(at: Date, tz = TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** The local weekday of a calendar date. */
export function weekdayOf(dateISO: string, tz = TZ): Weekday {
  const noon = wallClockToInstant(dateISO, 12 * 60, tz);
  const name = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
  }).format(noon);
  const map: Record<string, Weekday> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[name] ?? 0;
}

/** "17:30" for 1050. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/* ── Slots ─────────────────────────────────────────────────────────────── */

/** The windows that apply on a date: an override if there is one, else the week. */
export function windowsFor(dateISO: string, a: Availability): Window[] {
  const override = a.overrides.find((o) => o.date === dateISO);
  // Presence is the test, not length — an override with no windows is a
  // day off, and must beat the weekly pattern rather than fall through it.
  if (override) return override.windows;
  return a.weekly[weekdayOf(dateISO)] ?? [];
}

export type Slot = {
  /** The instant the call starts. */
  start: Date;
  /** Local wall-clock label, "17:30". */
  label: string;
  minutes: number;
};

/**
 * Every bookable start time on one local date.
 *
 * Excluded: anything inside the notice period, anything past the horizon,
 * and anything that would collide with a booking already taken — including
 * the buffer either side, which is why a 30-minute call at 17:00 with a
 * 10-minute buffer removes 17:30 as well when the grid is 30 minutes.
 */
export function slotsForDate(
  dateISO: string,
  a: Availability,
  taken: Date[],
  now: Date = new Date(),
): Slot[] {
  const earliest = now.getTime() + a.minNoticeHours * 3600_000;
  const latest = now.getTime() + a.horizonDays * 86400_000;
  const takenMs = taken.map((t) => t.getTime());
  const slotMs = a.slotMinutes * 60000;
  const bufferMs = a.bufferMinutes * 60000;

  const out: Slot[] = [];
  for (const w of windowsFor(dateISO, a)) {
    for (let m = w.start; m + a.slotMinutes <= w.end; m += a.slotMinutes) {
      const start = wallClockToInstant(dateISO, m);
      const ms = start.getTime();
      if (ms < earliest || ms > latest) continue;

      const clashes = takenMs.some(
        (t) => Math.abs(t - ms) < slotMs + bufferMs,
      );
      if (clashes) continue;

      out.push({ start, label: formatMinutes(m), minutes: m });
    }
  }
  return out;
}

/** The next `days` local dates from today, as YYYY-MM-DD. */
export function dateRange(from: Date, days: number, tz = TZ): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    out.push(localDateISO(new Date(from.getTime() + i * 86400_000), tz));
  }
  return out;
}

/**
 * Which dates in a range have at least one slot.
 *
 * The month grid needs this to know which numbers to light up, and it must
 * come from the same function that produces the times — a calendar that
 * offers a day and then shows no times is the commonest booking-UI bug.
 */
export function bookableDates(
  dates: string[],
  a: Availability,
  taken: Date[],
  now: Date = new Date(),
): Set<string> {
  const out = new Set<string>();
  for (const d of dates) {
    if (slotsForDate(d, a, taken, now).length > 0) out.add(d);
  }
  return out;
}
