import { NextResponse } from "next/server";
import { resultsSupabase, hasResultsSupabaseConfig } from "@/lib/results/engine/supabase-client";

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

const CACHE = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};
