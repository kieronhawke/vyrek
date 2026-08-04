import { NextResponse } from "next/server";
import { resultsSupabase, hasResultsSupabaseConfig } from "@/lib/results/engine/supabase-client";
import { getDataMode } from "@/lib/results";

/**
 * The suggestion list the browser holds *before* anybody types.
 *
 * Search used to be one network round trip per keystroke. Even a fast one reads
 * as lag, because the thing it is unconsciously compared against is not another
 * website — it is every other search box the visitor uses, which answers while
 * they are still typing.
 *
 * This ships the 5,000 most-looked-up people once, and the palette matches them
 * locally at zero latency. The `/api/results/search` endpoint still runs behind
 * it for everyone else; this only decides what appears *instantly*.
 *
 * ⚠️ Sent as tuples, not objects. The same 5,000 rows as
 * `{"name":…,"slug":…,"nationality":…,"races":…}` cost 176 kB before compression
 * against 61 kB like this, and the keys are identical on every row — a phone on
 * a slow connection pays for them 5,000 times over for no information.
 */

export const runtime = "nodejs";
// Rebuilt after an ingest, not per request. A day at the edge with a week of
// stale-while-revalidate: a visitor never waits for this, and a name that
// arrived overnight is at most a day late to the instant list — it is still
// found immediately by the live search behind it.
export const revalidate = 86400;

type Row = { slug: string; name: string; nationality: string; races: number };

export async function GET() {
  // ⚠️ This is the one search path that does not go through `getResultsSource`.
  //
  // It reads the precomputed table directly, which is right in live mode and
  // silently wrong in demo mode: the palette would suggest real athletes from
  // the ingested database, none of whom exist in the demo dataset, so every
  // suggestion led to a 404. The mode has to be honoured here as everywhere
  // else — the whole point of the switch is that one variable changes the
  // section's data, with nothing reaching past it.
  if (getDataMode() !== "live") {
    return NextResponse.json({ athletes: await popularFromDemo() }, { headers: CACHE });
  }

  if (!hasResultsSupabaseConfig()) {
    return NextResponse.json({ athletes: [] }, { headers: CACHE });
  }

  try {
    const { data, error } = await resultsSupabase()
      .from("results_popular_athletes")
      .select("slug,name,nationality,races")
      .order("rank", { ascending: true })
      .limit(5000);

    if (error) throw new Error(error.message);

    const athletes = ((data ?? []) as Row[]).map(
      (r) => [r.name, r.slug, r.nationality ?? "", r.races] as const,
    );

    return NextResponse.json({ athletes }, { headers: CACHE });
  } catch {
    // An empty list is a complete answer here: the palette falls back to the
    // live search for everything, which is exactly how it behaved before.
    return NextResponse.json({ athletes: [] }, { headers: CACHE });
  }
}

/**
 * The same list, built from the demo dataset.
 *
 * Ranked by race count for the same reason the live one is: the names worth
 * offering instantly are the ones that appear most often.
 */
async function popularFromDemo(): Promise<Array<readonly [string, string, string, number]>> {
  const { demoDataSource } = await import("@/lib/results/demo-source");
  if (!demoDataSource.listPopularAthletes) return [];
  const seen = new Map<string, readonly [string, string, string, number]>();

  // One entry per person, keeping their busiest profile — the same collapse the
  // live query does in SQL.
  for (const a of await demoDataSource.listPopularAthletes(5000)) {
    const key = a.name.toLowerCase();
    const existing = seen.get(key);
    if (!existing || existing[3] < a.raceCount) {
      seen.set(key, [a.name, a.slug, a.countryIso ?? "", a.raceCount] as const);
    }
  }

  return [...seen.values()].sort((x, y) => y[3] - x[3]).slice(0, 5000);
}

const CACHE = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};
