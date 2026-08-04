/**
 * Time and number formatting for the Results section.
 *
 * One module so every surface renders a time identically. `formatSeconds` in
 * ./types.ts predates this and is still used by Sprint 1 pages; this is the
 * fuller set the new section needs.
 */

/** 1:32:05 or 92:05 depending on `style`. Always zero-padded, always tabular. */
export function formatTime(seconds: number, style: "clock" | "minutes" = "clock"): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.round(seconds);
  if (style === "minutes") {
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** Split times are always mm:ss — a station never runs to an hour. */
export function formatSplit(seconds: number): string {
  return formatTime(seconds, "minutes");
}

/**
 * A signed delta. The sign is not decoration: it is how this reads without
 * colour, which the brief requires for accessibility.
 */
export function formatDelta(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const rounded = Math.round(seconds);
  if (rounded === 0) return "±0:00";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${formatTime(Math.abs(rounded), "minutes")}`;
}

/** Pace per kilometre from a 1km run split. */
export function formatPace(seconds: number): string {
  return `${formatTime(seconds, "minutes")}/km`;
}

export function formatPercent(value: number, dp = 0): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(dp)}%`;
}

export function formatOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-GB");
}

/** "3 days ago" / "in 6 weeks" — relative to a caller-supplied now, so it is testable. */
export function formatRelativeDate(iso: string, now: Date, fallback = ""): string {
  // ⚠️ Most events have no date, and `new Date("")` is Invalid Date.
  //
  // Every arithmetic step then yields NaN and the template renders it happily:
  // every card on the results landing page read "in NaN years". The published
  // HYROX calendar lists upcoming races only, so the whole archive reaches here
  // with an empty string — this is the common path, not the edge case.
  const then = new Date(iso).getTime();
  if (!iso || Number.isNaN(then)) return fallback;

  const ms = then - now.getTime();
  const ahead = ms >= 0;
  const abs = Math.abs(ms);

  // ⚠️ Hours and minutes, not just days.
  //
  // "today" is the least useful thing to tell somebody whose race is tomorrow
  // morning. The unit shrinks as the race approaches — "in 3 days", "in 20
  // hours", "in 40 minutes" — because that is the difference between a date in
  // a list and a countdown, and a countdown is what the day before a race
  // actually feels like.
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return ahead ? "any moment" : "just now";
  if (minutes < 60) return phrase(minutes, "minute", ahead);

  const hours = Math.round(abs / 3_600_000);
  if (hours < 24) return phrase(hours, "hour", ahead);

  const days = Math.round(abs / 86_400_000);
  if (days < 7) return phrase(days, "day", ahead);
  if (days < 31) return phrase(Math.round(days / 7), "week", ahead);
  if (days < 365) return phrase(Math.round(days / 30), "month", ahead);
  return phrase(Math.round(days / 365), "year", ahead);
}

function phrase(value: number, unit: string, ahead: boolean): string {
  const noun = value === 1 ? unit : `${unit}s`;
  return ahead ? `in ${value} ${noun}` : `${value} ${noun} ago`;
}

const FLAG_OFFSET = 0x1f1e6 - "a".charCodeAt(0);

/** ISO-3166 alpha-2 to flag emoji. Falls back to the code in caps. */
export function flagEmoji(iso: string): string {
  if (!iso || iso.length !== 2) return iso.toUpperCase();
  const lower = iso.toLowerCase();
  return String.fromCodePoint(
    lower.charCodeAt(0) + FLAG_OFFSET,
    lower.charCodeAt(1) + FLAG_OFFSET,
  );
}

/** Three-letter nation code for table columns, where a flag is too small to read. */
export const NATION_CODE: Record<string, string> = {
  gb: "GBR", ie: "IRL", de: "GER", in: "IND", hk: "HKG",
  sg: "SGP", us: "USA", se: "SWE", nl: "NED", es: "ESP",
};

export function nationCode(iso: string): string {
  return NATION_CODE[iso] ?? iso.toUpperCase();
}

/**
 * Full country names, for prose where a three-letter code reads as jargon.
 *
 * "GBR record" is fine in a table header and wrong in a sentence — "New Men's
 * British record" is what a person would say. Deliberately covers the nations
 * on the HYROX calendar rather than every ISO code: an unmapped country falls
 * back to its code, which is honest, whereas a generated name would not be.
 *
 * These are the *adjectival* forms where one exists, because that is how a
 * record is described.
 */
export const NATION_NAME: Record<string, string> = {
  gb: "British", ie: "Irish", de: "German", in: "Indian", hk: "Hong Kong",
  sg: "Singaporean", us: "American", se: "Swedish", nl: "Dutch", es: "Spanish",
  fr: "French", it: "Italian", pl: "Polish", at: "Austrian", ch: "Swiss",
  be: "Belgian", dk: "Danish", no: "Norwegian", fi: "Finnish", pt: "Portuguese",
  au: "Australian", nz: "New Zealand", ca: "Canadian", za: "South African",
  ae: "Emirati", jp: "Japanese", kr: "South Korean", cn: "Chinese",
  br: "Brazilian", mx: "Mexican", cz: "Czech", hu: "Hungarian", gr: "Greek",
  tr: "Turkish", th: "Thai", my: "Malaysian", ph: "Filipino", id: "Indonesian",
};

export function countryName(iso: string): string | null {
  if (!iso) return null;
  return NATION_NAME[iso.toLowerCase()] ?? null;
}
