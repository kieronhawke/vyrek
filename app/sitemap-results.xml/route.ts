import { getResultsSource, getDataMode } from "@/lib/results";
import { buildRankingSlug } from "@/lib/results/slugs";
import { siteUrl } from "@/lib/site-url";
import { STATIONS } from "@/lib/hyrox-stations";

/**
 * Sitemap for the Results section.
 *
 * Kept separate from `app/sitemap.ts` rather than merged into it: that file is
 * shared across lanes (VYREK-LANES.md §3) and this section adds thousands of
 * URLs on its own schedule. `robots.ts` lists both.
 *
 * **Individual result pages are deliberately excluded.** There are ~75,000 of
 * them; they are thin by nature, near-duplicate in template, and every one is
 * reachable in two clicks from its ranking. Submitting 75,000 URLs to earn
 * crawl budget for pages we do not want ranked individually is how a site
 * teaches Google to ignore its sitemap. Rankings and athletes are the pages
 * that should rank, and those are all here.
 */

export const revalidate = 3600;

const MAX_ATHLETES = 2000;

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

export async function GET() {
  // The section is noindex while the data is synthetic (see the Results
  // layout), so submitting these URLs would contradict that.
  if (getDataMode() === "demo") {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n`
      + `<!-- Results run on demo data and are noindex. This sitemap fills in `
      + `when NEXT_PUBLIC_DATA_MODE=live. -->\n`
      + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=300" } },
    );
  }

  const base = siteUrl();
  const source = getResultsSource();
  const events = await source.listEvents();

  const entries: string[] = [];

  // Hubs and tools.
  entries.push(urlEntry(`${base}/results`, "daily", "0.9"));
  entries.push(urlEntry(`${base}/events`, "weekly", "0.8"));
  entries.push(urlEntry(`${base}/rankings`, "weekly", "0.7"));
  entries.push(urlEntry(`${base}/rankings/world-records`, "weekly", "0.7"));
  entries.push(urlEntry(`${base}/rankings/season-bests`, "weekly", "0.7"));
  entries.push(urlEntry(`${base}/simulator`, "monthly", "0.8"));
  entries.push(urlEntry(`${base}/results/compare`, "monthly", "0.6"));
  entries.push(urlEntry(`${base}/tools/good-hyrox-time`, "monthly", "0.8"));

  // Regional calendars — real URLs that server-render.
  for (const region of ["Europe", "Asia"]) {
    entries.push(urlEntry(`${base}/events?region=${encodeURIComponent(region)}`, "weekly", "0.5"));
  }
  for (const season of [...new Set(events.map((e) => e.season))]) {
    entries.push(urlEntry(`${base}/events?season=${season}`, "weekly", "0.5"));
  }

  // Events, their start lists, and every division ranking.
  for (const event of events) {
    const freq = event.status === "live" ? "hourly"
      : event.status === "upcoming" ? "daily" : "monthly";
    entries.push(urlEntry(`${base}/event/${event.slug}`, freq, "0.8", event.endDate));
    entries.push(urlEntry(`${base}/starters/${event.slug}`, freq, "0.5", event.endDate));

    const detail = await source.getEvent(event.slug);
    for (const division of detail?.divisions ?? []) {
      entries.push(urlEntry(
        `${base}/ranking/${buildRankingSlug(event.slug, division.divisionCode)}`,
        freq,
        "0.7",
        event.endDate,
      ));
    }
  }

  // Station guides, which live at their existing path (DECISIONS.md D9).
  entries.push(urlEntry(`${base}/hyrox/stations`, "monthly", "0.7"));
  for (const station of STATIONS) {
    entries.push(urlEntry(`${base}/hyrox/stations/${station.slug}`, "monthly", "0.7"));
  }

  // Athletes, most-raced first. Capped: a profile with one race is a thin page
  // and does not deserve crawl budget.
  const athletes = await collectAthletes(events.map((e) => e.slug));
  for (const slug of athletes.slice(0, MAX_ATHLETES)) {
    entries.push(urlEntry(`${base}/athlete/${slug}`, "monthly", "0.5"));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

/** Athlete slugs ordered by race count, so the cap keeps the ones worth indexing. */
async function collectAthletes(eventSlugs: string[]): Promise<string[]> {
  const source = getResultsSource();
  const counts = new Map<string, number>();

  for (const slug of eventSlugs) {
    const event = await source.getEvent(slug);
    for (const division of event?.divisions ?? []) {
      const page = await source.getRanking(slug, division.divisionCode, { limit: 400 });
      for (const row of page?.rows ?? []) {
        counts.set(row.athleteSlug, (counts.get(row.athleteSlug) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
}
