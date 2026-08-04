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
        /* Food figures do not change hour to hour. A day at the edge with a
           week of stale-while-revalidate keeps the box instant and keeps us
           well inside what OFF asks of API users. */
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
