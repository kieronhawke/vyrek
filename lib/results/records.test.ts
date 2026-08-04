import { describe, it, expect } from "vitest";
import {
  worldRecords,
  nationalRecords,
  ageGroupRecords,
  countriesWithRecords,
  freshRecords,
  isFresh,
  daysSince,
  announce,
  NEW_RECORD_DAYS,
  type RecordCandidate,
  divisionRank,
  isBlueRiband,
} from "./records";

function candidate(over: Partial<RecordCandidate> = {}): RecordCandidate {
  return {
    resultId: "r1",
    divisionCode: "hyrox-men",
    divisionLabel: "HYROX Men",
    athleteSlug: "a-one",
    athleteName: "A One",
    countryIso: "gb",
    ageGroup: "25-29",
    finishSeconds: 3600,
    eventSlug: "s8-2025-london",
    eventName: "HYROX London 2025",
    eventCity: "London",
    date: "2025-05-16",
    ...over,
  };
}

const NOW = new Date("2026-08-03T12:00:00Z");

describe("worldRecords", () => {
  it("keeps the fastest time per division", () => {
    const rows = worldRecords([
      candidate({ finishSeconds: 3600, athleteName: "Slow" }),
      candidate({ finishSeconds: 3400, athleteName: "Fast", date: "2025-09-01" }),
      candidate({ divisionCode: "hyrox-women", divisionLabel: "HYROX Women", finishSeconds: 4000 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.divisionCode === "hyrox-men")!.holder.athleteName).toBe("Fast");
  });

  it("carries the nationality of the actual holder", () => {
    // The old implementation hardcoded "gb" on every entry, so a Swedish world
    // record flew a British flag.
    const [row] = worldRecords([candidate({ countryIso: "se", athleteName: "Swede" })]);
    expect(row.holder.countryIso).toBe("se");
  });

  it("records what the mark beat and by how much", () => {
    const [row] = worldRecords([
      candidate({ finishSeconds: 3600, athleteName: "First", date: "2024-01-01" }),
      candidate({ finishSeconds: 3540, athleteName: "Second", date: "2025-01-01" }),
    ]);
    expect(row.previousHolderName).toBe("First");
    expect(row.previousSeconds).toBe(3600);
    expect(row.marginSeconds).toBe(60);
    expect(row.timesBroken).toBe(1);
  });

  it("counts every time the record changed hands, not every race", () => {
    const [row] = worldRecords([
      candidate({ finishSeconds: 3600, date: "2023-01-01" }),
      candidate({ finishSeconds: 3800, date: "2023-06-01" }), // slower, no break
      candidate({ finishSeconds: 3550, date: "2024-01-01" }),
      candidate({ finishSeconds: 3500, date: "2025-01-01" }),
    ]);
    expect(row.timesBroken).toBe(2);
  });

  it("does not claim a previous holder when the record has never moved", () => {
    const [row] = worldRecords([candidate({ finishSeconds: 3600 })]);
    expect(row.previousSeconds).toBeUndefined();
    expect(row.marginSeconds).toBeUndefined();
    expect(row.timesBroken).toBe(0);
  });

  it("ignores DNFs and zero times", () => {
    expect(worldRecords([candidate({ finishSeconds: 0 })])).toHaveLength(0);
  });

  it("sorts an undated result last so it cannot pose as the original mark", () => {
    // Undated first would make the later, faster time look like a break of it.
    const [row] = worldRecords([
      candidate({ finishSeconds: 3400, date: "", athleteName: "Undated" }),
      candidate({ finishSeconds: 3600, date: "2020-01-01", athleteName: "Dated" }),
    ]);
    expect(row.holder.athleteName).toBe("Undated");
    expect(row.previousHolderName).toBe("Dated");
  });
});

describe("nationalRecords", () => {
  const field = [
    candidate({ countryIso: "se", finishSeconds: 3400, athleteName: "Swede" }),
    candidate({ countryIso: "gb", finishSeconds: 3500, athleteName: "Brit A", date: "2024-01-01" }),
    candidate({ countryIso: "GB", finishSeconds: 3450, athleteName: "Brit B", date: "2025-01-01" }),
  ];

  it("finds the fastest athlete of that nationality, not the fastest overall", () => {
    const [row] = nationalRecords(field, "gb");
    expect(row.holder.athleteName).toBe("Brit B");
    expect(row.scope).toBe("national");
    expect(row.countryIso).toBe("gb");
  });

  it("matches nationality case-insensitively", () => {
    // The feed is not consistent about case, and "GB" silently missing would
    // simply drop a record with no error.
    expect(nationalRecords(field, "GB")).toHaveLength(1);
    expect(nationalRecords(field, "gb")[0].holder.athleteName).toBe("Brit B");
  });

  it("returns nothing for a country with no results", () => {
    expect(nationalRecords(field, "jp")).toHaveLength(0);
  });

  it("tracks the national progression separately from the world one", () => {
    const [row] = nationalRecords(field, "gb");
    expect(row.previousHolderName).toBe("Brit A");
    expect(row.marginSeconds).toBe(50);
  });
});

describe("ageGroupRecords", () => {
  it("keys on division and age group together", () => {
    const rows = ageGroupRecords([
      candidate({ ageGroup: "25-29", finishSeconds: 3500 }),
      candidate({ ageGroup: "40-44", finishSeconds: 3700 }),
      candidate({
        divisionCode: "hyrox-women", divisionLabel: "HYROX Women",
        ageGroup: "25-29", finishSeconds: 4100,
      }),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.scope === "age-group")).toBe(true);
  });

  it("skips candidates with no age group rather than bucketing them together", () => {
    expect(ageGroupRecords([candidate({ ageGroup: "" })])).toHaveLength(0);
  });
});

describe("countriesWithRecords", () => {
  it("orders by how many results each country has", () => {
    expect(countriesWithRecords([
      candidate({ countryIso: "se" }),
      candidate({ countryIso: "gb" }),
      candidate({ countryIso: "gb" }),
    ])).toEqual(["gb", "se"]);
  });
});

describe("freshness", () => {
  it("counts whole days since the date", () => {
    expect(daysSince("2026-08-01", NOW)).toBe(2);
    expect(daysSince("2026-08-03", NOW)).toBe(0);
  });

  it("returns null for a missing or unparseable date", () => {
    expect(daysSince("", NOW)).toBeNull();
    expect(daysSince("not-a-date", NOW)).toBeNull();
  });

  it("returns null for a future date rather than a negative age", () => {
    expect(daysSince("2027-01-01", NOW)).toBeNull();
  });

  it("treats a record inside the window as new", () => {
    const [row] = worldRecords([candidate({ date: "2026-07-28" })]);
    expect(isFresh(row, NOW)).toBe(true);
  });

  it("treats an old record as not new", () => {
    const [row] = worldRecords([candidate({ date: "2025-01-01" })]);
    expect(isFresh(row, NOW)).toBe(false);
  });

  it("never calls an undated record new", () => {
    // Guessing here would put a three-year-old time under a "just set" banner.
    const [row] = worldRecords([candidate({ date: "" })]);
    expect(isFresh(row, NOW)).toBe(false);
  });

  it("uses a fortnight by default", () => {
    const inside = worldRecords([candidate({ date: "2026-07-21" })])[0];
    const outside = worldRecords([candidate({ date: "2026-07-19" })])[0];
    expect(NEW_RECORD_DAYS).toBe(14);
    expect(isFresh(inside, NOW)).toBe(true);
    expect(isFresh(outside, NOW)).toBe(false);
  });

  it("returns fresh records newest first", () => {
    const rows = [
      ...worldRecords([candidate({ date: "2026-07-25" })]),
      ...worldRecords([candidate({
        divisionCode: "hyrox-women", divisionLabel: "HYROX Women", date: "2026-08-01",
      })]),
    ];
    expect(freshRecords(rows, NOW).map((r) => r.holder.date))
      .toEqual(["2026-08-01", "2026-07-25"]);
  });
});

describe("announce", () => {
  it("names the scope accurately for a world record", () => {
    const [row] = worldRecords([candidate({ athleteName: "Fast One" })]);
    const text = announce(row);
    expect(text).toContain("world record");
    expect(text).toContain("Fast One");
    expect(text).toContain("Men");
  });

  it("never calls a national record a world record", () => {
    // The one mistake this feature cannot make.
    const [row] = nationalRecords([candidate({ countryIso: "gb" })], "gb");
    const text = announce(row, "British");
    expect(text).toContain("British record");
    expect(text).not.toContain("world record");
  });

  it("names the age group for an age-group record", () => {
    const [row] = ageGroupRecords([candidate({ ageGroup: "40-44" })]);
    expect(announce(row)).toContain("40-44 record");
  });

  it("states the margin when the record was beaten", () => {
    const [row] = worldRecords([
      candidate({ finishSeconds: 3700, date: "2024-01-01" }),
      candidate({ finishSeconds: 3600, date: "2025-01-01" }),
    ]);
    expect(announce(row)).toContain("1m 40s off the previous mark");
  });

  it("omits the margin for a first-ever mark rather than saying zero", () => {
    const [row] = worldRecords([candidate({})]);
    expect(announce(row)).not.toContain("previous mark");
  });
});

describe("division significance", () => {
  it("puts the outright world bests first, not the alphabet", () => {
    /*
     * The bug this replaces: ordering by `divisionLabel.localeCompare` opened
     * the record book on "HYROX Adaptive Men" and buried the fastest HYROX ever
     * run somewhere in the middle. On a page whose whole job is significance,
     * the first row is a claim about importance.
     */
    expect(divisionRank("hyrox-elite-men")).toBeLessThan(divisionRank("hyrox-adaptive-men"));
    expect(divisionRank("hyrox-elite-men")).toBeLessThan(divisionRank("hyrox-doubles-mixed"));
    expect(divisionRank("hyrox-pro-men")).toBeLessThan(divisionRank("hyrox-men"));
    expect(divisionRank("hyrox-men")).toBeLessThan(divisionRank("hyrox-team-relay-men"));
  });

  it("sorts an unknown division to the end, never to the front", () => {
    // A division added upstream should degrade into the tail rather than
    // silently claim top billing on the record book.
    expect(divisionRank("hyrox-something-new")).toBeGreaterThan(divisionRank("hyrox-adaptive-women"));
  });

  it("orders a real record list by significance", () => {
    const rows = worldRecords([
      { divisionCode: "hyrox-adaptive-men", divisionLabel: "HYROX Adaptive Men", athleteSlug: "x", athleteName: "X", countryIso: "NED", ageGroup: "30-34", finishSeconds: 3973, eventSlug: "e1", eventName: "E1", eventCity: "C", date: "2025-01-01", resultId: "1" },
      { divisionCode: "hyrox-elite-men", divisionLabel: "HYROX Elite Men", athleteSlug: "y", athleteName: "Y", countryIso: "GBR", ageGroup: "30-34", finishSeconds: 3200, eventSlug: "e2", eventName: "E2", eventCity: "C", date: "2025-02-01", resultId: "2" },
      { divisionCode: "hyrox-men", divisionLabel: "HYROX Men", athleteSlug: "z", athleteName: "Z", countryIso: "GBR", ageGroup: "30-34", finishSeconds: 3400, eventSlug: "e3", eventName: "E3", eventCity: "C", date: "2025-03-01", resultId: "3" },
    ]);
    expect(rows.map((r) => r.divisionCode)).toEqual([
      "hyrox-elite-men",
      "hyrox-men",
      "hyrox-adaptive-men",
    ]);
  });

  it("marks only the two outright world bests as blue-riband", () => {
    // "Everything is a headline" is the state the page was already in.
    const flagged = ["hyrox-elite-men", "hyrox-elite-women", "hyrox-pro-men", "hyrox-men", "hyrox-adaptive-men"]
      .filter(isBlueRiband);
    expect(flagged).toEqual(["hyrox-elite-men", "hyrox-elite-women"]);
  });

  it("still ranks the faster time first within one division", () => {
    // Same division on both sides, so the division rank ties and the time has
    // to break it — otherwise the slower athlete could hold the record.
    const rows = worldRecords([
      { divisionCode: "hyrox-men", divisionLabel: "HYROX Men", athleteSlug: "slow", athleteName: "Slow", countryIso: "GBR", ageGroup: "30-34", finishSeconds: 3400, eventSlug: "e1", eventName: "E1", eventCity: "C", date: "2025-01-01", resultId: "1" },
      { divisionCode: "hyrox-men", divisionLabel: "HYROX Men", athleteSlug: "fast", athleteName: "Fast", countryIso: "GBR", ageGroup: "30-34", finishSeconds: 3200, eventSlug: "e2", eventName: "E2", eventCity: "C", date: "2025-02-01", resultId: "2" },
    ]);
    expect(rows[0].holder.finishSeconds).toBe(3200);
  });
});
