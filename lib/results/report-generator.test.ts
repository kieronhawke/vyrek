import { describe, it, expect } from "vitest";
import { generateRaceReport, AUTOMATED_LABEL, type ReportInput } from "./report-generator";

const base: ReportInput = {
  eventName: "HYROX Cardiff 2026",
  eventCity: "Cardiff",
  eventSlug: "s9-2026-cardiff",
  year: 2026,
  venue: "Utilita Arena Cardiff",
  startDate: "2026-06-27",
  totalAthletes: 4200,
  divisions: [
    {
      divisionCode: "hyrox-men",
      label: "HYROX Men",
      headline: true,
      finisherCount: 1200,
      podium: [
        { rank: 1, athleteName: "A Runner", athleteSlug: "a-runner", resultId: "r1", countryIso: "gb", finishSeconds: 3600, gapToLeaderSeconds: 0 },
        { rank: 2, athleteName: "B Runner", athleteSlug: "b-runner", resultId: "r2", countryIso: "ie", finishSeconds: 3620, gapToLeaderSeconds: 20 },
        { rank: 3, athleteName: "C Runner", athleteSlug: "c-runner", resultId: "r3", countryIso: "de", finishSeconds: 3700, gapToLeaderSeconds: 100 },
      ],
    },
  ],
  fastestStations: [
    { station: "sled-push", seconds: 95, athleteName: "S Pusher", athleteSlug: "s-pusher", divisionLabel: "HYROX Pro Men" },
  ],
  biggestNegativeSplit: {
    athleteName: "N Splitter", athleteSlug: "n-splitter", resultId: "r9",
    divisionLabel: "HYROX Women", differenceSeconds: -75,
  },
  ageGroupStandouts: [
    { athleteName: "V Eteran", athleteSlug: "v-eteran", ageGroup: "50-54", divisionLabel: "HYROX Men", rank: 18, finishSeconds: 3900 },
  ],
};

describe("generateRaceReport", () => {
  it("leads with the headline division winner and time", () => {
    const report = generateRaceReport(base);
    expect(report.headline).toBe("A Runner wins HYROX Cardiff 2026 in 1:00:00");
  });

  it("reports the field size in the standfirst", () => {
    expect(generateRaceReport(base).standfirst).toContain("4,200 athletes");
  });

  it("calls out a close finish as the stat of the race", () => {
    const report = generateRaceReport(base);
    expect(report.statOfTheRace?.label).toBe("Closest win");
    expect(report.statOfTheRace?.value).toBe("0:20");
  });

  it("falls back to the biggest division when no finish was close", () => {
    const wide = structuredClone(base);
    wide.divisions[0].podium[1].gapToLeaderSeconds = 400;
    const report = generateRaceReport(wide);
    expect(report.statOfTheRace?.label).toBe("Biggest division");
    expect(report.statOfTheRace?.value).toBe("1,200");
  });

  it("includes each section only when it has data", () => {
    const bare: ReportInput = {
      ...base,
      fastestStations: [],
      biggestNegativeSplit: undefined,
      ageGroupStandouts: [],
    };
    const headings = generateRaceReport(bare).sections.map((s) => s.heading);
    expect(headings).toEqual(["How it was won"]);
  });

  it("survives an event with no finishers at all", () => {
    const empty: ReportInput = {
      ...base, divisions: [], fastestStations: [],
      biggestNegativeSplit: undefined, ageGroupStandouts: [],
    };
    const report = generateRaceReport(empty);
    expect(report.headline).toContain("full results");
    expect(report.sections).toEqual([]);
    expect(report.podiums).toEqual([]);
  });

  it("is deterministic — the same input always produces the same report", () => {
    expect(generateRaceReport(base)).toEqual(generateRaceReport(base));
  });

  describe("authenticity rules", () => {
    const report = generateRaceReport(base);
    const text = [
      report.headline,
      report.standfirst,
      ...report.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
      report.statOfTheRace?.detail ?? "",
    ].join(" ");

    it("never writes in the first person", () => {
      expect(text).not.toMatch(/\b(I|we|my|our|me|us)\b/i);
    });

    it("never attributes anything to Ben Sutherland", () => {
      expect(text).not.toMatch(/sutherland/i);
      expect(text).not.toMatch(/\bben\b/i);
    });

    it("carries no opinion adjectives that imply a human judgement", () => {
      expect(text).not.toMatch(/\b(stunning|incredible|amazing|brilliant|superb|heroic)\b/i);
    });

    it("exposes the mandatory label for the page to render", () => {
      expect(AUTOMATED_LABEL).toBe("Automated race report, generated from race data");
    });
  });
});
