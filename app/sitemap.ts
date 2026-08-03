import type { MetadataRoute } from "next";
import { PROGRAMMES } from "@/lib/programmes";
import { listPostMeta, CATEGORIES } from "@/lib/blog/posts";
import { AUTHORS } from "@/lib/blog/authors";
import { UK_LOCATIONS, listRegionSlugs, listCountySlugs } from "@/lib/uk-locations";
import { getGeoSeo, geoPriority, isRaceCity } from "@/lib/locations/seo";
import { RACE_CITIES, listCountrySlugs } from "@/lib/race-cities";
import { US_STATES } from "@/lib/us-states";
import { FOCUS_CITIES } from "@/lib/focus-cities";
import { STATIONS } from "@/lib/hyrox-stations";
import { PLAN_TEMPLATES } from "@/lib/plan-templates";
import { COMPARISONS } from "@/lib/hyrox-comparisons";
import { upcoming as upcomingRaces } from "@/lib/hyrox/races";
import { GEAR_GUIDES } from "@/lib/hyrox-gear";
import { TOPIC_HUBS } from "@/lib/topic-hubs";

import { siteUrl as canonicalSiteUrl } from "@/lib/site-url";
const SITE_URL = canonicalSiteUrl();

/**
 * The geo templates carry no per-location content date, so stamping them with
 * `new Date()` made the sitemap claim every geo URL had changed on every
 * build. A sitemap that cries wolf gets its `lastmod` ignored, which is the
 * opposite of what it is for. Until locations carry their own `verifiedOn`
 * dates (phase D), this is a hand-maintained stamp: bump it when the geo
 * templates or their copy change materially, not when the build runs.
 *
 * Bumped 2026-08-02: the geo programme went from 94 hand-typed locations to
 * 1,882 sourced ones, with new region and county directory layers and rewritten
 * town copy. Every geo URL in this file genuinely did change on that date.
 */
const GEO_CONTENT_UPDATED = new Date("2026-08-02T00:00:00Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /**
   * Five posts carry `publishedAt` dates weeks ahead (the drip schedule in
   * docs/content-plan/publishing-schedule.md), but nothing filters them, so
   * they are live today with a future date. A `lastmod` in the future is
   * treated as untrustworthy and can get the whole file's dates ignored, so
   * clamp to now. This is the symptom, not the cause: see the note in that
   * schedule doc about whether future-dated posts should publish at all.
   */
  const notInFuture = (d: Date) => (d.getTime() > now.getTime() ? now : d);

  /**
   * ONLY INDEXABLE URLS BELONG IN HERE.
   *
   * app/layout.tsx sets `robots: { index: false, follow: false }` as the
   * sitewide default, and individual routes opt back in with
   * `robots: { index: true, follow: true }` in their own generateMetadata.
   * The marketing pages have not opted in yet, so on 2026-08-02 this file was
   * submitting nine URLs that serve `noindex`: /, /quiz, /programmes,
   * /how-it-works, /pricing, /about, /contact, /press and /account/refer
   * (that last one is also Disallow'd in robots.txt), plus the four /legal
   * pages.
   *
   * Submitting a noindex URL is a contradiction: the sitemap says "index
   * this", the page says "do not". Search Console reports it as an error
   * ("Submitted URL marked noindex") and it spends crawl budget on pages that
   * can never rank.
   *
   * When the noindex switch is flipped for the marketing pages, add them back
   * here in the same move. The two have to change together.
   */
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/blog`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/press/brand-guidelines`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    // Programmatic hubs
    { url: `${SITE_URL}/hyrox`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/hyrox/guide`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/hyrox/doubles`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/hyrox/nutrition`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/hyrox-vs`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/hyrox/workouts`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/hyrox/stations`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE_URL}/hyrox/events`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/hyrox/gear`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/plans`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/compare`, lastModified: now, priority: 0.7, changeFrequency: "monthly" },
    { url: `${SITE_URL}/tools`, lastModified: now, priority: 0.7, changeFrequency: "monthly" },
    { url: `${SITE_URL}/topics`, lastModified: now, priority: 0.8, changeFrequency: "weekly" },
    // The four /legal pages are omitted deliberately: they serve noindex, and
    // legal boilerplate is not content anyone searches for. See the note above.
  ];

  // Query-string and anchor variants of canonical pages were removed from
  // the sitemap on 2026-05-26: Google treats `/quiz?program=first-race`
  // and `/programmes#first-race` as the same URL as their canonical
  // parent, so listing them only adds noise and dilutes crawl budget.
  // Bring them back if per-programme detail pages ship under
  // /programmes/[slug] (each gets its own canonical URL then).

  const posts = await listPostMeta();
  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: notInFuture(new Date(p.updatedAt ?? p.publishedAt)),
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  // A listing page is only as fresh as the newest post on it, so derive the
  // stamp rather than claiming it changed on this build.
  const newestIn = (match: (p: (typeof posts)[number]) => boolean) => {
    const dates = posts
      .filter(match)
      .map((p) => new Date(p.updatedAt ?? p.publishedAt).getTime());
    return dates.length
      ? notInFuture(new Date(Math.max(...dates)))
      : GEO_CONTENT_UPDATED;
  };

  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(CATEGORIES).map(
    (slug) => ({
      url: `${SITE_URL}/blog/category/${slug}`,
      lastModified: newestIn((p) => p.category === slug),
      priority: 0.5,
      changeFrequency: "weekly",
    }),
  );

  const authorRoutes: MetadataRoute.Sitemap = Object.keys(AUTHORS).map(
    (slug) => ({
      url: `${SITE_URL}/blog/author/${slug}`,
      lastModified: newestIn((p) => p.author?.slug === slug),
      priority: 0.4,
      changeFrequency: "monthly",
    }),
  );

  // ── Programmatic SEO routes ────────────────────────────────────
  // A sitemap is a list of pages we want indexed, so it has to agree with the
  // robots tag. Only the five race cities keep a /hyrox/{city} page; the other
  // 89 now 308 to their coaching page, and listing a redirect here would be a
  // contradictory signal. Same rule below for the unevidenced locations.
  const cityRoutes: MetadataRoute.Sitemap = UK_LOCATIONS.filter((loc) =>
    isRaceCity(loc.slug),
  ).map((loc) => ({
    url: `${SITE_URL}/hyrox/${loc.slug}`,
    lastModified: GEO_CONTENT_UPDATED,
    priority: 0.7,
    changeFrequency: "weekly",
  }));

  // Conversion landing pages: two variants per location plus their hubs.
  const geoLandingRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/hyrox-training`, lastModified: GEO_CONTENT_UPDATED, priority: 0.8, changeFrequency: "weekly" as const },
    { url: `${SITE_URL}/personal-trainer`, lastModified: GEO_CONTENT_UPDATED, priority: 0.8, changeFrequency: "weekly" as const },
    // Region directories: the middle layer between the hubs and 846 towns.
    ...listRegionSlugs().flatMap((r) => [
      { url: `${SITE_URL}/hyrox-training/in/${r}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.7, changeFrequency: "weekly" as const },
      { url: `${SITE_URL}/personal-trainer/in/${r}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.7, changeFrequency: "weekly" as const },
    ]),
    // County directories: "personal trainer kent" and friends are evidenced
    // queries that no single town page answers.
    ...listCountySlugs().flatMap((c) => [
      { url: `${SITE_URL}/hyrox-training/county/${c}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.7, changeFrequency: "weekly" as const },
      { url: `${SITE_URL}/personal-trainer/county/${c}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.7, changeFrequency: "weekly" as const },
    ]),
    ...UK_LOCATIONS.filter((loc) => getGeoSeo(loc.slug).indexable).flatMap((loc) => [
      {
        url: `${SITE_URL}/hyrox-training/${loc.slug}`,
        lastModified: GEO_CONTENT_UPDATED,
        priority: geoPriority(loc.slug),
        changeFrequency: "weekly" as const,
      },
      {
        url: `${SITE_URL}/personal-trainer/${loc.slug}`,
        lastModified: GEO_CONTENT_UPDATED,
        priority: geoPriority(loc.slug),
        changeFrequency: "weekly" as const,
      },
    ]),
    // Country directories for the international race cities: the same middle
    // layer regions give the UK set.
    ...listCountrySlugs().flatMap((c) => [
      { url: `${SITE_URL}/hyrox-training/country/${c}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.7, changeFrequency: "weekly" as const },
      { url: `${SITE_URL}/personal-trainer/country/${c}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.7, changeFrequency: "weekly" as const },
    ]),
    /* Focus cities: markets we target that carry no race. Dubai is the first,
       and it carries the in-person offer, which is why it sits at hub priority
       rather than town priority. */
    ...FOCUS_CITIES.flatMap((c) => [
      { url: `${SITE_URL}/hyrox-training/${c.slug}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.8, changeFrequency: "weekly" as const },
      { url: `${SITE_URL}/personal-trainer/${c.slug}`, lastModified: GEO_CONTENT_UPDATED, priority: 0.8, changeFrequency: "weekly" as const },
    ]),
    /* The 51 US state pages. Priority sits with the UK towns rather than the
       race cities: a state is a broader query than a city, and the ones that
       host a race link down to the city page anyway. */
    ...US_STATES.flatMap((st) => [
      {
        url: `${SITE_URL}/hyrox-training/state/${st.slug}`,
        lastModified: GEO_CONTENT_UPDATED,
        priority: st.races.length ? 0.8 : 0.7,
        changeFrequency: "weekly" as const,
      },
      {
        url: `${SITE_URL}/personal-trainer/state/${st.slug}`,
        lastModified: GEO_CONTENT_UPDATED,
        priority: st.races.length ? 0.8 : 0.7,
        changeFrequency: "weekly" as const,
      },
    ]),
    /* Every city that has hosted a HYROX outside the UK. Priority sits above
       an unevidenced UK town: these carry a race, a venue and a date, which is
       more than a 5,000-person town with a parkrun and nothing else. */
    ...RACE_CITIES.flatMap((c) => [
      {
        url: `${SITE_URL}/hyrox-training/${c.slug}`,
        lastModified: GEO_CONTENT_UPDATED,
        priority: 0.8,
        changeFrequency: "weekly" as const,
      },
      {
        url: `${SITE_URL}/personal-trainer/${c.slug}`,
        lastModified: GEO_CONTENT_UPDATED,
        priority: 0.8,
        changeFrequency: "weekly" as const,
      },
    ]),
  ];

  const stationRoutes: MetadataRoute.Sitemap = STATIONS.map((s) => ({
    url: `${SITE_URL}/hyrox/stations/${s.slug}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "monthly",
  }));

  const planTemplateRoutes: MetadataRoute.Sitemap = PLAN_TEMPLATES.map((p) => ({
    url: `${SITE_URL}/plans/${p.slug}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "monthly",
  }));

  const comparisonRoutes: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${SITE_URL}/compare/${c.slug}`,
    lastModified: now,
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const toolRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/tools/pace-calculator`,
      lastModified: now,
      priority: 0.7,
      changeFrequency: "monthly",
    },
  ];

  /**
   * The real race calendar, not the four placeholder events. Only upcoming
   * races: a page for a race that has already happened is not something we
   * want crawled, and the source data is not re-fetched often enough to keep
   * historic pages honest.
   */
  const eventRoutes: MetadataRoute.Sitemap = upcomingRaces().map((race) => ({
    url: `${SITE_URL}/hyrox/events/${race.slug}`,
    lastModified: now,
    // UK and Ireland races are the ones we can actually rank for.
    priority:
      race.country === "United Kingdom" || race.country === "Ireland" ? 0.8 : 0.5,
    changeFrequency: "weekly",
  }));

  const gearRoutes: MetadataRoute.Sitemap = GEAR_GUIDES.map((g) => ({
    url: `${SITE_URL}/hyrox/gear/${g.slug}`,
    lastModified: now,
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const topicRoutes: MetadataRoute.Sitemap = TOPIC_HUBS.map((t) => ({
    url: `${SITE_URL}/topics/${t.slug}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "weekly",
  }));

  return [
    ...staticRoutes,
    ...postRoutes,
    ...categoryRoutes,
    ...authorRoutes,
    ...cityRoutes,
    ...geoLandingRoutes,
    ...stationRoutes,
    ...planTemplateRoutes,
    ...comparisonRoutes,
    ...toolRoutes,
    ...eventRoutes,
    ...gearRoutes,
    ...topicRoutes,
  ];
}
