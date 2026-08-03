import { esc, zip } from "@/lib/export/zip";
import {
  isRestDay,
  parseSession,
  planTitle,
  sessionCount,
  type PlanWeek,
} from "@/lib/plan/model";
import { classifyLine, STATION_META } from "@/lib/plan/stations";

/**
 * THE TRAINING WEEK AS A SPREADSHEET — version 2.
 *
 * WHAT WAS WRONG WITH VERSION 1
 * It reproduced Ben's own sheet: seven columns, one cell per session, the
 * whole workout as a block of text inside it. That is a picture of a
 * spreadsheet rather than a spreadsheet. You cannot sort it, filter it, count
 * it, or see at a glance that Wednesday is three ergs and ninety burpees.
 *
 * WHAT THIS DOES INSTEAD
 * One row per line of work, with the columns a person would actually want:
 * day, morning or afternoon, what kind of work it is, the quantity on its own,
 * the work itself, the effort, and a box to tick. That makes the file do
 * spreadsheet things — filter to every run in the week, sort by station, count
 * the sled work — none of which v1 could do.
 *
 * Plus the two things Kieron asked for: the week stated unmistakably at the
 * top in the brand's black and chartreuse, and each day banded so you can see
 * where one ends and the next begins.
 *
 * V1 IS KEPT at lib/export/plan-xlsx.ts. It is the one that looks like Ben's
 * sheet, which is the right thing to send to somebody who has used his sheet
 * for a year.
 *
 * NOTHING IS EVER DROPPED. parseSession keeps every line including the
 * connectors ("into", "x3"); a connector gets its own row with no quantity so
 * the shape of a session survives the transfer.
 *
 * An xlsx is a zip of XML. Styling lives in styles.xml as indexed fonts,
 * fills, borders and cellXfs; a cell references a style by index.
 */

const BLACK = "FF0A0A0A";
const CHARTREUSE = "FFA3E635";
const WHITE = "FFF5F5F3";
const GREY = "FF8A8A88";
const INK = "FF131211";
const BAND = "FFF4F4F2";
const RULE = "FFDDDDDD";

const S = {
  base: 0,
  title: 1,
  subtitle: 2,
  meta: 3,
  colHead: 4,
  day: 5,
  dayBand: 6,
  cell: 7,
  cellBand: 8,
  qty: 9,
  qtyBand: 10,
  station: 11,
  stationBand: 12,
  done: 13,
  doneBand: 14,
  noteLabel: 15,
  note: 16,
  connector: 17,
  connectorBand: 18,
} as const;

function styles(): string {
  const fonts = [
    /* 0 */ `<font><sz val="11"/><color rgb="${INK}"/><name val="Helvetica Neue"/></font>`,
    /* 1 */ `<font><b/><sz val="20"/><color rgb="${CHARTREUSE}"/><name val="Helvetica Neue"/></font>`,
    /* 2 */ `<font><b/><sz val="13"/><color rgb="${WHITE}"/><name val="Helvetica Neue"/></font>`,
    /* 3 */ `<font><sz val="10"/><color rgb="${GREY}"/><name val="Helvetica Neue"/></font>`,
    /* 4 */ `<font><b/><sz val="9"/><color rgb="${WHITE}"/><name val="Helvetica Neue"/></font>`,
    /* 5 */ `<font><b/><sz val="11"/><color rgb="${INK}"/><name val="Helvetica Neue"/></font>`,
    /* 6 */ `<font><sz val="10"/><color rgb="${INK}"/><name val="Helvetica Neue"/></font>`,
    /* 7 */ `<font><b/><sz val="10"/><color rgb="${INK}"/><name val="Helvetica Neue"/></font>`,
    /* 8 */ `<font><b/><sz val="9"/><color rgb="FF47660C"/><name val="Helvetica Neue"/></font>`,
    /* 9 */ `<font><i/><sz val="10"/><color rgb="${GREY}"/><name val="Helvetica Neue"/></font>`,
    /* 10 */ `<font><b/><sz val="9"/><color rgb="${GREY}"/><name val="Helvetica Neue"/></font>`,
  ];

  const fills = [
    /* 0 */ `<fill><patternFill patternType="none"/></fill>`,
    /* 1 */ `<fill><patternFill patternType="gray125"/></fill>`,
    /* 2 */ `<fill><patternFill patternType="solid"><fgColor rgb="${BLACK}"/><bgColor indexed="64"/></patternFill></fill>`,
    /* 3 */ `<fill><patternFill patternType="solid"><fgColor rgb="${BAND}"/><bgColor indexed="64"/></patternFill></fill>`,
    /* 4 */ `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>`,
    /* 5 */ `<fill><patternFill patternType="solid"><fgColor rgb="${CHARTREUSE}"/><bgColor indexed="64"/></patternFill></fill>`,
  ];

  const borders = [
    /* 0 */ `<border><left/><right/><top/><bottom/><diagonal/></border>`,
    /* 1 */ `<border><left/><right/><top/><bottom style="thin"><color rgb="${RULE}"/></bottom><diagonal/></border>`,
  ];

  // Order must match S exactly.
  const xfs = [
    `<xf fontId="0" fillId="0" borderId="0" xfId="0"/>`,
    `<xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="2" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="3" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="4" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" horizontal="left" indent="1"/></xf>`,
    `<xf fontId="5" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="5" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="6" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>`,
    `<xf fontId="6" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf>`,
    `<xf fontId="7" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>`,
    `<xf fontId="7" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>`,
    `<xf fontId="8" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="8" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="6" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>`,
    `<xf fontId="6" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>`,
    `<xf fontId="10" fillId="5" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="6" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1" indent="1"/></xf>`,
    `<xf fontId="9" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
    `<xf fontId="9" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${fonts.length}">${fonts.join("")}</fonts>
<fills count="${fills.length}">${fills.join("")}</fills>
<borders count="${borders.length}">${borders.join("")}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>
</styleSheet>`;
}

const COL = ["A", "B", "C", "D", "E", "F", "G"];

function cell(ref: string, text: string, style: number): string {
  if (!text) return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}

function row(r: number, values: string[], stylesFor: number[], height?: number): string {
  const cells = values
    .map((v, i) => cell(`${COL[i]}${r}`, v, stylesFor[i] ?? S.base))
    .join("");
  const h = height ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${r}"${h}>${cells}</row>`;
}

function sheet(week: PlanWeek, athleteName: string): string {
  // A standalone plan carries its own recipient; a client's plan takes the
  // name from the route.
  const athlete = planTitle(week, athleteName);
  const rows: string[] = [];
  let r = 1;

  // ── Masthead. Merged across all seven columns. ─────────────────────────
  rows.push(row(r++, ["SUTH PERFORMANCE"], [S.title], 32));
  rows.push(row(r++, [`${athlete} — ${week.label}`], [S.subtitle], 24));
  rows.push(
    row(
      r++,
      [
        `${week.days[0]?.date} to ${week.days[6]?.date}  ·  ${sessionCount(week)} sessions  ·  ${
          week.runningVolume || "no"
        } running  ·  programmed by Ben Sutherland`,
      ],
      [S.meta],
      18,
    ),
  );
  const mastheadRows = r - 1;

  // ── The note, right under the masthead. HARD-RULES §3 means it exists. ─
  rows.push(row(r++, ["NOTE FOR THE WEEK"], [S.noteLabel], 18));
  const noteRow = r;
  rows.push(row(r++, [week.notes], [S.note], 46));
  rows.push(`<row r="${r++}" ht="8" customHeight="1"/>`);

  // ── Column headings. ───────────────────────────────────────────────────
  const headRow = r;
  rows.push(
    row(
      r++,
      ["DAY", "WHEN", "TYPE", "QTY", "WORK", "EFFORT", "DONE"],
      new Array(7).fill(S.colHead),
      22,
    ),
  );

  // ── One row per line of work. ──────────────────────────────────────────
  let band = false;
  for (const day of week.days) {
    // Banding alternates per DAY, not per row: the point is to show where one
    // day ends and the next begins, which per-row striping actively hides.
    band = !band;
    const dayStyle = band ? S.dayBand : S.day;
    const cellStyle = band ? S.cellBand : S.cell;
    const qtyStyle = band ? S.qtyBand : S.qty;
    const stationStyle = band ? S.stationBand : S.station;
    const doneStyle = band ? S.doneBand : S.done;
    const connectorStyle = band ? S.connectorBand : S.connector;

    const label = `${day.dayName} ${day.date.slice(8)}/${day.date.slice(5, 7)}`;

    if (isRestDay(day)) {
      rows.push(
        row(
          r++,
          [label, "", "Rest", "", "Rest day", "", ""],
          [dayStyle, cellStyle, stationStyle, qtyStyle, cellStyle, cellStyle, doneStyle],
          20,
        ),
      );
      continue;
    }

    let firstOfDay = true;
    for (const slot of ["am", "pm"] as const) {
      const lines = parseSession(day[slot]);
      if (!lines.length) continue;

      lines.forEach((line, i) => {
        // The day is named once per day, not once per line — repeating it
        // fourteen times is what makes a sheet unreadable.
        const dayCell = firstOfDay ? label : "";
        const whenCell = i === 0 ? (slot === "am" ? "Morning" : "Afternoon") : "";
        firstOfDay = false;

        if (line.connector) {
          rows.push(
            row(
              r++,
              [dayCell, whenCell, "", "", line.raw, "", ""],
              [dayStyle, cellStyle, stationStyle, qtyStyle, connectorStyle, cellStyle, doneStyle],
              18,
            ),
          );
          return;
        }

        const kind = classifyLine(line.raw);
        rows.push(
          row(
            r++,
            [
              dayCell,
              whenCell,
              STATION_META[kind].label,
              line.quantity ?? "",
              line.quantity ? line.rest : line.raw,
              line.effort ?? "",
              // A real checkbox character, so the athlete can tick it in the
              // app they already have rather than needing a macro.
              i === 0 ? "☐" : "",
            ],
            [dayStyle, cellStyle, stationStyle, qtyStyle, cellStyle, cellStyle, doneStyle],
            18,
          ),
        );
      });
    }
  }

  const lastRow = r - 1;

  const merges = [
    `<mergeCell ref="A1:G1"/>`,
    `<mergeCell ref="A2:G2"/>`,
    `<mergeCell ref="A3:G3"/>`,
    `<mergeCell ref="A${mastheadRows + 1}:G${mastheadRows + 1}"/>`,
    `<mergeCell ref="A${noteRow}:G${noteRow}"/>`,
  ];

  const cols = [
    `<col min="1" max="1" width="16" customWidth="1"/>`,
    `<col min="2" max="2" width="11" customWidth="1"/>`,
    `<col min="3" max="3" width="18" customWidth="1"/>`,
    `<col min="4" max="4" width="12" customWidth="1"/>`,
    `<col min="5" max="5" width="52" customWidth="1"/>`,
    `<col min="6" max="6" width="10" customWidth="1"/>`,
    `<col min="7" max="7" width="8" customWidth="1"/>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${headRow}" topLeftCell="A${headRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols.join("")}</cols>
<sheetData>${rows.join("")}</sheetData>
<mergeCells count="${merges.length}">${merges.join("")}</mergeCells>
<autoFilter ref="A${headRow}:G${lastRow}"/>
<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0" footer="0"/>
<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}

/** The finished workbook, as bytes. */
export function planWorkbookV2(week: PlanWeek, athlete: string): Uint8Array {
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

export function planFilenameV2(week: PlanWeek, athlete: string): string {
  const named = planTitle(week, athlete);
  const safe =
    named.toLowerCase() === "training plan"
      ? "plan"
      : named.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "plan";
  return `suth-${safe}-${week.weekOf}-v2.xlsx`;
}
