import { describe, it, expect } from "vitest";
import { parseTime, parseCsv, ingestCsv, rankDivision, groupByEventAndDivision } from "./ingest";

describe("parseTime", () => {
  it("reads h:mm:ss", () => expect(parseTime("1:31:30")).toBe(5490));
  it("reads mm:ss", () => expect(parseTime("5:56")).toBe(356));
  it("reads long mm:ss past an hour", () => expect(parseTime("91:30")).toBe(5490));
  it("reads bare seconds", () => expect(parseTime("356")).toBe(356));
  it("reads zero-padded h:mm:ss", () => expect(parseTime("00:05:56")).toBe(356));
  it("trims surrounding space", () => expect(parseTime("  5:56 ")).toBe(356));

  it("returns null for DNF-style markers rather than zero", () => {
    for (const value of ["DNF", "dns", "DQ", "-", "—", ""]) {
      expect(parseTime(value), value).toBeNull();
    }
  });

  it("returns null rather than guessing at nonsense", () => {
    for (const value of ["about five minutes", "5:6:7:8", "1:2:3:4", "abc", "::"]) {
      expect(parseTime(value), value).toBeNull();
    }
  });

  it("treats null and undefined as absent", () => {
    expect(parseTime(null)).toBeNull();
    expect(parseTime(undefined)).toBeNull();
  });
});

describe("parseCsv", () => {
  it("handles quoted fields containing commas", () => {
    expect(parseCsv('a,b\n"Patel, Zachary",2')).toEqual([["a", "b"], ["Patel, Zachary", "2"]]);
  });

  it("handles doubled quotes inside a quoted field", () => {
    expect(parseCsv('a\n"He said ""go"""')).toEqual([["a"], ['He said "go"']]);
  });

  it("strips a UTF-8 BOM so the first header is not corrupted", () => {
    expect(parseCsv("﻿event_slug,division")[0][0]).toBe("event_slug");
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("drops entirely blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n\n3,4")).toHaveLength(3);
  });
});

const HEADER = [
  "event_slug,event_name,division,athlete_name,nationality,age_group,finish",
  "run_1,run_2,run_3,run_4,run_5,run_6,run_7,run_8",
  "ski_erg,sled_push,sled_pull,burpee_broad_jump,row,farmers_carry,sandbag_lunges,wall_balls,roxzone",
].join(",");

const FULL_ROW = [
  "s9-2026-london,HYROX London 2026,hyrox-men,Zachary Patel,gb,30-34,1:31:30",
  "5:18,5:20,5:22,5:24,5:26,5:28,5:30,5:32",
  "4:10,2:30,3:40,5:10,4:20,1:30,4:40,5:50,6:00",
].join(",");

describe("ingestCsv", () => {
  it("ingests a complete row", () => {
    const report = ingestCsv(`${HEADER}\n${FULL_ROW}`);
    expect(report.results).toHaveLength(1);
    expect(report.rejected).toBe(0);
    expect(report.withoutSplits).toBe(0);

    const result = report.results[0];
    expect(result.athleteName).toBe("Zachary Patel");
    expect(result.athleteSlug).toBe("zachary-patel");
    expect(result.finishSeconds).toBe(5490);
    expect(result.runs).toHaveLength(8);
    expect(result.stations["ski-erg"]).toBe(250);
    expect(result.roxzoneSeconds).toBe(360);
  });

  it("refuses a file missing a required column, and says which", () => {
    const report = ingestCsv("event_slug,division,athlete_name\ns9,men,A One");
    expect(report.results).toHaveLength(0);
    expect(report.issues[0].message).toContain("finish");
  });

  it("rejects a row with an unreadable finish time instead of storing zero", () => {
    const row = FULL_ROW.replace("1:31:30", "not a time");
    const report = ingestCsv(`${HEADER}\n${row}`);
    expect(report.results).toHaveLength(0);
    expect(report.rejected).toBe(1);
    expect(report.issues[0].severity).toBe("error");
    expect(report.issues[0].row).toBe(2);
  });

  it("rejects a row missing an athlete name", () => {
    const row = FULL_ROW.replace("Zachary Patel", "");
    const report = ingestCsv(`${HEADER}\n${row}`);
    expect(report.rejected).toBe(1);
  });

  it("keeps a finish-only row but warns that its analysis will be thin", () => {
    const minimal = "event_slug,division,athlete_name,finish\ns9-2026-london,hyrox-men,A One,1:31:30";
    const report = ingestCsv(minimal);
    expect(report.results).toHaveLength(1);
    expect(report.withoutSplits).toBe(1);
    expect(report.issues[0].severity).toBe("warning");
    expect(report.issues[0].message).toContain("0/8 runs");
  });

  it("is case- and order-insensitive about headers", () => {
    const report = ingestCsv("Athlete Name,DIVISION,Event_Slug,Finish\nA One,hyrox-men,s9,1:00:00");
    expect(report.results).toHaveLength(1);
    expect(report.results[0].athleteName).toBe("A One");
  });

  it("defaults nationality and age group rather than dropping the row", () => {
    const report = ingestCsv("event_slug,division,athlete_name,finish\ns9,hyrox-men,A One,1:00:00");
    expect(report.results[0].countryIso).toBe("gb");
    expect(report.results[0].ageGroup).toBe("unknown");
  });

  it("keeps a DNF as a real result rather than rejecting the file", () => {
    // Real timing exports are full of DNFs. An importer that aborts an entire
    // event over one is unusable.
    const csv = [
      "event_slug,division,athlete_name,finish",
      "s9,hyrox-men,Finisher,1:30:00",
      "s9,hyrox-men,Did Not Finish,DNF",
    ].join("\n");
    const report = ingestCsv(csv);
    expect(report.rejected).toBe(0);
    expect(report.results).toHaveLength(2);
    expect(report.results.find((r) => r.athleteName === "Did Not Finish")?.status).toBe("dnf");
  });

  it("still errors on genuine garbage in the finish column", () => {
    const report = ingestCsv("event_slug,division,athlete_name,finish\ns9,hyrox-men,A One,about an hour");
    expect(report.rejected).toBe(1);
    expect(report.results).toHaveLength(0);
  });

  it("recognises every common non-finish marker", () => {
    for (const marker of ["DNF", "dns", "DQ", "withdrawn", "-"]) {
      const report = ingestCsv(`event_slug,division,athlete_name,finish\ns9,hyrox-men,A One,${marker}`);
      expect(report.rejected, marker).toBe(0);
      expect(report.results[0].status, marker).toBe("dnf");
    }
  });

  it("reports an empty file rather than throwing", () => {
    expect(ingestCsv("").issues[0].message).toContain("No data rows");
  });
});

describe("rankDivision", () => {
  const rows = ingestCsv([
    "event_slug,division,athlete_name,age_group,finish",
    "s9,hyrox-men,Slow One,30-34,1:40:00",
    "s9,hyrox-men,Fast One,25-29,1:20:00",
    "s9,hyrox-men,Mid One,30-34,1:30:00",
  ].join("\n")).results;

  it("excludes DNFs from the ranking so rank 1 is always the fastest finisher", () => {
    const withDnf = ingestCsv([
      "event_slug,division,athlete_name,age_group,finish",
      "s9,hyrox-men,Did Not Finish,30-34,DNF",
      "s9,hyrox-men,Winner,30-34,1:20:00",
    ].join("\n")).results;
    const ranked = rankDivision(withDnf);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].athleteName).toBe("Winner");
    expect(ranked[0].rank).toBe(1);
  });

  it("ranks by finish time regardless of file order", () => {
    const ranked = rankDivision(rows);
    expect(ranked.map((r) => r.athleteName)).toEqual(["Fast One", "Mid One", "Slow One"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("numbers age-group ranks independently", () => {
    const ranked = rankDivision(rows);
    const byName = Object.fromEntries(ranked.map((r) => [r.athleteName, r]));
    expect(byName["Fast One"].ageGroupRank).toBe(1); // only 25-29
    expect(byName["Mid One"].ageGroupRank).toBe(1);  // first 30-34
    expect(byName["Slow One"].ageGroupRank).toBe(2);
  });
});

describe("groupByEventAndDivision", () => {
  it("splits rows into events and divisions", () => {
    const rows = ingestCsv([
      "event_slug,division,athlete_name,finish",
      "s9-london,hyrox-men,A,1:00:00",
      "s9-london,hyrox-women,B,1:10:00",
      "s9-cardiff,hyrox-men,C,1:05:00",
    ].join("\n")).results;

    const grouped = groupByEventAndDivision(rows);
    expect([...grouped.keys()].sort()).toEqual(["s9-cardiff", "s9-london"]);
    expect([...grouped.get("s9-london")!.keys()].sort()).toEqual(["hyrox-men", "hyrox-women"]);
    expect(grouped.get("s9-cardiff")!.get("hyrox-men")).toHaveLength(1);
  });
});
