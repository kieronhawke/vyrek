import { describe, it, expect } from "vitest";
import {
  csvCell, toCsv, rankingToCsv, resultToCsv, athleteHistoryToCsv, exportFilename,
} from "./export";
import { STATION_IDS, type StationId } from "./model";

const evenStations = Object.fromEntries(
  STATION_IDS.map((id) => [id, 240]),
) as Record<StationId, number>;

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Zachary Patel")).toBe("Zachary Patel");
    expect(csvCell(42)).toBe("42");
  });

  it("quotes values containing a comma", () => {
    expect(csvCell("Patel, Zachary")).toBe('"Patel, Zachary"');
  });

  it("escapes embedded quotes by doubling them", () => {
    expect(csvCell('He said "go"')).toBe('"He said ""go"""');
  });

  it("quotes values containing newlines", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null and undefined as empty", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("starts with a UTF-8 BOM so Excel does not mangle accented names", () => {
    expect(toCsv(["a"], [["x"]]).charCodeAt(0)).toBe(0xfeff);
  });

  it("uses CRLF line endings", () => {
    const csv = toCsv(["a", "b"], [["1", "2"]]);
    expect(csv).toContain("a,b\r\n1,2\r\n");
  });

  it("handles an empty row set", () => {
    expect(toCsv(["a", "b"], [])).toBe("﻿a,b\r\n");
  });
});

describe("rankingToCsv", () => {
  const rows = [
    { rank: 1, ageGroupRank: 1, athleteName: "A One", countryIso: "gb", ageGroup: "30-34", finishSeconds: 3600, gapToLeaderSeconds: 0 },
    { rank: 2, ageGroupRank: 1, athleteName: "B, Two", countryIso: "ie", ageGroup: "25-29", finishSeconds: 3660, gapToLeaderSeconds: 60 },
  ];
  const csv = rankingToCsv({ eventName: "HYROX London 2026", divisionLabel: "HYROX Men" }, rows);

  it("emits a header and one line per athlete", () => {
    expect(csv.trimEnd().split("\r\n")).toHaveLength(3);
  });

  it("carries both a formatted time and raw seconds", () => {
    expect(csv).toContain("1:00:00");
    expect(csv).toContain("3600");
  });

  it("quotes a name containing a comma rather than splitting the row", () => {
    expect(csv).toContain('"B, Two"');
    expect(csv.trimEnd().split("\r\n")).toHaveLength(3);
  });

  it("leaves the leader's gap blank rather than showing +0:00", () => {
    // Check the field, not a substring: "1:00:00" contains "0:00" too.
    const fields = csv.split("\r\n")[1].split(",");
    expect(fields[1]).toBe("A One");
    expect(fields[7]).toBe(""); // Gap to leader
    expect(fields[8]).toBe("0"); // Gap (seconds)
  });

  it("converts nationality to a three-letter code", () => {
    expect(csv).toContain("GBR");
    expect(csv).toContain("IRL");
  });
});

describe("resultToCsv", () => {
  const csv = resultToCsv({
    athleteName: "A One",
    eventName: "HYROX London 2026",
    divisionLabel: "HYROX Men",
    runs: [200, 205, 210, 215, 220, 225, 230, 235],
    stations: evenStations,
    roxzoneSeconds: 300,
    finishSeconds: 4060,
    averageRuns: [210, 210, 210, 210, 210, 210, 210, 210],
    averageStations: evenStations,
    averageRoxzone: 320,
  });

  it("emits one row per segment plus Roxzone and the total", () => {
    // 8 runs + 8 stations + roxzone + finish + header
    expect(csv.trimEnd().split("\r\n")).toHaveLength(19);
  });

  it("includes the division average and a signed delta", () => {
    expect(csv).toContain("Division average (seconds)");
    expect(csv).toContain("-10"); // run 1 was 200 against a 210 average
  });

  it("labels each segment by type so it can be pivoted", () => {
    expect(csv).toContain(",Run,");
    expect(csv).toContain(",Station,");
    expect(csv).toContain(",Roxzone,");
    expect(csv).toContain(",Total,");
  });
});

describe("athleteHistoryToCsv", () => {
  const csv = athleteHistoryToCsv("A One", [
    { date: "2026-05-16", eventCity: "London", year: 2026, season: "s9", divisionLabel: "HYROX Men", rank: 12, ageGroupRank: 3, finishSeconds: 3600 },
    { date: "2025-06-14", eventCity: "Stockholm", year: 2025, season: "s8", divisionLabel: "HYROX Men", rank: 40, ageGroupRank: 9, finishSeconds: 3900 },
  ]);

  it("orders races oldest first, so a progression chart reads left to right", () => {
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[1]).toContain("Stockholm");
    expect(lines[2]).toContain("London");
  });

  it("writes DNF rather than a zero rank", () => {
    const withDnf = athleteHistoryToCsv("A One", [
      { date: "2026-05-16", eventCity: "London", year: 2026, season: "s9", divisionLabel: "HYROX Men", rank: 0, ageGroupRank: 0, finishSeconds: 0 },
    ]);
    expect(withDnf).toContain("DNF");
  });
});

describe("exportFilename", () => {
  it("joins parts into a safe stem", () => {
    expect(exportFilename("HYROX London 2026", "Men")).toBe("hyrox-london-2026-men");
  });

  it("strips accents and punctuation", () => {
    expect(exportFilename("Málaga", "Pro/Doubles")).toBe("malaga-pro-doubles");
  });

  it("caps length so no filesystem rejects it", () => {
    expect(exportFilename("x".repeat(400)).length).toBeLessThanOrEqual(120);
  });
});
