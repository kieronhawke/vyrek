import { describe, it, expect } from "vitest";
import { buildWeekIcs, type CalendarSession } from "./ics";

const NOW = new Date("2026-08-03T09:00:00Z");

function session(over: Partial<CalendarSession> = {}): CalendarSession {
  return {
    date: "2026-08-05",
    title: "Strength A: hinge + pull",
    type: "strength",
    durationMin: 55,
    url: "https://www.suthperformance.com/app/plan/2026-08-05",
    ...over,
  };
}

describe("buildWeekIcs", () => {
  const ics = buildWeekIcs([session()], { now: NOW });

  it("is a well-formed calendar", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
  });

  it("uses CRLF throughout, including the final line", () => {
    // Apple is forgiving about this, Outlook is not — and the failure is a
    // file that imports zero events with no error.
    const bare = ics.split("\r\n").join("");
    expect(bare).not.toContain("\n");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("ends an all-day event on the following day", () => {
    // DTEND is exclusive. Without the +1 the entry either vanishes or renders
    // as zero-length, depending on the client.
    expect(ics).toContain("DTSTART;VALUE=DATE:20260805");
    expect(ics).toContain("DTEND;VALUE=DATE:20260806");
  });

  it("escapes the characters that would end a property early", () => {
    // "Strength A: hinge + pull, then core" silently truncates at the comma.
    const out = buildWeekIcs([session({ title: "Sled push, sled pull; then core" })], { now: NOW });
    expect(out).toContain("SUMMARY:Sled push\\, sled pull\\; then core");
  });

  it("escapes a backslash before anything else", () => {
    const out = buildWeekIcs([session({ title: "A\\B" })], { now: NOW });
    expect(out).toContain("SUMMARY:A\\\\B");
  });

  it("folds long lines at 75 octets with a leading space", () => {
    const long = "Threshold intervals with a long descriptive title that runs well past the folding limit";
    const out = buildWeekIcs([session({ title: long })], { now: NOW });
    const lines = out.split("\r\n");
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length, `too long: ${line}`).toBeLessThanOrEqual(75);
    }
    // The continuation must start with a space, or it reads as a new property.
    expect(out).toMatch(/\r\n /);
  });

  it("counts folding in octets, not characters", () => {
    // 70 accented characters is 140 octets — a character count would pass it
    // straight through and a strict parser would reject the file.
    const out = buildWeekIcs([session({ title: "é".repeat(70) })], { now: NOW });
    for (const line of out.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("omits rest days", () => {
    // A rest day is not an appointment, and one every week is what makes
    // somebody turn the whole feed off.
    const out = buildWeekIcs(
      [session({ type: "rest", title: "Rest" }), session()],
      { now: NOW },
    );
    expect(out.match(/BEGIN:VEVENT/g) ?? []).toHaveLength(1);
    expect(out).not.toContain("Rest");
  });

  it("gives each session a stable UID so re-importing updates rather than duplicates", () => {
    const a = buildWeekIcs([session()], { now: NOW });
    const b = buildWeekIcs([session()], { now: new Date("2026-09-01T00:00:00Z") });
    const uid = (s: string) => s.match(/UID:(.+)/)![1];
    expect(uid(a)).toBe(uid(b));
  });

  it("distinguishes two sessions on the same day", () => {
    const out = buildWeekIcs(
      [session({ title: "Run" }), session({ title: "Strength" })],
      { now: NOW },
    );
    const uids = [...out.matchAll(/UID:(.+)/g)].map((m) => m[1]);
    expect(new Set(uids).size).toBe(2);
  });

  it("carries the duration and a link back into the plan", () => {
    expect(ics).toContain("About 55 minutes");
    expect(ics).toContain("/app/plan/2026-08-05");
  });

  it("marks sessions as free rather than busy", () => {
    // An all-day busy block would make somebody look unavailable all day to
    // anyone sharing their calendar.
    expect(ics).toContain("TRANSP:TRANSPARENT");
  });

  it("produces a valid empty calendar rather than throwing", () => {
    const out = buildWeekIcs([], { now: NOW });
    expect(out).toContain("BEGIN:VCALENDAR");
    expect(out).not.toContain("BEGIN:VEVENT");
  });
});
