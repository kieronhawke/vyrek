import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import {
  groupEventsByCity, findCityProfile, cityIntro, cityFaqs,
  type CityProfile,
} from "@/lib/results/city";
import { median } from "@/lib/results/course-index";
import { breadcrumbList, jsonLd } from "@/lib/results/structured-data";
import { formatTime, formatCount } from "@/lib/results/format";
import { EventTile } from "@/components/results/event-tiles";
import { FaqSection } from "@/components/results/ui/faq-section";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { MicroLabel, StatTile, Nationality } from "@/components/results/ui/primitives";

/**
 * `/results/city/[slug]` — every HYROX edition a city has hosted.
 *
 * This is the page for "hyrox london results", which is the query people
 * actually type. Individual editions rank for "hyrox london 2025"; nobody
 * searches a season slug, and without a hub the twelve London editions compete
 * with one another for the same phrase and split their link equity twelve ways.
 *
 * The competitor's equivalent is 226 words: an h1, a list of events, no h2 and
 * no numbers. The list is trivial to match. What is not trivial — and what
 * makes this worth ranking rather than being filtered as a near-duplicate of
 * two hundred sibling pages — is that every paragraph is computed from what
 * actually happened at those races, so no two cities read alike.
 *
 * Statically generated for the busiest hubs, rendered on demand for the tail.
 */

export const revalidate = 86400;

/** The reference division for the city's headline numbers: the deepest field. */
const REFERENCE_DIVISION = "hyrox-men";

/**
 * How many finished editions to sample for the median.
 *
 * Each costs one `getDivisionFinishTimes` call. Three is enough for a stable
 * central estimate and keeps the slowest city page to three parallel reads
 * rather than the twelve a full history would need.
 */
const SAMPLE_EDITIONS = 3;

type CityStats = {
  medianSeconds: number;
  winnerSeconds: number;
  sampleSize: number;
  editionsSampled: number;
};

async function loadCityStats(profile: CityProfile): Promise<CityStats | null> {
  const source = getResultsSource();
  const finished = profile.events
    .filter((e) => e.status === "finished")
    .slice(0, SAMPLE_EDITIONS);
  if (finished.length === 0) return null;

  const samples = await Promise.all(
    finished.map((event) =>
      source
        .getDivisionFinishTimes(event.slug, REFERENCE_DIVISION)
        .catch(() => [] as number[]),
    ),
  );

  const pooled = samples.flat().filter((s) => s > 0);
  if (pooled.length === 0) return null;

  return {
    medianSeconds: median(pooled),
    winnerSeconds: Math.min(...pooled),
    sampleSize: pooled.length,
    editionsSampled: samples.filter((s) => s.length > 0).length,
  };
}

export async function generateStaticParams() {
  // Only the hubs with real depth are prebuilt. The tail renders on first
  // request and is cached from then on; prebuilding two hundred thin cities
  // would lengthen every deploy to serve pages nobody has asked for yet.
  const events = await getResultsSource().listEvents().catch(() => []);
  return groupEventsByCity(events)
    .filter((c) => c.editions >= 2)
    .slice(0, 60)
    .map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const events = await getResultsSource().listEvents().catch(() => []);
  const profile = findCityProfile(events, slug);
  if (!profile) return { title: "City not found" };

  // The title leads with the phrase people search. The competitor's reads
  // "HYROX location LON: London", which puts a machine identifier in the
  // highest-weighted position on the page.
  // No brand suffix: app/layout.tsx appends "· Suth Performance" already.
  const title = `HYROX ${profile.city} Results: Every Race, Time & Ranking`;
  const description =
    `All HYROX ${profile.city} results — ${profile.editions} `
    + `${profile.editions === 1 ? "edition" : "editions"}`
    + `${profile.firstYear ? ` since ${profile.firstYear}` : ""}, `
    + `${formatCount(profile.totalFinishers)} finishers, with full splits, `
    + `division rankings and finish-time distributions. Free, no sign-up.`;

  return {
    title,
    description,
    alternates: { canonical: `/results/city/${profile.slug}` },
    openGraph: {
      title: `HYROX ${profile.city} — every result`,
      description,
      url: `${siteUrl()}/results/city/${profile.slug}`,
      type: "website",
    },
  };
}

export default async function CityHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Deliberately *not* wrapped in a catch.
  //
  // The first version swallowed source failures into an empty array, which
  // then fell through to `notFound()` — so a transient outage rendered as
  // "this city does not exist". That is the worst available outcome: 404 is a
  // permanent signal, Google drops the URL on it, and ISR caches the 404 so it
  // outlives the outage that caused it. An error must surface as a 500, which
  // says "try again" to a crawler and shows up in the logs.
  //
  // `notFound()` below now means only what it should: the catalogue loaded,
  // and it has no such city.
  const events = await getResultsSource().listEvents();
  const profile = findCityProfile(events, slug);
  if (!profile) notFound();

  const stats = await loadCityStats(profile);
  const now = new Date();
  const faqs = cityFaqs(profile, stats, (s) => formatTime(s));

  const finished = profile.events.filter((e) => e.status === "finished");
  const scheduled = profile.events.filter((e) => e.status !== "finished");

  // `CollectionPage` + `ItemList` is the shape that describes "a page whose
  // purpose is to list these things", and it is the one thing the competitor
  // does well here. Matching it costs nothing.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl()}/results/city/${profile.slug}#collection`,
    name: `HYROX ${profile.city} results`,
    description: cityIntro(profile),
    about: {
      "@type": "Place",
      name: profile.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.city,
        ...(profile.country ? { addressCountry: profile.country } : {}),
      },
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: profile.events.length,
      itemListElement: profile.events.map((event, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl()}/event/${event.slug}`,
        name: event.name,
      })),
    },
  };

  const crumbsLd = breadcrumbList(siteUrl(), [
    { name: "Results", path: "/results" },
    { name: "Cities", path: "/results/city" },
    { name: profile.city, path: `/results/city/${profile.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/results/city" className="hover:text-suth-accent">Cities</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">{profile.city}</li>
        </ol>
      </nav>

      <header className="mt-3">
        <MicroLabel>[ CITY ]</MicroLabel>
        {/* The flag sits beside the h1, not inside it. `Nationality` renders
            the ISO code as text, so nesting it made the accessible name read
            "HYROX London ResultsGBR" — and that string is what a screen reader
            announces and what Google reads as the page's primary heading. */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
            HYROX {profile.city} Results
          </h1>
          <Nationality iso={profile.countryIso} />
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
          {cityIntro(profile)}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Editions" value={String(profile.editions)} />
        <StatTile label="Finishers" value={formatCount(profile.totalFinishers)} />
        {stats ? (
          <>
            <StatTile
              label="Median finish"
              value={formatTime(stats.medianSeconds)}
              sub="HYROX Men"
            />
            <StatTile
              label="Fastest here"
              value={formatTime(stats.winnerSeconds)}
              tone="accent"
              sub="HYROX Men"
            />
          </>
        ) : (
          <>
            <StatTile label="First raced" value={profile.firstYear ? String(profile.firstYear) : "—"} />
            <StatTile label="Venues used" value={String(profile.venues.length || 1)} />
          </>
        )}
      </div>

      {stats ? (
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-suth-text-tertiary">
          Median and fastest are HYROX Men across the{" "}
          {stats.editionsSampled === 1
            ? "most recent finished edition"
            : `${stats.editionsSampled} most recent finished editions`}{" "}
          — {formatCount(stats.sampleSize)} finishers. Every other division is on
          its own ranking page below.
        </p>
      ) : null}

      {scheduled.length > 0 ? (
        <section className="mt-10" aria-labelledby="scheduled-heading">
          <h2
            id="scheduled-heading"
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            Scheduled in {profile.city}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((event) => (
              <EventTile key={event.slug} event={event} now={now} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="past-heading">
        <h2
          id="past-heading"
          className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
        >
          Past HYROX {profile.city} results
        </h2>
        {finished.length === 0 ? (
          <p className="text-sm text-suth-text-secondary">
            No finished editions in {profile.city} yet. Results appear here within
            hours of each race.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {finished.map((event) => (
              <EventTile key={event.slug} event={event} now={now} />
            ))}
          </div>
        )}
      </section>

      {profile.venues.length > 0 ? (
        <section className="mt-10" aria-labelledby="venue-heading">
          <h2
            id="venue-heading"
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            Where HYROX {profile.city} is held
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
            {profile.venues.length === 1 ? (
              <>
                Every HYROX {profile.city} edition has been staged at{" "}
                <strong className="text-suth-text">{profile.venues[0]}</strong>.
                A consistent venue means finish times are comparable season to
                season, so the trend across the editions above reflects the
                field rather than the floor.
              </>
            ) : (
              <>
                HYROX {profile.city} has used {profile.venues.length} venues —{" "}
                <strong className="text-suth-text">{profile.venues.join(", ")}</strong>.
                Layout changes between venues move finish times independently of
                fitness, so compare editions at the same venue before reading a
                trend into them.
              </>
            )}
          </p>
        </section>
      ) : null}

      <FaqSection faqs={faqs} title={`HYROX ${profile.city}: common questions`} />

      <RelatedLinks
        links={[
          { href: "/results/city", label: "Every HYROX city" },
          { href: "/results/course-index", label: "Which courses run slowest" },
          { href: "/tools/good-hyrox-time", label: "Is my HYROX time good?" },
          { href: "/events", label: "Full race calendar" },
        ]}
      />
    </div>
  );
}
