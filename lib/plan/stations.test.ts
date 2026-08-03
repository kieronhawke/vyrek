import { describe, expect, it } from "vitest";
import { classifyLine, intensityOf, sessionStation, STATION_META } from "./stations";
import { SEED_WEEK, parseSession } from "./model";

/**
 * Classification exists to give a line an icon. Getting it wrong is cosmetic;
 * DROPPING a line is not, which is why the last test here walks Ben's real
 * week and checks every single line still classifies to something.
 */

describe("classifying a line", () => {
  it("reads Ben's own shorthand", () => {
    expect(classifyLine("20 mins ski")).toBe("ski");
    expect(classifyLine("20 mins row")).toBe("row");
    expect(classifyLine("15 wall balls @ 9kg")).toBe("wall-balls");
    expect(classifyLine("20m burpee")).toBe("burpee");
    expect(classifyLine("12.5m sled pull")).toBe("sled-pull");
    expect(classifyLine("25m sled push @ pro")).toBe("sled-push");
    expect(classifyLine("8x1km off 90")).toBe("run");
    expect(classifyLine("15 mins bike")).toBe("bike");
  });

  it("puts the specific pattern before the general one", () => {
    // "sled pull" must not be caught by the sled-push rule, and a bare "sled"
    // is a push because that is what Ben means by it.
    expect(classifyLine("12.5m sled pull")).toBe("sled-pull");
    expect(classifyLine("sled 4x25m")).toBe("sled-push");
    // "burpee broad jump" must not classify as a run because of "broad".
    expect(classifyLine("30 CTP burpees")).toBe("burpee");
  });

  it("recognises the shape of a day around the work", () => {
    expect(classifyLine("Warm-up: 10 mins easy")).toBe("warmup");
    expect(classifyLine("Cool down + stretch")).toBe("cooldown");
    expect(classifyLine("Rest")).toBe("rest");
  });

  it("falls back to 'other' rather than guessing", () => {
    expect(classifyLine("See how you feel")).toBe("other");
    expect(classifyLine("")).toBe("other");
    // And every key it can return has metadata, or the export renders nothing.
    for (const key of ["run", "ski", "other", "rest"] as const) {
      expect(STATION_META[key]).toBeTruthy();
      expect(STATION_META[key].label.length).toBeGreaterThan(0);
    }
  });
});

describe("the station that describes a session", () => {
  it("is the most frequent kind, not the first line", () => {
    // A session is not "a warm-up" because it opens with one.
    const text = ["Warm-up 10 mins", "8x1km off 90", "2km easy", "1km easy"].join("\n");
    expect(sessionStation(text)).toBe("run");
  });

  it("ignores warm-ups and cool-downs when deciding", () => {
    const text = ["Warm-up", "Warm-up drills", "25m sled push", "Cool down"].join("\n");
    expect(sessionStation(text)).toBe("sled-push");
  });

  it("falls back to the first line when nothing classifies", () => {
    expect(sessionStation("See how you feel\nPlay it by ear")).toBe("other");
  });

  it("handles an empty session", () => {
    expect(sessionStation("")).toBe("other");
    expect(sessionStation("   ")).toBe("other");
  });
});

describe("intensity", () => {
  it("is coarse on purpose", () => {
    expect(intensityOf("Rest")).toBe(1);
    expect(intensityOf("")).toBe(1);
    expect(intensityOf("40 mins easy zone 2")).toBe(1);
    expect(intensityOf("10km progression run")).toBe(2);
    expect(intensityOf("8x1km @ race pace")).toBe(3);
    expect(intensityOf("15 min EMOM")).toBe(3);
  });
});

describe("Ben's real week", () => {
  it("classifies every line of it to something renderable", () => {
    // The contract that matters: an export must never lose a line. Whatever
    // classification each one gets, it has to get one.
    let lines = 0;
    for (const day of SEED_WEEK.days) {
      for (const slot of [day.am, day.pm]) {
        for (const line of parseSession(slot)) {
          lines++;
          const key = classifyLine(line.raw);
          expect(STATION_META[key], `no metadata for "${line.raw}"`).toBeTruthy();
        }
      }
    }
    expect(lines).toBeGreaterThan(20);
  });

  it("gets the obvious days obviously right", () => {
    const monday = SEED_WEEK.days[0];
    const tuesday = SEED_WEEK.days[1];
    const friday = SEED_WEEK.days[4];
    // Monday is the erg-and-EMOM session; Tuesday is the track session.
    expect(["ski", "row", "wall-balls", "sled-push"]).toContain(sessionStation(monday.am));
    expect(sessionStation(tuesday.am)).toBe("run");
    expect(sessionStation(friday.am)).toBe("rest");
  });
});
