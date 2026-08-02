/**
 * Data export — CSV builders.
 *
 * Pure string functions, no DOM, so they are unit-testable and can also run
 * server-side if we ever offer an export endpoint.
 *
 * Nobody else in this space lets you take your data out. Being the product
 * that does is cheap for us and genuinely useful: coaches want a division in a
 * spreadsheet, and athletes want their own history without retyping it.
 *
 * Excel is the reason for the BOM and for CRLF: without a UTF-8 BOM it mangles
 * accented names, and without CRLF some versions put everything on one line.
 */

import { STATION_IDS, STATION_LABEL, type StationId } from "./model";
import { formatTime, formatSplit, nationCode } from "./format";

const BOM = "﻿";
const EOL = "\r\n";

/** RFC 4180 escaping: quote if the value contains a comma, quote or newline. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return BOM + lines.join(EOL) + EOL;
}

/* ─── Ranking / competitor export ─────────────────────────────────── */

export type RankingExportRow = {
  rank: number;
  ageGroupRank: number;
  athleteName: string;
  countryIso: string;
  ageGroup: string;
  finishSeconds: number;
  gapToLeaderSeconds: number;
};

/**
 * A whole division as a spreadsheet. Times appear twice — once formatted for
 * a human reading the file, once in raw seconds so it can be charted or
 * sorted without parsing `1:31:30`.
 */
export function rankingToCsv(
  meta: { eventName: string; divisionLabel: string },
  rows: RankingExportRow[],
): string {
  return toCsv(
    [
      "Rank", "Athlete", "Nationality", "Age group", "Age group rank",
      "Finish", "Finish (seconds)", "Gap to leader", "Gap (seconds)",
      "Event", "Division",
    ],
    rows.map((r) => [
      r.rank,
      r.athleteName,
      nationCode(r.countryIso),
      r.ageGroup,
      r.ageGroupRank || "",
      formatTime(r.finishSeconds),
      r.finishSeconds,
      r.rank === 1 ? "" : formatSplit(r.gapToLeaderSeconds),
      r.rank === 1 ? 0 : r.gapToLeaderSeconds,
      meta.eventName,
      meta.divisionLabel,
    ]),
  );
}

/* ─── Single race, split by split ─────────────────────────────────── */

export type ResultExportInput = {
  athleteName: string;
  eventName: string;
  divisionLabel: string;
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  finishSeconds: number;
  averageRuns: number[];
  averageStations: Record<StationId, number>;
  averageRoxzone: number;
};

/** One row per segment, with the division average and the delta alongside. */
export function resultToCsv(input: ResultExportInput): string {
  const rows: (string | number)[][] = [];

  STATION_IDS.forEach((station, i) => {
    const run = input.runs[i] ?? 0;
    const runAvg = input.averageRuns[i] ?? 0;
    rows.push([
      i + 1, "Run", `Run ${i + 1}`,
      formatSplit(run), run,
      formatSplit(runAvg), runAvg,
      run - runAvg,
    ]);

    const seconds = input.stations[station] ?? 0;
    const avg = input.averageStations[station] ?? 0;
    rows.push([
      i + 1, "Station", STATION_LABEL[station],
      formatSplit(seconds), seconds,
      formatSplit(avg), avg,
      seconds - avg,
    ]);
  });

  rows.push([
    "", "Roxzone", "Roxzone",
    formatSplit(input.roxzoneSeconds), input.roxzoneSeconds,
    formatSplit(input.averageRoxzone), input.averageRoxzone,
    input.roxzoneSeconds - input.averageRoxzone,
  ]);

  rows.push([
    "", "Total", "Finish",
    formatTime(input.finishSeconds), input.finishSeconds,
    "", "", "",
  ]);

  return toCsv(
    [
      "Order", "Type", "Segment",
      "Time", "Time (seconds)",
      "Division average", "Division average (seconds)",
      "Delta (seconds)",
    ],
    rows,
  );
}

/* ─── Athlete history ─────────────────────────────────────────────── */

export type AthleteExportRace = {
  date: string;
  eventCity: string;
  year: number;
  season: string;
  divisionLabel: string;
  rank: number;
  ageGroupRank: number;
  finishSeconds: number;
};

export function athleteHistoryToCsv(name: string, races: AthleteExportRace[]): string {
  return toCsv(
    ["Date", "Event", "Season", "Division", "Finish", "Finish (seconds)", "Rank", "Age group rank", "Athlete"],
    [...races]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((race) => [
        race.date,
        `HYROX ${race.eventCity} ${race.year}`,
        race.season.toUpperCase(),
        race.divisionLabel.replace("HYROX ", ""),
        formatTime(race.finishSeconds),
        race.finishSeconds,
        race.rank || "DNF",
        race.ageGroupRank || "",
        name,
      ]),
  );
}

/** Filesystem-safe filename stem. */
export function exportFilename(...parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
