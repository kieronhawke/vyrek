import { NextResponse } from "next/server";
import { getResultsSource } from "@/lib/results";
import { parseRankingSlug } from "@/lib/results/slugs";

/**
 * Full division leaderboard in a compact tuple form.
 *
 * Why the whole division in one response, and why tuples: the table sorts,
 * filters and searches 3,000+ rows with zero round trips, which is the single
 * biggest feel difference against the reference site (their filters go back to
 * the server). Tuples rather than objects roughly halves the payload —
 * ~3,200 rows lands around 180KB raw, well under 50KB gzipped.
 *
 * Splits are deliberately excluded. They would triple the payload for data
 * most visitors never open, so they load per row on expand.
 */
export const runtime = "nodejs";

/** [id, rank, ageGroupRank, name, countryIso, ageGroup, finishSeconds] */
export type CompactRow = [string, number, number, string, string, string, number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = parseRankingSlug(slug);
  if (!parsed) {
    return NextResponse.json({ error: "Unknown ranking" }, { status: 404 });
  }

  try {
    const page = await getResultsSource().getRanking(parsed.eventSlug, parsed.division, {
      limit: Number.MAX_SAFE_INTEGER,
    });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rows: CompactRow[] = page.rows.map((r) => [
      r.id, r.rank, r.ageGroupRank, r.athleteName, r.countryIso, r.ageGroup, r.finishSeconds,
    ]);

    return NextResponse.json(
      {
        eventSlug: parsed.eventSlug,
        division: parsed.division,
        divisionLabel: page.divisionLabel,
        leaderTimeSeconds: page.leaderTimeSeconds,
        fieldSize: page.fieldSize,
        rows,
      },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "Ranking unavailable" }, { status: 503 });
  }
}
