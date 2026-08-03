/**
 * THE WEEK, AS CALENDAR EVENTS.
 *
 * "Add this week to your calendar" was a row with no link behind it. This is
 * the thing it was pointing at.
 *
 * iCalendar is an unforgiving format and almost every mistake in it fails
 * silently — the file downloads, the calendar opens, and nothing appears. The
 * three that actually bite:
 *
 *   • **CRLF line endings.** RFC 5545 requires them. Apple Calendar is
 *     forgiving, Outlook is not, and Google is somewhere in between.
 *   • **Line folding at 75 octets.** A long description on one line is
 *     rejected outright by strict parsers.
 *   • **Escaping.** A comma or semicolon inside a summary ends the property
 *     early, so "Strength A: hinge + pull, then core" silently truncates.
 *
 * All three are handled here, and the tests cover each one, because a calendar
 * file that produces no events and no error is the worst kind of broken.
 */

export type CalendarSession = {
  /** ISO date, e.g. 2026-08-05. */
  date: string;
  title: string;
  /** Session type, used for the description line. */
  type: string;
  durationMin?: number;
  /** Deep link back into the plan for that day. */
  url?: string;
};

/** Escape the characters that would otherwise end a property early. */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold to 75 octets per RFC 5545, continuing with a leading space.
 *
 * Counted in **bytes**, not characters: a line of 75 accented characters is
 * 150 octets and a strict parser rejects it. Splitting on a code point rather
 * than a byte also avoids cutting a multi-byte character in half, which
 * produces mojibake in the calendar entry.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    // 74 on continuation lines, because the leading space counts.
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = char;
      bytes = size;
    } else {
      current += char;
      bytes += size;
    }
  }
  if (current) out.push(current);

  return out[0] + out.slice(1).map((part) => `\r\n ${part}`).join("");
}

/** `20260805` — a date-only value, so the event is all-day. */
function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function stamp(now: Date): string {
  return `${now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * Build the file.
 *
 * All-day events rather than timed ones. We know which day Ben programmed a
 * session for and we do not know when somebody trains — inventing 07:00 would
 * put a wrong time in their calendar every single day, which is worse than no
 * time at all. An all-day entry sits at the top of the day and moves with them.
 */
export function buildWeekIcs(
  sessions: CalendarSession[],
  options: { name?: string; now?: Date; domain?: string } = {},
): string {
  const now = options.now ?? new Date();
  const domain = options.domain ?? "suthperformance.com";
  const dtstamp = stamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Suth Performance//Training Plan//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(options.name ?? "Suth Performance training")}`,
  ];

  for (const session of sessions) {
    // A rest day is not an appointment. Putting one in somebody's calendar
    // every week is noise they will turn the whole feed off over.
    if (session.type === "rest") continue;

    const description = [
      session.durationMin ? `About ${session.durationMin} minutes.` : null,
      session.url ? `Open the session: ${session.url}` : null,
    ].filter(Boolean).join(" ");

    lines.push(
      "BEGIN:VEVENT",
      // Stable per session and date, so re-importing updates the existing
      // entry rather than creating a duplicate every week.
      //
      // Folded like every other property. A UID derived from a long title runs
      // well past 75 octets — this one was 122 — and an over-long line is
      // rejected by strict parsers exactly as silently as a bad SUMMARY.
      fold(`UID:${session.date}-${slugify(session.title)}@${domain}`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${icsDate(session.date)}`,
      // DTEND is exclusive for all-day events: without the +1 the entry either
      // vanishes or renders as zero-length depending on the client.
      `DTEND;VALUE=DATE:${icsDate(addDays(session.date, 1))}`,
      fold(`SUMMARY:${esc(session.title)}`),
      ...(description ? [fold(`DESCRIPTION:${esc(description)}`)] : []),
      ...(session.url ? [fold(`URL:${esc(session.url)}`)] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // CRLF throughout, and a trailing one — Outlook rejects a file without it.
  return lines.join("\r\n") + "\r\n";
}

/**
 * The title, reduced to something safe for a UID.
 *
 * Capped at 40 characters: the UID only has to be unique within this feed and
 * stable across re-imports, and a hundred-character identifier is a folding
 * problem for no benefit. Two sessions on one day are still distinguished,
 * because that is what the cap is tested against.
 */
function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (slug.slice(0, 40).replace(/-+$/, "")) || "session";
}
