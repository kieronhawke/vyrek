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
export function formatRelativeDate(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  const days = Math.round((then - now.getTime()) / 86_400_000);
  const abs = Math.abs(days);
  if (abs === 0) return "today";
  const unit = abs < 7 ? ["day", abs]
    : abs < 31 ? ["week", Math.round(abs / 7)]
    : abs < 365 ? ["month", Math.round(abs / 30)]
    : ["year", Math.round(abs / 365)];
  const [name, value] = unit as [string, number];
  const plural = value === 1 ? name : `${name}s`;
  return days < 0 ? `${value} ${plural} ago` : `in ${value} ${plural}`;
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
