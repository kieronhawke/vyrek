import { NextResponse } from "next/server";
import { getResultsSource } from "@/lib/results";

/**
 * Search endpoint behind the ⌘K palette and the mobile search sheet.
 *
 * Goes through `getResultsSource()` like everything else, so it keeps working
 * unchanged when a live feed replaces the demo source.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ athletes: [], events: [] });
  }

  try {
    const results = await getResultsSource().searchAll(q);
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { athletes: [], events: [], error: "Search is unavailable" },
      { status: 503 },
    );
  }
}
