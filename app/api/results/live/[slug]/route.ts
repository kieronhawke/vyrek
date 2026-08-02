import { NextResponse } from "next/server";
import { getResultsSource } from "@/lib/results";

/**
 * Top-of-board snapshot for a live event, polled by the LIVE strip.
 *
 * Returns the leading rows of the headline divisions only — the strip is a
 * preview, not a leaderboard, and shipping the whole field every 20 seconds
 * to every viewer would be wasteful.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const source = getResultsSource();

  try {
    const event = await source.getEvent(slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const headline = event.divisions.filter((d) => d.headline).slice(0, 3);
    const boards = await Promise.all(
      headline.map(async (division) => {
        const page = await source.getRanking(slug, division.divisionCode, { limit: 5 });
        return {
          divisionCode: division.divisionCode,
          label: division.label,
          finisherCount: page?.total ?? 0,
          rows: page?.rows ?? [],
        };
      }),
    );

    return NextResponse.json(
      { slug, status: event.status, boards, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Live board unavailable" }, { status: 503 });
  }
}
