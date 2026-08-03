import { buildWeekIcs, type CalendarSession } from "@/lib/member/ics";
import { weekFor } from "@/lib/member/week";
import { siteUrl } from "@/lib/site-url";

/**
 * `Add this week to your calendar` → this.
 *
 * The row on the plan screen had no link behind it at all, so tapping it did
 * nothing. This is the endpoint it should have been pointing at.
 *
 * Not gated behind `assertMember`. A calendar client fetches this URL on its
 * own schedule, with no browser session and no cookies — gating it would mean
 * the file worked once in the browser and then silently stopped refreshing,
 * which is a worse failure than the one being fixed. The response carries no
 * personal data beyond session titles the athlete already has, and the URL is
 * not discoverable.
 *
 * `Content-Disposition: attachment` so a phone hands it to the calendar app
 * rather than rendering it as text, which is what iOS does otherwise.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = siteUrl();

  const sessions: CalendarSession[] = weekFor().map((day) => ({
    // `weekFor` already returns a URL-safe ISO date as its slug.
    date: day.slug,
    title: day.title,
    type: day.type,
    durationMin: day.durationMin,
    url: `${base}/app/plan/${day.slug}`,
  }));

  const body = buildWeekIcs(sessions, { name: "Suth Performance training" });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="suth-training-week.ics"',
      // Calendar clients re-fetch on their own schedule; a cached week would
      // still be last week's when they do.
      "Cache-Control": "no-store",
    },
  });
}
