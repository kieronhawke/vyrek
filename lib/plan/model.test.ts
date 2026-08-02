import { describe, expect, it } from "vitest";
import {
  SEED_WEEK,
  isRestDay,
  parseSession,
  sessionCount,
} from "./model";

/**
 * The parser's contract is that it never loses Ben's text.
 *
 * He writes inconsistently — "2km easy jog", "3x30 sec strides",
 * "6x1km @ 7-8/10 effort off 90 seconds static recovery" — and the app must
 * render what he typed even when it cannot pick the line apart. A parser that
 * silently drops a line would change what an athlete was told to do.
 */
describe("session parsing", () => {
  it("never drops or alters a line", () => {
    for (const day of SEED_WEEK.days) {
      for (const text of [day.am, day.pm]) {
        if (!text.trim()) continue;
        const written = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const parsed = parseSession(text);
        expect(parsed).toHaveLength(written.length);
        expect(parsed.map((p) => p.raw)).toEqual(written);
      }
    }
  });

  it("picks the quantity off the front of a line", () => {
    expect(parseSession("2km easy jog")[0]).toMatchObject({
      quantity: "2km",
      rest: "easy jog",
    });
    expect(parseSession("100 wall balls @ 6kg")[0]).toMatchObject({
      quantity: "100",
      rest: "wall balls @ 6kg",
    });
    expect(parseSession("20 mins ski")[0].quantity).toBe("20 mins");
  });

  it("handles his rep-by-distance shorthand", () => {
    expect(parseSession("8x1km off 90")[0].quantity).toBe("8x1km");
    expect(parseSession("3x30 sec strides")[0].quantity).toBe("3x30 sec");
  });

  it("reads effort where he writes it, in either form", () => {
    expect(parseSession("6x1km @ 7-8/10 effort off 90 seconds")[0].effort).toBe(
      "7-8/10",
    );
    expect(parseSession("4x800m ski @ 8/10 off 90 secs")[0].effort).toBe("8/10");
  });

  it("marks his connectors so they can be set apart", () => {
    expect(parseSession("into")[0].connector).toBe(true);
    expect(parseSession("x3")[0].connector).toBe(true);
    expect(parseSession("2km easy")[0].connector).toBeUndefined();
  });

  it("leaves a line it cannot parse exactly as written", () => {
    const line = "See where you are here but lets try and average sub 4:00";
    const [p] = parseSession(line);
    expect(p.raw).toBe(line);
    expect(p.rest).toBe(line);
    expect(p.quantity).toBeUndefined();
  });

  it("ignores blank lines rather than rendering empty rows", () => {
    expect(parseSession("2km easy\n\n\n1km easy")).toHaveLength(2);
  });
});

describe("the seeded week", () => {
  it("is Ben's real week: seven days, Monday first", () => {
    expect(SEED_WEEK.days).toHaveLength(7);
    expect(SEED_WEEK.days[0].dayName).toBe("Monday");
    expect(SEED_WEEK.days[6].dayName).toBe("Sunday");
    expect(SEED_WEEK.weekOf).toBe("2026-08-03");
  });

  it("counts AM and PM separately, as he programmes them", () => {
    // Six AM sessions (Friday is rest) plus one PM on Saturday.
    expect(sessionCount(SEED_WEEK)).toBe(7);
  });

  it("treats a day written only as Rest as a rest day", () => {
    const friday = SEED_WEEK.days.find((d) => d.dayName === "Friday")!;
    expect(isRestDay(friday)).toBe(true);
    expect(isRestDay(SEED_WEEK.days[0])).toBe(false);
  });
});
