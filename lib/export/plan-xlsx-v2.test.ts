import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planFilenameV2, planWorkbookV2 } from "./plan-xlsx-v2";
import { SEED_WEEK, parseSession, type PlanWeek } from "@/lib/plan/model";

/**
 * A hand-written xlsx is a zip of XML, and the failure mode is a file that
 * downloads and then will not open — which no unit test of the XML strings
 * would catch. So this writes the real bytes to disk and asks the operating
 * system's own unzip to verify the archive.
 */

const ATHLETE = "Sample Athlete";

function build(week: PlanWeek = SEED_WEEK) {
  return planWorkbookV2(week, ATHLETE);
}

function writeTo(bytes: Uint8Array): string {
  const dir = mkdtempSync(join(tmpdir(), "suth-xlsx-"));
  const path = join(dir, "plan.xlsx");
  writeFileSync(path, bytes);
  return path;
}

/** The sheet XML, pulled back out of the archive we just wrote. */
function sheetXml(bytes: Uint8Array): string {
  const path = writeTo(bytes);
  return execFileSync("unzip", ["-p", path, "xl/worksheets/sheet1.xml"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

describe("the archive", () => {
  it("is a valid zip the system can open", () => {
    const out = execFileSync("unzip", ["-t", writeTo(build())], { encoding: "utf8" });
    expect(out).toContain("No errors detected");
  });

  it("carries every part an xlsx needs", () => {
    const listing = execFileSync("unzip", ["-l", writeTo(build())], { encoding: "utf8" });
    for (const part of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]) {
      expect(listing).toContain(part);
    }
  });
});

describe("the sheet", () => {
  const xml = sheetXml(build());

  it("names the athlete and the week where they cannot be missed", () => {
    // "Going between different weeks it isn't really clear" was the complaint.
    expect(xml).toContain("SUTH PERFORMANCE");
    expect(xml).toContain(`${ATHLETE} — ${SEED_WEEK.label}`);
    expect(xml).toContain(SEED_WEEK.days[0].date);
    expect(xml).toContain(SEED_WEEK.days[6].date);
  });

  it("has the columns that make it a spreadsheet rather than a picture of one", () => {
    for (const head of ["DAY", "WHEN", "TYPE", "QTY", "WORK", "EFFORT", "DONE"]) {
      expect(xml).toContain(`>${head}<`);
    }
    // Filterable and frozen, or none of those columns are any use.
    expect(xml).toMatch(/<autoFilter ref="A\d+:G\d+"\/>/);
    expect(xml).toContain('state="frozen"');
  });

  it("loses no line of what Ben wrote", () => {
    // The contract. A plan export that quietly drops a line is worse than one
    // with no styling at all.
    let expected = 0;
    for (const day of SEED_WEEK.days) {
      for (const slot of [day.am, day.pm]) expected += parseSession(slot).length;
    }
    expect(expected).toBeGreaterThan(20);

    // Every line's text appears somewhere in the sheet.
    for (const day of SEED_WEEK.days) {
      for (const slot of [day.am, day.pm]) {
        for (const line of parseSession(slot)) {
          const needle = (line.quantity ? line.rest : line.raw)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;");
          if (needle) expect(xml, `missing "${line.raw}"`).toContain(needle);
        }
      }
    }
  });

  it("names each day once rather than on every line", () => {
    // Repeating "Monday" fourteen times is what makes a sheet unreadable.
    const monday = (xml.match(/>Monday 03\/08</g) ?? []).length;
    expect(monday).toBe(1);
  });

  it("carries the note, because a plan without one cannot be sent", () => {
    expect(xml).toContain("NOTE FOR THE WEEK");
    expect(xml).toContain(SEED_WEEK.notes);
  });

  it("gives a rest day a row rather than a gap", () => {
    expect(xml).toContain("Rest day");
  });

  it("escapes what would otherwise break the XML", () => {
    const nasty: PlanWeek = {
      ...SEED_WEEK,
      notes: `5 & 6 <not a tag> "quoted" 'single'`,
      days: SEED_WEEK.days.map((d, i) =>
        i === 0 ? { ...d, am: "3 x 5 <heavy> & hard" } : d,
      ),
    };
    const out = execFileSync("unzip", ["-t", writeTo(build(nasty))], { encoding: "utf8" });
    expect(out).toContain("No errors detected");
    const x = sheetXml(build(nasty));
    expect(x).toContain("&amp;");
    expect(x).toContain("&lt;heavy&gt;");
  });

  it("survives a completely empty week", () => {
    const empty: PlanWeek = {
      ...SEED_WEEK,
      notes: "",
      days: SEED_WEEK.days.map((d) => ({ ...d, am: "", pm: "" })),
    };
    const out = execFileSync("unzip", ["-t", writeTo(build(empty))], { encoding: "utf8" });
    expect(out).toContain("No errors detected");
  });
});

describe("the filename", () => {
  it("says who and when, and never contains a path separator", () => {
    const name = planFilenameV2(SEED_WEEK, "Sample Athlete");
    expect(name).toBe(`suth-sample-athlete-${SEED_WEEK.weekOf}-v2.xlsx`);
    expect(name).not.toMatch(/[/\\]/);
  });

  it("still produces a usable name for an unnamed plan", () => {
    // Standalone plans start with no athlete at all.
    expect(planFilenameV2(SEED_WEEK, "")).toBe(`suth-plan-${SEED_WEEK.weekOf}-v2.xlsx`);
  });
});
