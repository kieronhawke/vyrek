import { esc, zip } from "@/lib/export/zip";
import { sessionCount, type PlanWeek } from "@/lib/plan/model";

/**
 * The training week as a branded .xlsx.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * Ben already sends a spreadsheet, and an athlete who has used one for months
 * will keep wanting one. The complaint was not that it is a spreadsheet — it
 * is that it is an unstyled one: black Calibri on white, no header, nothing
 * that says who wrote it or which week it is.
 *
 * So this is the same information laid out the same way, branded, with the
 * things his sheet lacks: a title block naming the athlete and the week, a
 * Done column the athlete can tick, and the week's note carried at the bottom
 * instead of hidden in a row nobody scrolls to.
 *
 * WHAT AN XLSX ACTUALLY IS
 * ------------------------
 * A zip of XML. Styling lives in styles.xml as indexed fonts, fills, borders
 * and cellXfs; a cell references a style by index. It is verbose but it is not
 * hard, and it is a great deal less than a dependency.
 */

const BLACK = "FF0A0A0A";
const CHARTREUSE = "FFA3E635";
const WHITE = "FFF5F5F3";
const GREY = "FF8A8A88";
const HAIRLINE = "FF2A2A2A";
const PAPER = "FFFFFFFF";

/**
 * Style indices, in the order they are written below. Named so a cell reads
 * `s: S.dayHeader` rather than `s="4"`.
 */
const S = {
  base: 0,
  title: 1,
  subtitle: 2,
  dayHeader: 3,
  slotLabel: 4,
  session: 5,
  sessionAlt: 6,
  noteLabel: 7,
  note: 8,
  done: 9,
  meta: 10,
} as const;

function styles(): string {
  const fonts = [
    `<font><sz val="11"/><color rgb="${BLACK}"/><name val="Helvetica Neue"/></font>`,
    `<font><b/><sz val="20"/><color rgb="${CHARTREUSE}"/><name val="Helvetica Neue"/></font>`,
    `<font><sz val="11"/><color rgb="${WHITE}"/><name val="Helvetica Neue"/></font>`,
    `<font><b/><sz val="11"/><color rgb="${BLACK}"/><name val="Helvetica Neue"/></font>`,
    `<font><b/><sz val="9"/><color rgb="${GREY}"/><name val="Helvetica Neue"/></font>`,
    `<font><sz val="10"/><color rgb="${BLACK}"/><name val="Helvetica Neue"/></font>`,
    `<font><b/><sz val="10"/><color rgb="${BLACK}"/><name val="Helvetica Neue"/></font>`,
  ];

  const fills = [
    `<fill><patternFill patternType="none"/></fill>`,
    `<fill><patternFill patternType="gray125"/></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${BLACK}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${CHARTREUSE}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF7F7F5"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${PAPER}"/><bgColor indexed="64"/></patternFill></fill>`,
  ];

  const borders = [
    `<border><left/><right/><top/><bottom/><diagonal/></border>`,
    `<border><left style="thin"><color rgb="FFDDDDDD"/></left><right style="thin"><color rgb="FFDDDDDD"/></right><top style="thin"><color rgb="FFDDDDDD"/></top><bottom style="thin"><color rgb="FFDDDDDD"/></bottom><diagonal/></border>`,
    `<border><left/><right/><top/><bottom style="medium"><color rgb="${HAIRLINE}"/></bottom><diagonal/></border>`,
  ];

  // order must match S
  const xfs = [
    `<xf fontId="0" fillId="0" borderId="0" xfId="0"/>`,
    `<xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="2" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="3" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>`,
    `<xf fontId="4" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
    `<xf fontId="5" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1" indent="1"/></xf>`,
    `<xf fontId="5" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1" indent="1"/></xf>`,
    `<xf fontId="4" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="5" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>`,
    `<xf fontId="6" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`,
    `<xf fontId="4" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${fonts.length}">${fonts.join("")}</fonts>
<fills count="${fills.length}">${fills.join("")}</fills>
<borders count="${borders.length}">${borders.join("")}</borders>
<cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>
</styleSheet>`;
}

const COL = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

function cell(ref: string, value: string, style: number): string {
  if (!value) return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function sheet(week: PlanWeek, athlete: string): string {
  const rows: string[] = [];
  const wide = week.days.length; // 7

  // 1: brand, 2: athlete + week, 3: meta. Merged across the sheet.
  rows.push(
    `<row r="1" ht="30" customHeight="1">${cell("A1", "SUTH PERFORMANCE", S.title)}</row>`,
  );
  rows.push(
    `<row r="2" ht="20" customHeight="1">${cell("A2", `${athlete} — ${week.label}`, S.subtitle)}</row>`,
  );
  rows.push(
    `<row r="3" ht="18" customHeight="1">${cell(
      "A3",
      `${sessionCount(week)} sessions · ${week.runningVolume} running · programmed by Ben Sutherland`,
      S.meta,
    )}</row>`,
  );
  rows.push(`<row r="4" ht="8" customHeight="1"/>`);

  // 5: day headers.
  const head = week.days
    .map((d, i) =>
      cell(
        `${COL[i + 1]}5`,
        `${d.dayName}  ${d.date.slice(8)}/${d.date.slice(5, 7)}`,
        S.dayHeader,
      ),
    )
    .join("");
  rows.push(`<row r="5" ht="26" customHeight="1">${cell("A5", "", S.dayHeader)}${head}</row>`);

  // 6: AM, 7: PM — the shape of Ben's own sheet.
  (["am", "pm"] as const).forEach((slot, si) => {
    const r = 6 + si;
    const cells = week.days
      .map((d, i) =>
        cell(`${COL[i + 1]}${r}`, d[slot], si % 2 ? S.sessionAlt : S.session),
      )
      .join("");
    rows.push(
      `<row r="${r}" ht="188" customHeight="1">${cell(`A${r}`, slot.toUpperCase(), S.slotLabel)}${cells}</row>`,
    );
  });

  // 8: a Done column the athlete can tick. Ben's sheet has nothing like it.
  const done = week.days
    .map((d, i) => cell(`${COL[i + 1]}8`, "☐", S.done))
    .join("");
  rows.push(
    `<row r="8" ht="24" customHeight="1">${cell("A8", "DONE", S.slotLabel)}${done}</row>`,
  );

  rows.push(`<row r="9" ht="8" customHeight="1"/>`);
  rows.push(
    `<row r="10" ht="20" customHeight="1">${cell("A10", "NOTE", S.noteLabel)}</row>`,
  );
  rows.push(
    `<row r="11" ht="52" customHeight="1">${cell("A11", week.notes, S.note)}</row>`,
  );

  const merges = [
    `<mergeCell ref="A1:${COL[wide]}1"/>`,
    `<mergeCell ref="A2:${COL[wide]}2"/>`,
    `<mergeCell ref="A3:${COL[wide]}3"/>`,
    `<mergeCell ref="A10:${COL[wide]}10"/>`,
    `<mergeCell ref="A11:${COL[wide]}11"/>`,
  ];

  const cols = [
    `<col min="1" max="1" width="7" customWidth="1"/>`,
    `<col min="2" max="${wide + 1}" width="30" customWidth="1"/>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols.join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<mergeCells count="${merges.length}">${merges.join("")}</mergeCells>
<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0" footer="0"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}

/** The finished workbook, as bytes. */
export function planWorkbook(week: PlanWeek, athlete: string): Uint8Array {
  return zip([
    {
      path: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      path: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      path: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(week.label).slice(0, 28)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { path: "xl/styles.xml", data: styles() },
    { path: "xl/worksheets/sheet1.xml", data: sheet(week, athlete) },
  ]);
}

export function planFilename(week: PlanWeek, athlete: string): string {
  const safe = athlete.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `suth-${safe}-${week.weekOf}.xlsx`;
}
