import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { planFilename, planWorkbook } from "./plan-xlsx";
import { SEED_WEEK } from "@/lib/plan/model";

/**
 * An .xlsx that Excel refuses to open is worse than no export at all, and
 * "it looks right in the code" proves nothing about a zip written by hand.
 * So these tests write the real file and make a real unzip validate it.
 */
function build() {
  const bytes = planWorkbook(SEED_WEEK, "Haseeb");
  const dir = mkdtempSync(path.join(tmpdir(), "suth-xlsx-"));
  const file = path.join(dir, "plan.xlsx");
  writeFileSync(file, bytes);
  return { bytes, dir, file };
}

function unzipTo(file: string, dir: string) {
  execFileSync("unzip", ["-qo", file, "-d", dir]);
}

describe("plan workbook", () => {
  it("produces an archive unzip considers valid", () => {
    const { file } = build();
    // -t fails loudly on a bad CRC, a bad central directory or a bad EOCD,
    // which are exactly the three things a hand-written zip gets wrong.
    const out = execFileSync("unzip", ["-t", file]).toString();
    expect(out).toContain("No errors detected");
  });

  it("contains every part the format requires", () => {
    const { file, dir } = build();
    unzipTo(file, dir);
    for (const part of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]) {
      expect(existsSync(path.join(dir, part)), part).toBe(true);
    }
  });

  it("carries the branding rather than defaulting to black on white", () => {
    const { file, dir } = build();
    unzipTo(file, dir);
    const styles = readFileSync(path.join(dir, "xl/styles.xml"), "utf8");
    expect(styles).toContain("FFA3E635"); // chartreuse
    expect(styles).toContain("FF0A0A0A"); // near-black
    // Sessions must wrap: Ben's cells are ten lines of free text.
    expect(styles).toContain('wrapText="1"');
  });

  it("writes the week in Ben's own shape", () => {
    const { file, dir } = build();
    unzipTo(file, dir);
    const sheet = readFileSync(path.join(dir, "xl/worksheets/sheet1.xml"), "utf8");
    expect(sheet).toContain("SUTH PERFORMANCE");
    expect(sheet).toContain("Haseeb");
    expect(sheet).toContain("AM");
    expect(sheet).toContain("PM");
    // Seven day headers.
    for (const day of ["Monday", "Tuesday", "Sunday"]) {
      expect(sheet).toContain(day);
    }
    // The note is carried, not dropped.
    expect(sheet).toContain("Push the wall balls");
    // A Done column, which his own sheet does not have.
    expect(sheet).toContain("DONE");
  });

  it("keeps every session line, newlines intact", () => {
    const { file, dir } = build();
    unzipTo(file, dir);
    const sheet = readFileSync(path.join(dir, "xl/worksheets/sheet1.xml"), "utf8");
    // A session Excel would otherwise flatten onto one line.
    expect(sheet).toContain("10km progression run");
    expect(sheet).toContain("2km @ 4:15");
    expect(sheet).toContain('xml:space="preserve"');
  });

  it("escapes XML rather than producing a corrupt file", () => {
    const bytes = planWorkbook(
      {
        ...SEED_WEEK,
        notes: 'Ben & "the crew" <hard> week',
        days: SEED_WEEK.days.map((d, i) =>
          i === 0 ? { ...d, am: "5 x 3 & <10> reps" } : d,
        ),
      },
      "O'Brien & Sons",
    );
    const dir = mkdtempSync(path.join(tmpdir(), "suth-xlsx-esc-"));
    const file = path.join(dir, "plan.xlsx");
    writeFileSync(file, bytes);
    expect(execFileSync("unzip", ["-t", file]).toString()).toContain(
      "No errors detected",
    );
    unzipTo(file, dir);
    const sheet = readFileSync(path.join(dir, "xl/worksheets/sheet1.xml"), "utf8");
    expect(sheet).toContain("&amp;");
    expect(sheet).not.toContain("& \"");
  });

  it("is byte-identical for the same plan, so a diff means something", () => {
    const a = planWorkbook(SEED_WEEK, "Haseeb");
    const b = planWorkbook(SEED_WEEK, "Haseeb");
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("names the file after the athlete and the week", () => {
    expect(planFilename(SEED_WEEK, "Haseeb")).toBe("suth-haseeb-2026-08-03.xlsx");
    expect(planFilename(SEED_WEEK, "Nicole P")).toBe("suth-nicole-p-2026-08-03.xlsx");
  });
});
