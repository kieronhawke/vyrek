import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planWorkbook } from "./plan-xlsx";
import { planWorkbookV2 } from "./plan-xlsx-v2";
import { SEED_WEEK, type PlanWeek } from "@/lib/plan/model";

/**
 * DOES EXCEL ACTUALLY ACCEPT THIS?
 *
 * The v2 workbook shipped broken. It unzipped cleanly, `unzip -t` reported no
 * errors, and openpyxl opened it and read every cell — and Excel offered to
 * repair it. The cause was element order: CT_Worksheet is an xsd:sequence, so
 * `autoFilter` has to precede `mergeCells`, and I had emitted them the other
 * way round.
 *
 * Every check that existed was on the zip or on a lenient reader, so none of
 * them could have caught it. These are the checks that would have: the schema
 * sequences, and the count attributes that Excel validates against the number
 * of children actually present.
 *
 * Not a full XSD validation — that needs the ECMA-376 schemas, which are not
 * in this repository. It is the subset that hand-written OOXML actually gets
 * wrong.
 */

/** CT_Worksheet, in schema order. Only the elements this code emits. */
const WORKSHEET_SEQUENCE = [
  "sheetPr",
  "dimension",
  "sheetViews",
  "sheetFormatPr",
  "cols",
  "sheetData",
  "sheetCalcPr",
  "sheetProtection",
  "protectedRanges",
  "scenarios",
  "autoFilter",
  "sortState",
  "dataConsolidate",
  "customSheetViews",
  "mergeCells",
  "phoneticPr",
  "conditionalFormatting",
  "dataValidations",
  "hyperlinks",
  "printOptions",
  "pageMargins",
  "pageSetup",
  "headerFooter",
];

/** CT_Stylesheet, in schema order. */
const STYLESHEET_SEQUENCE = [
  "numFmts",
  "fonts",
  "fills",
  "borders",
  "cellStyleXfs",
  "cellXfs",
  "cellStyles",
  "dxfs",
  "tableStyles",
  "colors",
  "extLst",
];

function unzipPart(bytes: Uint8Array, part: string): string {
  const dir = mkdtempSync(join(tmpdir(), "suth-ooxml-"));
  const path = join(dir, "book.xlsx");
  writeFileSync(path, bytes);
  return execFileSync("unzip", ["-p", path, part], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

/** Top-level child element names of the document root, in document order. */
function topLevelChildren(xml: string, root: string): string[] {
  const body = xml.slice(xml.indexOf(`<${root}`));
  const inner = body.slice(body.indexOf(">") + 1);
  const out: string[] = [];
  let depth = 0;
  const tag = /<(\/?)([a-zA-Z:]+)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(inner))) {
    const [, close, name, , selfClose] = m;
    if (name === root && close) break;
    if (!close && depth === 0) out.push(name);
    if (!close && !selfClose) depth++;
    else if (close) depth--;
  }
  return out;
}

function assertInSchemaOrder(children: string[], sequence: string[], what: string) {
  let last = -1;
  for (const child of children) {
    const at = sequence.indexOf(child);
    expect(at, `${what}: <${child}> is not a known child`).toBeGreaterThanOrEqual(0);
    expect(
      at,
      `${what}: <${child}> appears after <${children[children.indexOf(child) - 1]}> but the schema puts it before`,
    ).toBeGreaterThan(last);
    last = at;
  }
}

/** `<fonts count="11">` has to match the number of `<font>` children. */
function assertCount(xml: string, container: string, child: string) {
  const block = new RegExp(`<${container} count="(\\d+)">([\\s\\S]*?)</${container}>`).exec(xml);
  expect(block, `no <${container}> block`).not.toBeNull();
  const declared = Number(block![1]);
  const actual = (block![2].match(new RegExp(`<${child}[ />]`, "g")) ?? []).length;
  expect(actual, `<${container} count="${declared}"> but ${actual} <${child}>`).toBe(declared);
}

/**
 * LibreOffice, when it is installed.
 *
 * It is far stricter than openpyxl and much closer to Excel: it is the only
 * reader available here that would have rejected the broken file. Skipped
 * rather than failed when absent, because a developer without it should still
 * be able to run the suite — the schema checks above are the ones that always
 * run.
 */
const SOFFICE = [
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
  "/opt/homebrew/bin/soffice",
].find((p) => existsSync(p));

const BOOKS: { name: string; build: (w: PlanWeek) => Uint8Array }[] = [
  { name: "v1", build: (w) => planWorkbook(w, "Haseeb") },
  { name: "v2", build: (w) => planWorkbookV2(w, "Haseeb") },
];

describe.each(BOOKS)("$name workbook", ({ build }) => {
  const bytes = build(SEED_WEEK);
  const sheet = unzipPart(bytes, "xl/worksheets/sheet1.xml");
  const styles = unzipPart(bytes, "xl/styles.xml");

  it("puts the worksheet's children in schema order", () => {
    // THE BUG THIS EXISTS FOR: autoFilter after mergeCells unzips fine, reads
    // fine, and makes Excel offer to repair the file.
    assertInSchemaOrder(topLevelChildren(sheet, "worksheet"), WORKSHEET_SEQUENCE, "worksheet");
  });

  it("puts the stylesheet's children in schema order", () => {
    assertInSchemaOrder(topLevelChildren(styles, "styleSheet"), STYLESHEET_SEQUENCE, "styleSheet");
  });

  it("declares counts that match what is there", () => {
    // Excel checks these, and a mismatch is another silent repair prompt.
    assertCount(styles, "fonts", "font");
    assertCount(styles, "fills", "fill");
    assertCount(styles, "borders", "border");
    assertCount(styles, "cellXfs", "xf");
    assertCount(styles, "cellStyleXfs", "xf");
    if (sheet.includes("<mergeCells")) assertCount(sheet, "mergeCells", "mergeCell");
  });

  it("never references a style index that does not exist", () => {
    // An out-of-range s="" is the other classic repair prompt.
    const fonts = Number(/<fonts count="(\d+)"/.exec(styles)![1]);
    const fills = Number(/<fills count="(\d+)"/.exec(styles)![1]);
    const borders = Number(/<borders count="(\d+)"/.exec(styles)![1]);
    const xfCount = Number(/<cellXfs count="(\d+)"/.exec(styles)![1]);

    const cellXfs = /<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/.exec(styles)![1];
    for (const m of cellXfs.matchAll(/fontId="(\d+)"/g)) {
      expect(Number(m[1]), "fontId out of range").toBeLessThan(fonts);
    }
    for (const m of cellXfs.matchAll(/fillId="(\d+)"/g)) {
      expect(Number(m[1]), "fillId out of range").toBeLessThan(fills);
    }
    for (const m of cellXfs.matchAll(/borderId="(\d+)"/g)) {
      expect(Number(m[1]), "borderId out of range").toBeLessThan(borders);
    }
    for (const m of sheet.matchAll(/<c r="[A-Z]+\d+" s="(\d+)"/g)) {
      expect(Number(m[1]), "cell style index out of range").toBeLessThan(xfCount);
    }
  });

  it("emits rows in ascending order with cells in column order", () => {
    // Excel reads sheetData as ordered. Out-of-order rows are tolerated by
    // most readers and rejected by the one that matters.
    const rows = [...sheet.matchAll(/<row r="(\d+)"/g)].map((m) => Number(m[1]));
    expect(rows.length).toBeGreaterThan(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i], `row ${rows[i]} follows ${rows[i - 1]}`).toBeGreaterThan(rows[i - 1]);
    }

    // Spacer rows are self-closing and have no </row>, so the pattern has to
    // allow for that — matching greedily across one swallows the next row's
    // cells and reports them against the wrong row number.
    for (const row of sheet.matchAll(
      /<row r="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g,
    )) {
      const refs = [...(row[2] ?? "").matchAll(/<c r="([A-Z]+)(\d+)"/g)];
      const cols = refs.map((m) => m[1]);
      for (const m of refs) {
        expect(m[2], `cell ${m[1]}${m[2]} is in row ${row[1]}`).toBe(row[1]);
      }
      for (let i = 1; i < cols.length; i++) {
        expect(cols[i].localeCompare(cols[i - 1]), `${cols[i]} after ${cols[i - 1]}`).toBeGreaterThan(0);
      }
    }
  });

  it("has no merge that overlaps another", () => {
    const merges = [...sheet.matchAll(/<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g)].map(
      (m) => ({ r1: Number(m[2]), r2: Number(m[4]) }),
    );
    // Every merge here is a single full-width row; two on the same row would
    // be an overlap, which Excel refuses outright.
    const rows = merges.flatMap((m) => Array.from({ length: m.r2 - m.r1 + 1 }, (_, i) => m.r1 + i));
    expect(new Set(rows).size).toBe(rows.length);
  });

  it.skipIf(!SOFFICE)("opens in LibreOffice with every row intact", () => {
    const dir = mkdtempSync(join(tmpdir(), "suth-lo-"));
    const path = join(dir, "book.xlsx");
    writeFileSync(path, bytes);
    execFileSync(SOFFICE!, [
      "--headless",
      "--norestore",
      "--convert-to",
      "csv",
      "--outdir",
      dir,
      path,
    ], { stdio: "pipe", timeout: 180_000 });

    const csvName = readdirSync(dir).find((f) => f.endsWith(".csv"));
    expect(csvName, "LibreOffice produced no output — it rejected the file").toBeTruthy();
    const csv = readFileSync(join(dir, csvName!), "utf8");
    expect(csv).toContain("SUTH PERFORMANCE");
    expect(csv).toContain(SEED_WEEK.notes);
    // Every row of the sheet survived the round trip.
    const sheetRows = (sheet.match(/<row r="/g) ?? []).length;
    expect(csv.trimEnd().split("\n").length).toBeGreaterThanOrEqual(sheetRows - 2);
  }, 200_000);

  it("closes every tag it opens", () => {
    for (const xml of [sheet, styles]) {
      const opens = [...xml.matchAll(/<([a-zA-Z:]+)(?![^>]*\/>)[^>]*>/g)]
        .map((m) => m[1])
        .filter((n) => !n.startsWith("?"));
      const closes = [...xml.matchAll(/<\/([a-zA-Z:]+)>/g)].map((m) => m[1]);
      expect(opens.length).toBe(closes.length);
    }
  });
});
