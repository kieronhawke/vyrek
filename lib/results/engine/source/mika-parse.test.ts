import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractAjax2Html,
  parseDetailSplits,
  parseDivisionRows,
  parseEventGroups,
  parseRowFields,
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
  it("groups division codes under their weekend", () => {
    const groups = parseEventGroups(fixture("season-index.html"), "season-9");
    expect(groups.length).toBeGreaterThan(0);
    const withDivisions = groups.filter((g) => g.divisions.length > 0);
    expect(withDivisions.length).toBeGreaterThan(0);
    // Every division under one weekend shares that weekend's id.
    for (const group of withDivisions) {
      for (const division of group.divisions) {
        expect(division.sourceDivisionId).toContain(group.sourceEventId);
      }
    }
  });

  it("keeps weekends the page listed but did not render divisions for", () => {
    const groups = parseEventGroups(fixture("season-index.html"), "season-9");
    expect(groups.some((g) => g.divisions.length === 0)).toBe(true);
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

  it("handles an unbalanced field div without losing the row", () => {
    const fields = parseRowFields(
      '<div class="list-field field-__fullname">Alaric Fenwick',
    );
    expect(fields.fullname).toBe("Alaric Fenwick");
  });
});

describe("division rows", () => {
  it("parses the whole board", () => {
    const parsed = parseDivisionRows(fixture("list-rows.html"), "EVT", "H_EVT");
    expect(parsed.rows).toHaveLength(8);
    expect(parsed.rows[0]).toMatchObject({
      name: "Alaric Fenwick",
      nationality: "GBR",
      ageGroup: "30-34",
      rankOverall: "1",
      finishTime: "01:02:41",
      bib: "1101",
    });
    expect(parsed.publishedEntrantCount).toBe(8);
  });

  it("keys result ids on the bib, so they are stable across polls", () => {
    const a = parseDivisionRows(fixture("list-rows.html"), "EVT", "H_EVT");
    const b = parseDivisionRows(fixture("list-rows-2.html"), "EVT", "H_EVT");
    const idsA = a.rows.map((r) => r.sourceResultId).sort();
    const idsB = b.rows.map((r) => r.sourceResultId).sort();
    // Two positions swapped between snapshots; the ids must not move with them.
    expect(idsA).toEqual(idsB);
  });

  it("recognises the empty shell the plain page always returns", () => {
    const parsed = parseDivisionRows(fixture("list-empty.html"), "EVT", "H_EVT");
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.diagnostics.emptyShell).toBe(true);
    expect(parsed.diagnostics.headerFields).toContain("fullname");
  });

  it("reports missing fields when the source renames a column", () => {
    const parsed = parseDivisionRows(fixture("list-rows-renamed.html"), "EVT", "H_EVT");
    expect(parsed.diagnostics.candidateRows).toBeGreaterThan(0);
    expect(parsed.diagnostics.parsedRows).toBe(0);
    expect(parsed.diagnostics.headerFields).not.toContain("fullname");
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
    const parsed = parseDivisionRows(fixture("list-rows-doubles.html"), "EVT", "HD_EVT");
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
  });
});

describe("ajax2 envelope", () => {
  it("finds the markup inside the JSON wrapper", () => {
    const html = extractAjax2Html(fixture("ajax2-page.json"));
    expect(html).toContain("field-__fullname");
  });

  it("returns null when the payload carries no rows", () => {
    expect(extractAjax2Html('{"status":"ok"}')).toBeNull();
  });
});
