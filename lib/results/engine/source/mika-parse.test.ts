import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseDetailSplits,
  parseDivisionRows,
  parseEventGroups,
  parseGroupNames,
  parseRowFields,
  normalisePersonName,
  splitEventCode,
  splitPartnerNames,
} from "./mika-parse";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "tests", "fixtures", "hyrox", name), "utf8");

describe("event codes", () => {
  it("splits division prefix from weekend id", () => {
    expect(splitEventCode("HPRO_LR3MS4JI163A")).toEqual({
      prefix: "HPRO",
      weekendId: "LR3MS4JI163A",
    });
    expect(splitEventCode("HD1_LR3MS4JI163B")?.prefix).toBe("HD1");
  });

  it("returns null for something that is not a code", () => {
    expect(splitEventCode("2026 Chiba")).toBeNull();
  });
});

describe("season index", () => {
  it("reads the weekend names, and only the names", () => {
    const names = parseGroupNames(fixture("season-index.html"));
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain("2026 Chiba");
    // Division codes live in the other select and must not leak into this one.
    expect(names.every((n) => !/^[A-Z]+\d?_/.test(n))).toBe(true);
  });

  it("groups division codes under their weekend id", () => {
    const groups = parseEventGroups(fixture("season-index.html"), "season-9", "2026 Chiba");
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.divisions.length).toBeGreaterThan(0);
      for (const division of group.divisions) {
        expect(division.sourceDivisionId).toContain(group.sourceEventId);
      }
    }
  });

  /**
   * The bug this pins down cost a whole catalogue.
   *
   * The plain season page lists every weekend's codes flat — 73 codes across 22
   * weekends — with no optgroup and no marker saying which is which, and
   * narrowing by query parameter changes nothing. Labelling them all after the
   * selected weekend filed 22 real race weekends under one slug, so Delhi's
   * results would have been stored against Chiba.
   *
   * So an un-narrowed parse yields **unlabelled** groups, and the catalogue
   * refuses to create an event it cannot name.
   */
  it("leaves weekends unlabelled when the caller has not narrowed to one", () => {
    const groups = parseEventGroups(fixture("season-index.html"), "season-9");
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((g) => g.label === "")).toBe(true);
  });

  it("labels them only when told which weekend was requested", () => {
    const groups = parseEventGroups(fixture("season-index.html"), "season-9", "2026 Delhi");
    expect(groups.every((g) => g.label === "2026 Delhi")).toBe(true);
  });
});

describe("row fields", () => {
  /**
   * The bug this pins down: the responsive layout nests a label div inside each
   * field div, so a non-greedy regex returns the column heading for every row.
   * Every athlete's nationality comes out as "Nat" and nothing errors.
   */
  it("reads the value, not the mobile label", () => {
    const rows = parseDivisionRows(fixture("list-rows.html"), "EVT", "H_EVT");
    expect(rows.rows[0].nationality).toBe("GBR");
    expect(rows.rows[0].nationality).not.toBe("Nat");
    expect(rows.rows[0].ageGroup).toBe("30-34");
    expect(rows.rows[0].ageGroup).not.toBe("Age Group");
  });

  it("handles an unbalanced field element without losing the row", () => {
    const fields = parseRowFields('<h4 class="list-field type-fullname">Fenwick, Alaric');
    expect(fields.fullname).toBe("Fenwick, Alaric");
  });

  it("strips the flag image so the nationality is not doubled", () => {
    const fields = parseRowFields(
      '<div class="list-field type-nation_flag"><div class="list-label">Nat</div>' +
        '<span class="nation__labelled-icon"><img alt="ITA" title="ITA"/>' +
        '<span class="nation__abbr">ITA</span></span></div>',
    );
    expect(fields.nation_flag).toBe("ITA");
  });

  it("tells overall rank from age-group rank by class, not by order", () => {
    const fields = parseRowFields(
      '<div class="list-field type-place place-primary numeric">7</div>' +
        '<div class="list-field type-place place-secondary numeric">2</div>',
    );
    expect(fields.place_all).toBe("7");
    expect(fields.place_age).toBe("2");
  });
});

describe("division rows", () => {
  it("parses the whole board", () => {
    const parsed = parseDivisionRows(fixture("list-rows.html"), "EVT", "H_EVT#men");
    expect(parsed.rows).toHaveLength(8);
    expect(parsed.rows[0]).toMatchObject({
      // Stored the way a person writes their own name, not "Fenwick, Alaric".
      name: "Alaric Fenwick",
      nationality: "GBR",
      ageGroup: "30-34",
      rankOverall: "1",
      rankAgeGroup: "1",
      finishTime: "01:02:41",
      sourceAthleteId: "LRAA0000001",
      sex: "M",
    });
    expect(parsed.publishedEntrantCount).toBe(8);
  });

  it("reads the entrant count from the counter, not from any number near the word", () => {
    // A loose match once read a 153-row division as having 19 entrants, which
    // would have gone straight into the completeness checksum as a false pass.
    const parsed = parseDivisionRows(fixture("list-rows-short.html"), "EVT", "H_EVT#men");
    expect(parsed.publishedEntrantCount).toBe(8);
    expect(parsed.rows).toHaveLength(3);
  });

  it("carries a DNF through with no time rather than dropping the row", () => {
    const parsed = parseDivisionRows(fixture("list-rows-dnf.html"), "EVT", "H_EVT#men");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1].finishTime).toBeUndefined();
    expect(parsed.rows[1].name).toBe("Kit Sorrell");
  });

  it("keys result ids on the source's own idp, so they are stable across polls", () => {
    const a = parseDivisionRows(fixture("list-rows.html"), "EVT", "H_EVT#men");
    const b = parseDivisionRows(fixture("list-rows-2.html"), "EVT", "H_EVT#men");
    const idsA = a.rows.map((r) => r.sourceResultId).sort();
    const idsB = b.rows.map((r) => r.sourceResultId).sort();
    // Two positions swapped between snapshots; the ids must not move with them.
    // Rank-derived ids would change here, and a live board would then insert
    // duplicate rows on every position change instead of updating them.
    expect(idsA).toEqual(idsB);
    expect(idsA[0]).toContain("LRAA");
  });

  it("recognises the board that declines to render an unfiltered set", () => {
    const parsed = parseDivisionRows(fixture("list-empty.html"), "EVT", "H_EVT#men");
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.diagnostics.emptyShell).toBe(true);
    expect(parsed.diagnostics.headerFields).toContain("fullname");
    // "> 200 Results": it knows how many there are, it just will not show them.
    expect(parsed.publishedEntrantCount).toBe(200);
  });

  it("reports missing fields when the source renames a column", () => {
    const parsed = parseDivisionRows(fixture("list-rows-renamed.html"), "EVT", "H_EVT#men");
    expect(parsed.diagnostics.candidateRows).toBe(0);
    expect(parsed.diagnostics.parsedRows).toBe(0);
    expect(parsed.diagnostics.headerFields).not.toContain("fullname");
  });
});

describe("names", () => {
  it("turns mika's surname-first format into how a person writes their name", () => {
    expect(normalisePersonName("Benzio, Sergio")).toBe("Sergio Benzio");
    expect(normalisePersonName("Volkov-Reyes, Dmitri")).toBe("Dmitri Volkov-Reyes");
    // Already forename-first, or a team row: left alone.
    expect(normalisePersonName("Sergio Benzio")).toBe("Sergio Benzio");
    expect(normalisePersonName("A Smith / B Jones")).toBe("A Smith / B Jones");
  });
});

describe("doubles", () => {
  it("splits a team row into its athletes", () => {
    expect(splitPartnerNames("Alaric Fenwick / Caius Marlowe")).toEqual([
      "Alaric Fenwick",
      "Caius Marlowe",
    ]);
    expect(splitPartnerNames("Alaric Fenwick")).toBeUndefined();
  });

  it("carries partner names off a doubles board", () => {
    const parsed = parseDivisionRows(fixture("list-rows-doubles.html"), "EVT", "HD_EVT#men");
    expect(parsed.rows[0].partnerNames).toHaveLength(2);
  });
});

describe("detail splits", () => {
  it("reads eight runs, eight stations and the Roxzone in race order", () => {
    const splits = parseDetailSplits(fixture("detail-splits.html"));
    expect(splits.runs).toHaveLength(8);
    expect(splits.stations).toHaveLength(8);
    expect(splits.stations.map((s) => s.key)).toEqual([
      "ski-erg",
      "sled-push",
      "sled-pull",
      "burpee-broad-jump",
      "row",
      "farmers-carry",
      "sandbag-lunges",
      "wall-balls",
    ]);
    expect(splits.roxzone).toBe("00:06:14");
    expect(splits.finish).toBe("01:02:41");
    expect(splits.bib).toBe("163522");
    // "Run Total" and "Best Run Lap" are summary rows, and "1000m SkiErg In" is
    // a timing mat. A loose match turns them into a ninth run and a second
    // SkiErg split, and the splits then never sum to the finish.
    expect(splits.runs).toHaveLength(8);
    expect(splits.stations.filter((s) => s.key === "ski-erg")).toHaveLength(1);
  });
});
