/**
 * Real-data ingestion.
 *
 * Turns a flat CSV of race results into the same sharded shape the app already
 * reads, so switching from demo to real data is a data-loading job rather than
 * a rewrite. Pure functions — no filesystem, no network — so every rule here is
 * unit-tested.
 *
 * The CSV is deliberately the *flattest possible* format: one row per athlete
 * per race, with a column per segment. That is what timing companies export and
 * what a spreadsheet can produce, so nobody has to write a transformer to get
 * their first real event in.
 *
 * Required columns (case-insensitive, order-independent):
 *   event_slug, event_name, event_city, event_country, event_date,
 *   division, athlete_name, finish
 * Optional but strongly wanted:
 *   nationality, age_group, run_1..run_8, ski_erg, sled_push, sled_pull,
 *   burpee_broad_jump, row, farmers_carry, sandbag_lunges, wall_balls, roxzone
 *
 * Times accept mm:ss, h:mm:ss, or plain seconds.
 */

import { STATION_IDS, type StationId } from "./model.ts";
import { slugify } from "./rng.ts";

export type IngestIssue = {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type IngestedResult = {
  /** `dnf` rows carry no finish time and are excluded from ranking. */
  status: "finished" | "dnf";
  eventSlug: string;
  division: string;
  athleteName: string;
  athleteSlug: string;
  countryIso: string;
  ageGroup: string;
  finishSeconds: number;
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
};

export type IngestReport = {
  results: IngestedResult[];
  issues: IngestIssue[];
  /** Rows dropped because a required field was missing or unparseable. */
  rejected: number;
  /** Rows kept but missing split detail. */
  withoutSplits: number;
};

/* ─── Time parsing ────────────────────────────────────────────────── */

/** Markers a timing export uses for someone who did not finish. */
const NON_FINISH = /^(dnf|dns|dq|dqf|withdrawn|-|—)$/i;

export function isNonFinishMarker(raw: string | undefined | null): boolean {
  return NON_FINISH.test(String(raw ?? "").trim());
}

/**
 * Accepts `1:31:30`, `91:30`, `5:56`, `356`, and `00:05:56`.
 * Returns null rather than guessing when the shape is unrecognisable —
 * silently turning bad input into a number is how a leaderboard ends up with a
 * 42-minute run split.
 */
export function parseTime(raw: string | undefined | null): number | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === "" || NON_FINISH.test(text)) return null;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const seconds = Math.round(Number(text));
    return seconds > 0 ? seconds : null;
  }

  const parts = text.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d{1,2}(\.\d+)?$/.test(p.trim()))) return null;

  const numbers = parts.map((p) => Number(p));
  const seconds = parts.length === 3
    ? numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    : numbers[0] * 60 + numbers[1];

  return seconds > 0 ? Math.round(seconds) : null;
}

/* ─── CSV parsing ─────────────────────────────────────────────────── */

/** RFC 4180 reader: handles quoted fields, embedded commas and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  // Strip a UTF-8 BOM, which Excel writes and which otherwise corrupts the
  // first header name.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\r") continue;
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += char;
  }

  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const STATION_COLUMN: Record<StationId, string> = {
  "ski-erg": "ski_erg",
  "sled-push": "sled_push",
  "sled-pull": "sled_pull",
  "burpee-broad-jump": "burpee_broad_jump",
  "row": "row",
  "farmers-carry": "farmers_carry",
  "sandbag-lunges": "sandbag_lunges",
  "wall-balls": "wall_balls",
};

const REQUIRED = ["event_slug", "division", "athlete_name", "finish"];

/**
 * Parse a results CSV into validated rows.
 *
 * Rows with a missing required field are rejected and reported, never guessed
 * at. Rows missing split columns are kept — a finish time alone is still a
 * result — but flagged so the operator knows the analysis pages will be thin.
 */
export function ingestCsv(text: string): IngestReport {
  const rows = parseCsv(text);
  const issues: IngestIssue[] = [];
  const results: IngestedResult[] = [];

  if (rows.length < 2) {
    return { results: [], issues: [{ row: 0, field: "file", message: "No data rows found", severity: "error" }], rejected: 0, withoutSplits: 0 };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const index = (name: string) => header.indexOf(name);

  for (const column of REQUIRED) {
    if (index(column) === -1) {
      issues.push({ row: 0, field: column, message: `Missing required column "${column}"`, severity: "error" });
    }
  }
  if (issues.some((i) => i.severity === "error")) {
    return { results: [], issues, rejected: rows.length - 1, withoutSplits: 0 };
  }

  let rejected = 0;
  let withoutSplits = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (name: string) => {
      const i = index(name);
      return i === -1 ? "" : (cells[i] ?? "").trim();
    };

    const eventSlug = get("event_slug");
    const division = get("division");
    const athleteName = get("athlete_name");
    const finishSeconds = parseTime(get("finish"));

    if (!eventSlug || !division || !athleteName) {
      issues.push({ row: r + 1, field: "required", message: "Missing event, division or athlete name", severity: "error" });
      rejected++;
      continue;
    }
    // A DNF is a real result, not a broken row. Real exports are full of them,
    // and rejecting the file over one would make the importer unusable on any
    // actual event. Garbage in the finish column is still an error.
    const rawFinish = get("finish");
    const didNotFinish = isNonFinishMarker(rawFinish);

    if (finishSeconds === null && !didNotFinish) {
      issues.push({ row: r + 1, field: "finish", message: `Unreadable finish time "${rawFinish}"`, severity: "error" });
      rejected++;
      continue;
    }

    const runs: number[] = [];
    for (let i = 1; i <= 8; i++) {
      const value = parseTime(get(`run_${i}`));
      if (value !== null) runs.push(value);
    }

    const stations = {} as Record<StationId, number>;
    let stationCount = 0;
    for (const station of STATION_IDS) {
      const value = parseTime(get(STATION_COLUMN[station]));
      stations[station] = value ?? 0;
      if (value !== null) stationCount++;
    }

    const roxzoneSeconds = parseTime(get("roxzone")) ?? 0;

    if (didNotFinish) {
      results.push({
        status: "dnf",
        eventSlug, division, athleteName,
        athleteSlug: slugify(athleteName),
        countryIso: (get("nationality") || "gb").toLowerCase().slice(0, 2),
        ageGroup: get("age_group") || "unknown",
        finishSeconds: 0, runs: [], stations: {} as Record<StationId, number>, roxzoneSeconds: 0,
      });
      continue;
    }

    // Unreachable with a null finish: it was either rejected above or returned
    // as a DNF. Narrowed explicitly so the type reflects that.
    if (finishSeconds === null) continue;

    if (runs.length !== 8 || stationCount !== 8) {
      withoutSplits++;
      issues.push({
        row: r + 1,
        field: "splits",
        message: `Incomplete splits (${runs.length}/8 runs, ${stationCount}/8 stations) — the result is kept but its analysis will be limited`,
        severity: "warning",
      });
    }

    results.push({
      status: "finished",
      eventSlug,
      division,
      athleteName,
      athleteSlug: slugify(athleteName),
      countryIso: (get("nationality") || "gb").toLowerCase().slice(0, 2),
      ageGroup: get("age_group") || "unknown",
      finishSeconds,
      runs,
      stations,
      roxzoneSeconds,
    });
  }

  return { results, issues, rejected, withoutSplits };
}

/**
 * Rank a division's results and assign age-group ranks.
 *
 * Ranking is done here, not taken from the file: source exports disagree about
 * how to rank DNFs and ties, and the whole section assumes rank 1 is the
 * fastest finisher. Deriving it makes that guaranteed.
 */
export function rankDivision(results: IngestedResult[]): (IngestedResult & {
  rank: number;
  ageGroupRank: number;
})[] {
  // DNFs never enter the ranking — rank 1 must mean fastest finisher.
  const sorted = results
    .filter((r) => r.status === "finished" && r.finishSeconds > 0)
    .sort((a, b) => a.finishSeconds - b.finishSeconds);
  const ageCounters = new Map<string, number>();

  return sorted.map((result, i) => {
    const ageGroupRank = (ageCounters.get(result.ageGroup) ?? 0) + 1;
    ageCounters.set(result.ageGroup, ageGroupRank);
    return { ...result, rank: i + 1, ageGroupRank };
  });
}

/** Groups ingested rows into `{ eventSlug: { division: rows } }`. */
export function groupByEventAndDivision(
  results: IngestedResult[],
): Map<string, Map<string, IngestedResult[]>> {
  const events = new Map<string, Map<string, IngestedResult[]>>();
  for (const result of results) {
    if (!events.has(result.eventSlug)) events.set(result.eventSlug, new Map());
    const divisions = events.get(result.eventSlug)!;
    if (!divisions.has(result.division)) divisions.set(result.division, []);
    divisions.get(result.division)!.push(result);
  }
  return events;
}
