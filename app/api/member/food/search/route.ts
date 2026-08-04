import { NextResponse } from "next/server";
import { searchAllFoods } from "@/lib/member/food-search";

/**
 * Food search, proxied through us rather than called from the browser.
 *
 * Three reasons it is a route and not a fetch from the sheet:
 *
 *  - Open Food Facts asks every client to identify itself in a User-Agent.
 *    A browser will not let us set that header, so a direct call is an
 *    anonymous one, and anonymous callers get rate-limited first.
 *  - The response can be cached here for every member at once. Two hundred
 *    people typing "chicken" is one upstream request, not two hundred.
 *  - The merge with our own curated table happens server-side, so the sheet
 *    receives one ranked list rather than having to interleave two.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const { foods, partial } = await searchAllFoods(q);

  return NextResponse.json(
    { foods, partial },
    {
      headers: {
        /*
         * NEVER CACHE A FAILURE.
         *
         * This header used to be unconditional, and it was the actual bug
         * behind "the food search does not find anything". Open Food Facts
         * rate-limits occasionally; one refused request got cached at the
         * edge for a day, so a search that failed once kept failing for
         * twenty-four hours while an identical search under a different key
         * worked. Proved on production: "weetabix" returned nothing and
         * "Weetabix" returned seventeen results, at the same moment.
         *
         * A successful answer is worth a day — food figures do not change
         * hour to hour, and it keeps us well inside what OFF asks of API
         * users. A failed one is worth nothing and must be retried by the
         * next person who asks.
         */
        "Cache-Control": partial
          ? "no-store"
          : "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
