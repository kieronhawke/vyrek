/**
 * Import real race results.
 *
 *   node scripts/import-results.ts <file.csv> [more.csv ...]
 *   node scripts/import-results.ts --dir ./incoming
 *
 * Reads flat results CSVs (schema in docs/results/DATA-IMPORT.md), validates
 * every row, and writes `data/results-live/` in exactly the shape the app
 * already reads. Nothing else has to change: set NEXT_PUBLIC_DATA_MODE=live
 * and the site serves real data.
 *
 * It never partially writes. If validation finds errors the run aborts and the
 * existing data stays exactly as it was — a half-imported event is worse than
 * no import, because the pages would look fine while being wrong.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ingestCsv, rankDivision, groupByEventAndDivision,
  type IngestedResult, type IngestIssue,
} from "../lib/results/ingest.ts";
import { STATION_IDS, DIVISION_PROFILES } from "../lib/results/model.ts";

const OUT_DIR = join(import.meta.dirname, "..", "data", "results-live");

type Args = { files: string[]; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const files: string[] = [];
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") { dryRun = true; continue; }
    if (arg === "--dir") {
      const dir = resolve(argv[++i] ?? ".");
      for (const entry of readdirSync(dir)) {
        if (entry.toLowerCase().endsWith(".csv")) files.push(join(dir, entry));
      }
      continue;
    }
    files.push(resolve(arg));
  }
  return { files, dryRun };
}

function report(issues: IngestIssue[]) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  for (const issue of errors.slice(0, 25)) {
    console.error(`  ✗ row ${issue.row}  ${issue.field}: ${issue.message}`);
  }
  if (errors.length > 25) console.error(`  … and ${errors.length - 25} more errors`);

  // Warnings are summarised, not listed: an event where every row lacks splits
  // would otherwise print thousands of identical lines.
  if (warnings.length > 0) {
    console.warn(`  ⚠ ${warnings.length} row(s) with incomplete splits — kept, but their analysis pages will be thin`);
  }
  return errors.length;
}

const DIVISION_LABEL = new Map(DIVISION_PROFILES.map((p) => [p.code as string, p.label]));

function main() {
  const { files, dryRun } = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    console.error("Usage: node scripts/import-results.ts <file.csv> [...]  |  --dir <folder>  [--dry-run]");
    process.exit(1);
  }

  const all: IngestedResult[] = [];
  const meta = new Map<string, { name: string; city: string; country: string; date: string; venue: string; status: string }>();
  let errorCount = 0;

  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`✗ not found: ${file}`);
      errorCount++;
      continue;
    }
    const text = readFileSync(file, "utf8");
    console.log(`\n${file}`);
    const result = ingestCsv(text);
    errorCount += report(result.issues);
    console.log(`  ${result.results.length} row(s) accepted, ${result.rejected} rejected`);
    all.push(...result.results);

    // Event metadata rides on the same rows; first non-empty value wins.
    const rows = text.split(/\r?\n/);
    const header = (rows[0] ?? "").split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const col = (name: string) => header.indexOf(name);
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].split(",");
      const slug = (cells[col("event_slug")] ?? "").trim();
      if (!slug || meta.has(slug)) continue;
      meta.set(slug, {
        name: (cells[col("event_name")] ?? "").trim() || slug,
        city: (cells[col("event_city")] ?? "").trim() || slug,
        country: (cells[col("event_country")] ?? "").trim() || "",
        date: (cells[col("event_date")] ?? "").trim() || "",
        venue: (cells[col("event_venue")] ?? "").trim() || "",
        status: (cells[col("event_status")] ?? "").trim() || "finished",
      });
    }
  }

  if (errorCount > 0) {
    console.error(`\n✗ ${errorCount} error(s). Nothing written — fix the rows above and run again.`);
    process.exit(1);
  }
  if (all.length === 0) {
    console.error("\n✗ No valid rows. Nothing written.");
    process.exit(1);
  }

  const grouped = groupByEventAndDivision(all);

  if (dryRun) {
    console.log(`\n✓ Dry run: ${all.length} results across ${grouped.size} event(s). Nothing written.`);
    for (const [slug, divisions] of grouped) {
      console.log(`  ${slug}: ${[...divisions.keys()].length} division(s), ${[...divisions.values()].reduce((n, d) => n + d.length, 0)} results`);
    }
    return;
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const eventIndex: unknown[] = [];
  const athleteRaces = new Map<string, { slug: string; name: string; countryIso: string; races: unknown[] }>();
  let total = 0;

  for (const [eventSlug, divisions] of grouped) {
    const info = meta.get(eventSlug) ?? { name: eventSlug, city: eventSlug, country: "", date: "", venue: "", status: "finished" };
    const results: Record<string, unknown[]> = {};
    const divisionIndex: unknown[] = [];
    let athletes = 0;

    for (const [division, rows] of divisions) {
      const ranked = rankDivision(rows);
      results[division] = ranked.map((r, i) => ({
        id: `${eventSlug}-${division}-${i + 1}`,
        eventSlug, division,
        athleteSlug: r.athleteSlug, athleteName: r.athleteName,
        countryIso: r.countryIso, ageGroup: r.ageGroup,
        rank: r.rank, ageGroupRank: r.ageGroupRank,
        finishSeconds: r.finishSeconds,
        runs: r.runs,
        stations: r.stations,
        roxzoneSeconds: r.roxzoneSeconds,
        status: "finished",
      }));

      for (const r of ranked) {
        if (!athleteRaces.has(r.athleteSlug)) {
          athleteRaces.set(r.athleteSlug, { slug: r.athleteSlug, name: r.athleteName, countryIso: r.countryIso, races: [] });
        }
        athleteRaces.get(r.athleteSlug)!.races.push({
          eventSlug, eventCity: info.city, season: "", year: Number(info.date.slice(0, 4)) || 0,
          date: info.date, division, divisionLabel: DIVISION_LABEL.get(division) ?? division,
          rank: r.rank, ageGroupRank: r.ageGroupRank, finishSeconds: r.finishSeconds,
          resultId: `${eventSlug}-${division}-${r.rank}`,
        });
      }

      const leader = ranked[0];
      divisionIndex.push({
        divisionCode: division,
        label: DIVISION_LABEL.get(division) ?? division,
        headline: DIVISION_PROFILES.find((p) => p.code === division)?.headline ?? false,
        athleteCount: ranked.length,
        finisherCount: ranked.length,
        leaderTimeSeconds: leader?.finishSeconds,
        leaderAthleteSlug: leader?.athleteSlug,
        leaderAthleteName: leader?.athleteName,
        waves: [],
      });
      athletes += ranked.length;
      total += ranked.length;
    }

    writeFileSync(join(OUT_DIR, `event-${eventSlug}.json`), JSON.stringify({ slug: eventSlug, results }));
    eventIndex.push({
      slug: eventSlug, season: "", year: Number(info.date.slice(0, 4)) || 0,
      name: info.name, city: info.city, iata: "", country: info.country,
      countryIso: (info.country || "gb").toLowerCase().slice(0, 2), region: "",
      venue: info.venue, startDate: info.date, endDate: info.date,
      status: info.status, totalAthletes: athletes, divisions: divisionIndex,
    });
  }

  writeFileSync(join(OUT_DIR, "events.json"), JSON.stringify(eventIndex));
  writeFileSync(
    join(OUT_DIR, "athletes.json"),
    JSON.stringify([...athleteRaces.values()].map((a) => ({
      slug: a.slug, name: a.name, countryIso: a.countryIso,
      gender: "men", ageGroup: "unknown", isPlaceholder: false,
      raceCount: a.races.length, races: a.races,
    }))),
  );

  // Reference splits, so the simulator and percentile tool work on real data.
  const references = buildReferences(grouped);
  writeFileSync(join(OUT_DIR, "references.json"), JSON.stringify(references));
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify({
    source: "import", importedFrom: files, events: eventIndex.length, results: total,
  }, null, 2));

  console.log(`\n✓ ${total.toLocaleString()} results across ${eventIndex.length} event(s) → data/results-live/`);
  console.log("  Set NEXT_PUBLIC_DATA_MODE=live and rebuild to serve them.");
}

function buildReferences(grouped: Map<string, Map<string, IngestedResult[]>>) {
  const byDivision = new Map<string, IngestedResult[]>();
  for (const divisions of grouped.values()) {
    for (const [division, rows] of divisions) {
      if (!byDivision.has(division)) byDivision.set(division, []);
      byDivision.get(division)!.push(...rows);
    }
  }

  const med = (xs: number[]) => {
    const valid = xs.filter((x) => x > 0).sort((a, b) => a - b);
    return valid.length ? valid[Math.floor(valid.length / 2)] : 0;
  };
  const at = (sorted: number[], p: number) => {
    if (!sorted.length) return 0;
    const pos = ((100 - p) / 100) * (sorted.length - 1);
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return Math.round(lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
  };

  return [...byDivision.entries()].map(([division, rows]) => {
    const finishes = rows.map((r) => r.finishSeconds).sort((a, b) => a - b);
    const stations: Record<string, number> = {};
    for (const station of STATION_IDS) {
      stations[station] = med(rows.map((r) => r.stations[station] ?? 0));
    }
    return {
      division,
      label: DIVISION_LABEL.get(division) ?? division,
      stations,
      runs: Array.from({ length: 8 }, (_, i) => med(rows.map((r) => r.runs[i] ?? 0))),
      roxzoneSeconds: med(rows.map((r) => r.roxzoneSeconds)),
      medianFinishSeconds: at(finishes, 50),
      finishBreakpoints: [99, 95, 90, 75, 50, 25, 10].map((p) => at(finishes, p)),
      sampleSize: finishes.length,
    };
  });
}

main();
