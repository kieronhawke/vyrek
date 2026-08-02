import { NextResponse } from "next/server";
import { getResultsSource } from "@/lib/results";
import { STATION_IDS } from "@/lib/results/model";

/**
 * Splits for one race, used by inline row expansion on the ranking table.
 *
 * Kept minimal — the full analysis lives on /result/{id}. This is just enough
 * to draw the mini split bars without a page navigation, which is the thing
 * the reference site makes you leave the leaderboard for.
 */
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await getResultsSource().getResult(id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(
      {
        id: result.id,
        runs: result.runs,
        stations: STATION_IDS.map((s) => result.stations[s] ?? 0),
        roxzoneSeconds: result.roxzoneSeconds,
        finishSeconds: result.finishSeconds,
        averageRuns: result.divisionAverage.runs,
        averageStations: STATION_IDS.map((s) => result.divisionAverage.stations[s] ?? 0),
        averageRoxzone: result.divisionAverage.roxzone,
      },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
