/**
 * City hubs.
 *
 * HYROX returns to the same cities season after season, and the query people
 * actually type is "hyrox london results" — not the slug of one edition. A
 * city hub is the page that answers it, and it is also the page that collects
 * every edition's link equity in one place instead of spreading it across
 * twelve orphaned event pages.
 *
 * The competitor ships one of these per city at 226 words: an h1, a list of
 * events, no h2, no numbers. The list is the cheap part. What makes this page
 * worth ranking is that we know what actually happened at those races — how
 * many people finished, how the median moved season on season, and whether the
 * venue runs fast or slow — and none of that requires writing a word by hand.
 *
 * Everything here is pure. Fetching lives in the page; this module only shapes
 * what comes back, so it can be tested without a data source.
 */

import type { EventSummary } from "./source";

export type CityProfile = {
  slug: string;
  city: string;
  country: string;
  countryIso: string;
  region: string;
  iata: string;
  /** Every venue the city has used, newest first. Cities do move. */
  venues: string[];
  /** Newest first — the order the page renders. */
  events: EventSummary[];
  editions: number;
  firstYear: number;
  latestYear: number;
  totalFinishers: number;
  nextEvent: EventSummary | null;
  latestFinished: EventSummary | null;
};

/**
 * A city's URL segment.
 *
 * Derived from the name rather than the IATA code. `/results/city/london` is
 * what a human would guess and what a link would be written as; the
 * competitor's `/location/london` gets this right too, while its *title* tag
 * leads with "location LON", which nobody has ever searched for.
 */
export function citySlug(city: string): string {
  return city
    .normalize("NFD")
    // Strip the combining marks NFD just split off, so München and Munchen
    // resolve to the same hub rather than two half-populated ones.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function byDateDesc(a: EventSummary, b: EventSummary): number {
  // Much of the ingested catalogue has no startDate yet, so year is the
  // fallback sort key rather than letting undated events collapse together.
  if (a.startDate && b.startDate) return b.startDate.localeCompare(a.startDate);
  return b.year - a.year;
}

/** One profile per city, each sorted newest-first, cities sorted by activity. */
export function groupEventsByCity(events: EventSummary[]): CityProfile[] {
  const buckets = new Map<string, EventSummary[]>();
  for (const event of events) {
    if (!event.city) continue;
    const slug = citySlug(event.city);
    if (!slug) continue;
    const bucket = buckets.get(slug);
    if (bucket) bucket.push(event);
    else buckets.set(slug, [event]);
  }

  const profiles: CityProfile[] = [];
  for (const [slug, bucket] of buckets) {
    const sorted = [...bucket].sort(byDateDesc);
    const newest = sorted[0];
    const years = sorted.map((e) => e.year).filter((y) => y > 0);

    // Upcoming events sort newest-first like everything else, so the *next*
    // one is the last upcoming entry, not the first.
    const upcoming = sorted.filter((e) => e.status === "upcoming");

    profiles.push({
      slug,
      city: newest.city,
      country: newest.country,
      countryIso: newest.countryIso,
      region: newest.region,
      iata: newest.iata,
      venues: [...new Set(sorted.map((e) => e.venue).filter(Boolean))],
      events: sorted,
      editions: sorted.length,
      firstYear: years.length ? Math.min(...years) : 0,
      latestYear: years.length ? Math.max(...years) : 0,
      totalFinishers: sorted.reduce((sum, e) => sum + (e.totalAthletes || 0), 0),
      nextEvent: upcoming.length ? upcoming[upcoming.length - 1] : null,
      latestFinished: sorted.find((e) => e.status === "finished") ?? null,
    });
  }

  // Most-raced cities first: that is both the useful order for a reader and
  // the right crawl priority, since those hubs have the most to say.
  return profiles.sort(
    (a, b) => b.editions - a.editions || b.totalFinishers - a.totalFinishers
      || a.city.localeCompare(b.city),
  );
}

export function findCityProfile(
  events: EventSummary[],
  slug: string,
): CityProfile | null {
  return groupEventsByCity(events).find((c) => c.slug === slug) ?? null;
}

/**
 * The sentence under the h1.
 *
 * Written from the data rather than templated onto it, because a page that
 * says "HYROX London — see all HYROX London events" earns nothing. Every
 * clause here carries a number a reader might have come for, which is also
 * what makes the copy differ city to city instead of being 200 near-duplicate
 * pages, and near-duplicates are what get filtered out of an index.
 */
export function cityIntro(profile: CityProfile): string {
  const parts: string[] = [];
  const span = profile.firstYear && profile.latestYear > profile.firstYear
    ? ` between ${profile.firstYear} and ${profile.latestYear}`
    : profile.firstYear
      ? ` in ${profile.firstYear}`
      : "";

  parts.push(
    `HYROX has raced in ${profile.city}, ${profile.country} `
    + `${profile.editions === 1 ? "once" : `${profile.editions} times`}${span}.`,
  );

  if (profile.totalFinishers > 0) {
    parts.push(
      `${profile.totalFinishers.toLocaleString("en-GB")} athletes have crossed `
      + `the line here across every division.`,
    );
  }

  if (profile.venues.length === 1) {
    parts.push(`Every edition has been held at ${profile.venues[0]}.`);
  } else if (profile.venues.length > 1) {
    parts.push(
      `The race has used ${profile.venues.length} venues, most recently `
      + `${profile.venues[0]}.`,
    );
  }

  return parts.join(" ");
}

/**
 * The questions this city page should answer, with answers built from its own
 * numbers. These render on the page and are emitted as `FAQPage` — the
 * competitor emits no FAQ schema anywhere on the site, and these are real
 * long-tail queries ("what's a good hyrox time in london") rather than padding.
 *
 * Only questions the data can actually answer are returned. A `FAQPage` block
 * containing an answer we invented is worse than no block at all.
 */
export function cityFaqs(
  profile: CityProfile,
  stats: { medianSeconds: number; winnerSeconds: number; sampleSize: number } | null,
  formatTime: (s: number) => string,
): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];
  const city = profile.city;

  if (stats && stats.sampleSize > 0) {
    faqs.push({
      q: `What is a good HYROX time in ${city}?`,
      a: `The median finish for HYROX Men at ${city} is ${formatTime(stats.medianSeconds)}, `
        + `from a field of ${stats.sampleSize.toLocaleString("en-GB")}. `
        + `Anything under that puts you in the faster half of the race; `
        + `the winner went ${formatTime(stats.winnerSeconds)}.`,
    });
    faqs.push({
      q: `What was the winning time at HYROX ${city}?`,
      a: `The fastest HYROX Men finish recorded at ${city} is `
        + `${formatTime(stats.winnerSeconds)}.`,
    });
  }

  if (profile.totalFinishers > 0) {
    faqs.push({
      q: `How many people race HYROX ${city}?`,
      a: `${profile.totalFinishers.toLocaleString("en-GB")} athletes have finished `
        + `a HYROX race in ${city} across ${profile.editions} `
        + `${profile.editions === 1 ? "edition" : "editions"} and every division, `
        + `from singles through doubles and relay.`,
    });
  }

  if (profile.nextEvent) {
    faqs.push({
      q: `When is the next HYROX in ${city}?`,
      a: `The next scheduled race is ${profile.nextEvent.name}`
        + `${profile.nextEvent.startDate ? ` on ${profile.nextEvent.startDate}` : ""}`
        + `${profile.nextEvent.venue ? ` at ${profile.nextEvent.venue}` : ""}. `
        + `Start lists and live results appear here as soon as they are published.`,
    });
  }

  faqs.push({
    q: `Where can I find my HYROX ${city} result?`,
    a: `Every finisher from every ${city} edition is on this page. Open the `
      + `edition you raced, choose your division, and search your name — your `
      + `result opens with a full station-by-station breakdown against the `
      + `division average, free and without an account.`,
  });

  return faqs;
}
