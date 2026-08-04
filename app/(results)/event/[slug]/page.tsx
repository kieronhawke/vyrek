import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { breadcrumbList, sportsEvent, jsonLd } from "@/lib/results/structured-data";
import { formatCount, formatRelativeDate, formatTime } from "@/lib/results/format";
import { eventFaqs } from "@/lib/results/event-faq";
import { citySlug } from "@/lib/results/city";
import {
  Time, StatusBadge, MicroLabel, Nationality, StatTile, EmptyState,
} from "@/components/results/ui/primitives";
import { CityMark } from "@/components/results/ui/city-mark";
import { FaqSection } from "@/components/results/ui/faq-section";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { LiveStrip } from "@/components/results/live/live-strip";
import { PodiumCard } from "@/components/results/event/podium";
import { EventCountdown } from "@/components/results/event/countdown";
import { CoachingCta } from "@/components/results/coaching-cta";

/**
 * `/event/{slug}` — dual mode: UPCOMING, LIVE or FINAL.
 *
 * The reference site's event pages are a routing table and nothing else
 * (REFS.md §2.3). This one carries podiums, the field, and a reason to be
 * here that is not just "click through to a ranking".
 */

export const revalidate = 300;

/**
 * PREBUILD THE EVENTS PEOPLE ARRIVE ON. THE REST RENDER ON FIRST REQUEST.
 *
 * This used to return all 223 events, and it is what killed the deploy.
 * Each page fans out one ranking query per headline division against a
 * results database that gained 629k athletes in "reclaim the 629k orphaned
 * athletes"; several individual pages then took longer than the 240-second
 * per-page ceiling. The build reached 6,043 of 8,635 pages and was killed at
 * Vercel's 45-minute limit — which is reported as `Command "pnpm run build"
 * exited with 1`, so it reads like a compile error and is not one. Six
 * production deployments failed this way in a row.
 *
 * Nothing is lost by capping it. `dynamicParams` is left at its default, so
 * an event outside this list still renders on first request and is cached
 * from then on under the same five-minute revalidate as everything else.
 * What changes is that the deploy no longer pays for 223 of them up front,
 * for pages nobody has asked for yet.
 *
 * The list is chosen the way a visitor arrives: anything not yet finished
 * (people check those before race day), then the most recent finished
 * events, biggest first. `/results/city/[slug]` already reasons exactly this
 * way and caps at 60; this is the same principle applied to the family that
 * actually costs the time.
 */
/* Twelve, not forty. The per-page cost cannot be measured from here — the
   results database is a separate project this worktree has no keys for, and
   locally the source falls back to fourteen demo events, which is why the
   build passes on my machine and dies on Vercel. So the number is set where
   the deploy is safe rather than where it is optimal: twelve pages cannot
   consume a 45-minute budget even at the worst per-page time seen in the
   logs. Raise it once a green build shows what a page actually costs. */
const PREBUILT_EVENTS = 12;

export async function generateStaticParams() {
  // A failure here must not fail the build: with no params every event
  // simply renders on demand, which is the fallback anyway.
  const events = await getResultsSource().listEvents().catch(() => []);

  const rank = (e: (typeof events)[number]) => {
    // Upcoming and live first — they are what somebody checks this week.
    if (e.status !== "finished") return [0, -e.year, 0] as const;
    return [1, -e.year, -(e.totalAthletes ?? 0)] as const;
  };

  return [...events]
    .sort((a, b) => {
      const [ax, ay, az] = rank(a);
      const [bx, by, bz] = rank(b);
      return ax - bx || ay - by || az - bz;
    })
    .slice(0, PREBUILT_EVENTS)
    .map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getResultsSource().getEvent(slug);
  if (!event) return { title: "Event not found" };

  // Kept near 40 characters: the layout appends " · Suth Performance", and
  // Google renders about 60 in total before it truncates.
  const title = `HYROX ${event.city} ${event.year} Results`;
  const description = event.status === "finished"
    ? `Full HYROX ${event.city} ${event.year} results — ${formatCount(event.totalAthletes)} athletes `
      + `across ${event.divisions.length} divisions, with splits, rankings and an automated race report.`
    : `HYROX ${event.city} ${event.year} at ${event.venue}. Start lists, wave times and live `
      + `results for all ${event.divisions.length} divisions.`;

  return {
    title,
    description,
    alternates: { canonical: `/event/${event.slug}` },
    openGraph: {
      title: `HYROX ${event.city} ${event.year}`,
      description,
      url: `${siteUrl()}/event/${event.slug}`,
      type: "website",
      images: [{
        url: `${siteUrl()}/api/og/event/${event.slug}`,
        width: 1200,
        height: 630,
        alt: `HYROX ${event.city} ${event.year} podium`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `HYROX ${event.city} ${event.year}`,
      images: [`${siteUrl()}/api/og/event/${event.slug}`],
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const source = getResultsSource();
  const event = await source.getEvent(slug);
  if (!event) notFound();

  const now = new Date();
  const headline = event.divisions.filter((d) => d.headline);
  const isFinal = event.status === "finished";
  const isUpcoming = event.status === "upcoming";

  // Top three per headline division. Only for finished events — a live board
  // has its own component and an upcoming one has no times to show.
  const podiums = isFinal
    ? (await Promise.all(
        headline.map(async (division) => {
          const page = await source.getRanking(event.slug, division.divisionCode, { limit: 3 });
          return {
            divisionCode: division.divisionCode,
            label: division.label,
            rows: page?.rows ?? [],
          };
        }),
      )).filter((p) => p.rows.length > 0)
    : [];

  const eventLd = sportsEvent(siteUrl(), {
    slug: event.slug, name: event.name, city: event.city,
    country: event.country, venue: event.venue,
    startDate: event.startDate, endDate: event.endDate,
    status: event.status, totalAthletes: event.totalAthletes,
  });
  const crumbsLd = breadcrumbList(siteUrl(), [
    { name: "Results", path: "/results" },
    { name: "Events", path: "/events" },
    { name: `${event.city} ${event.year}`, path: `/event/${event.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(eventLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/events" className="hover:text-suth-accent">Events</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">{event.city}</li>
        </ol>
      </nav>

      <CityMark
        iata={event.iata}
        city={event.city}
        countryIso={event.countryIso}
        size="banner"
        className="mb-5 rounded-md border border-suth-border-subtle"
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
              HYROX {event.city} {event.year}
            </h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-suth-text-secondary">
            <Nationality iso={event.countryIso} withCode />
            <span aria-hidden className="text-suth-text-disabled">·</span>
            <span>{event.venue}</span>
            <span aria-hidden className="text-suth-text-disabled">·</span>
            <time dateTime={event.startDate}>{formatRelativeDate(event.startDate, now)}</time>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:w-auto md:grid-cols-2">
          <StatTile label="Athletes" value={formatCount(event.totalAthletes)} />
          <StatTile label="Divisions" value={event.divisions.length} />
        </div>
      </header>

      {isUpcoming ? (
        <section className="mt-8" aria-labelledby="countdown-heading">
          <h2 id="countdown-heading" className="sr-only">Time until the race</h2>
          <EventCountdown startDate={event.startDate} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/starters/${event.slug}`}
              className="inline-flex min-h-[44px] items-center rounded-sm bg-suth-accent px-5
                         text-sm font-semibold text-suth-base transition-colors hover:bg-suth-accent-hover
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
            >
              Start lists and wave times
            </Link>
            <Link
              href={`/simulator?event=${event.slug}`}
              className="inline-flex min-h-[44px] items-center rounded-sm border border-suth-border
                         px-5 text-sm text-suth-text transition-colors hover:border-suth-border-strong
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
            >
              Predict your time here
            </Link>
          </div>
        </section>
      ) : null}

      {event.status === "live" ? (
        <section className="mt-8" aria-labelledby="live-board">
          <h2 id="live-board" className="mb-3 text-lg font-semibold text-suth-text">
            Live board
          </h2>
          <LiveStrip eventSlug={event.slug} eventName={event.name} />
        </section>
      ) : null}

      {isFinal && podiums.length > 0 ? (
        <section className="mt-10" aria-labelledby="podium-heading">
          <h2 id="podium-heading" className="mb-3 text-lg font-semibold text-suth-text">
            Podiums
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {podiums.map((podium) => (
              <PodiumCard
                key={podium.divisionCode}
                divisionLabel={podium.label}
                eventSlug={event.slug}
                divisionCode={podium.divisionCode}
                rows={podium.rows}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="divisions-heading">
        <h2 id="divisions-heading" className="mb-3 text-lg font-semibold text-suth-text">
          All divisions
        </h2>

        {event.divisions.length === 0 ? (
          <EmptyState
            title="Divisions not published yet"
            body="They appear here as soon as the organiser confirms the schedule."
          />
        ) : (
          <ul className="divide-y divide-suth-border-subtle overflow-hidden rounded-md border border-suth-border-subtle">
            {event.divisions.map((division) => (
              <li key={division.divisionCode}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-suth-elevated px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-suth-text">{division.label}</p>
                    <p className="results-num mt-0.5 text-[11px] text-suth-text-tertiary">
                      {formatCount(division.athleteCount)} entered
                      {division.finisherCount !== undefined
                        ? ` · ${formatCount(division.finisherCount)} finished` : ""}
                      {/* Wave start times are not on the results source — only
                          the wave numbers are — so this renders only when a
                          time is actually known. It used to print a bare
                          "· first wave " with nothing after it. */}
                      {division.waves[0]?.time ? ` · first wave ${division.waves[0].time}` : ""}
                    </p>
                  </div>

                  {division.leaderTimeSeconds ? (
                    <div className="hidden text-right sm:block">
                      <p className="truncate text-xs text-suth-text-secondary">
                        {division.leaderAthleteName}
                      </p>
                      <Time seconds={division.leaderTimeSeconds} className="text-sm text-suth-accent" />
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Link
                      href={`/starters/${event.slug}?division=${division.divisionCode}`}
                      className="inline-flex min-h-[36px] items-center rounded-sm border border-suth-border
                                 px-3 text-xs text-suth-text-secondary transition-colors
                                 hover:text-suth-text focus-visible:outline-2 focus-visible:outline-suth-accent"
                    >
                      Starters
                    </Link>
                    {isUpcoming ? null : (
                      <Link
                        href={`/ranking/${event.slug}-${division.divisionCode}`}
                        className="inline-flex min-h-[36px] items-center rounded-sm border
                                   border-suth-accent/40 bg-suth-accent/10 px-3 text-xs
                                   text-suth-accent transition-colors hover:bg-suth-accent/15
                                   focus-visible:outline-2 focus-visible:outline-suth-accent"
                      >
                        Ranking
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isFinal ? (
        <section className="mt-10">
          <Link
            href={`/reports/${event.slug}`}
            className="flex items-center justify-between rounded-md border border-suth-border-subtle
                       bg-suth-elevated px-5 py-4 transition-colors hover:border-suth-border-strong
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
          >
            <div>
              <MicroLabel>[ RACE REPORT ]</MicroLabel>
              <p className="mt-1 text-sm text-suth-text">
                What happened at {event.city} — winners, records and standout times
              </p>
            </div>
            <span aria-hidden className="text-suth-accent">→</span>
          </Link>
        </section>
      ) : null}

      <FaqSection faqs={eventFaqs(event, formatTime)} title={`${event.name}: common questions`} />

      {/* The link back to the city hub earns its place twice over: it is what
          stops this edition competing with its own siblings for
          "hyrox {city} results", and it is the navigation a reader who landed
          on the wrong year actually needs. */}
      <RelatedLinks
        title={`More from ${event.city}`}
        links={[
          { href: `/results/city/${citySlug(event.city)}`, label: `Every HYROX ${event.city} result` },
          { href: "/results/course-index", label: "Does this course run slow?" },
          { href: "/events", label: "Full race calendar" },
        ]}
      />

      <CoachingCta
        className="mt-10"
        headline={isUpcoming ? `Racing ${event.city}?` : `Racing ${event.city} next season?`}
        body={
          isUpcoming
            ? "Get a plan built around this course and your start wave. Eight weeks out is the right time to start."
            : "Build the next block around what this race exposed, not around a generic template."
        }
      />
    </div>
  );
}
