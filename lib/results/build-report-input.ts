import "server-only";
import { getResultsSource } from "./index";
import { STATION_IDS, type StationId } from "./model";
import { analysePacing } from "./analysis";
import type { ReportInput, ReportPodiumEntry } from "./report-generator";

/**
 * Assembles the input the report generator needs from the data source.
 *
 * Split from the generator itself so the generator stays a pure function that
 * a live feed can drive unchanged — this is the only part that knows where
 * data comes from.
 *
 * Sampling: the fastest-split and negative-split scans read the top 60 of each
 * headline division rather than the whole field. The weekend's fastest station
 * split is essentially always near the front, and scanning 14,000 results per
 * report would make the page uncacheable in practice.
 */

const SCAN_DEPTH = 60;

/**
 * How deep to pull full results for the station and pacing highlights.
 *
 * Deliberately far shallower than `SCAN_DEPTH`: every one of these is a
 * multi-query read, and a station record is set at the front of the race, not
 * in the fortieth row.
 */
const DETAIL_DEPTH = 10;

export async function buildReportInput(eventSlug: string): Promise<ReportInput | null> {
  const source = getResultsSource();
  const event = await source.getEvent(eventSlug);
  if (!event || event.status !== "finished") return null;

  const divisions: ReportInput["divisions"] = [];
  const fastest = new Map<StationId, ReportInput["fastestStations"][number]>();
  let biggestNegative: ReportInput["biggestNegativeSplit"];
  const standouts: ReportInput["ageGroupStandouts"] = [];

  // ⚠️ Every division's board fetched at once, not one after another.
  //
  // A twelve-division event meant twelve sequential ranking reads before any
  // work started, and a report took the best part of a minute. They do not
  // depend on each other.
  const pages = await Promise.all(
    event.divisions.map((division) =>
      source
        .getRanking(eventSlug, division.divisionCode, { limit: SCAN_DEPTH })
        .then((page) => ({ division, page }))
        .catch(() => ({ division, page: null })),
    ),
  );

  for (const { division, page } of pages) {
    if (!page || page.rows.length === 0) continue;

    const podium: ReportPodiumEntry[] = page.rows.slice(0, 3).map((row) => ({
      rank: row.rank,
      athleteName: row.athleteName,
      athleteSlug: row.athleteSlug,
      resultId: row.id,
      countryIso: row.countryIso,
      finishSeconds: row.finishSeconds,
      gapToLeaderSeconds: row.gapToLeaderSeconds,
    }));

    divisions.push({
      divisionCode: division.divisionCode,
      label: division.label,
      headline: division.headline,
      finisherCount: page.fieldSize,
      podium,
    });

    // A top-20 overall finish from an older age group is a genuine standout.
    for (const row of page.rows.slice(0, 20)) {
      const bracket = Number(row.ageGroup.split("-")[0]);
      if (bracket >= 45) {
        standouts.push({
          athleteName: row.athleteName,
          athleteSlug: row.athleteSlug,
          ageGroup: row.ageGroup,
          divisionLabel: division.label,
          rank: row.rank,
          finishSeconds: row.finishSeconds,
        });
      }
    }

    if (!division.headline) continue;

    // ⚠️ The podium, in parallel — not sixty rows one after another.
    //
    // This walked every one of `SCAN_DEPTH` rows calling `getResult`, and each
    // of those is about six queries: more than seven hundred sequential round
    // trips per event. Report generation did not finish inside ten minutes.
    //
    // What the loop is looking for is the fastest time at each station and the
    // best negative split, and both come from splits — which 21 of 630,287
    // results have. Scanning sixty rows to find them was speculative even when
    // it was fast. The top of the board is where a station record actually
    // lives, so it reads that and says so.
    const details = (
      await Promise.all(
        page.rows.slice(0, DETAIL_DEPTH).map((row) =>
          source.getResult(row.id).then((d) => (d ? { row, detail: d } : null)).catch(() => null),
        ),
      )
    ).filter((x): x is { row: (typeof page.rows)[number]; detail: NonNullable<Awaited<ReturnType<typeof source.getResult>>> } => x !== null);

    for (const { row, detail } of details) {

      for (const station of STATION_IDS) {
        const seconds = detail.stations[station];
        if (seconds <= 0) continue;
        const held = fastest.get(station);
        if (!held || seconds < held.seconds) {
          fastest.set(station, {
            station,
            seconds,
            athleteName: row.athleteName,
            athleteSlug: row.athleteSlug,
            divisionLabel: division.label,
          });
        }
      }

      const pacing = analysePacing(detail.runs);
      if (
        pacing.splitDifferenceSeconds < 0
        && (!biggestNegative
          || pacing.splitDifferenceSeconds < biggestNegative.differenceSeconds)
      ) {
        biggestNegative = {
          athleteName: row.athleteName,
          athleteSlug: row.athleteSlug,
          resultId: row.id,
          divisionLabel: division.label,
          differenceSeconds: pacing.splitDifferenceSeconds,
        };
      }
    }
  }

  standouts.sort((a, b) => a.rank - b.rank);

  return {
    eventName: event.name,
    eventCity: event.city,
    eventSlug: event.slug,
    year: event.year,
    venue: event.venue,
    startDate: event.startDate,
    totalAthletes: event.totalAthletes,
    divisions,
    fastestStations: [...fastest.values()].sort((a, b) => a.seconds - b.seconds),
    biggestNegativeSplit: biggestNegative,
    ageGroupStandouts: standouts,
  };
}
