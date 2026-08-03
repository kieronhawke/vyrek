import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { EventTile } from "@/components/results/event-tiles";
import { MicroLabel, EmptyState } from "@/components/results/ui/primitives";
import { Breadcrumbs } from "@/components/results/ui/breadcrumbs";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { PLACES, eventsAtPlace, placeBySlug } from "@/lib/results/places";

/**
 * `/events/uk`, `/events/germany`, `/events/india` — the regional calendars.
 *
 * `/events?region=UK` already returns the same rows, and ranks for nothing: a
 * query string is a filter, not a page. "hyrox uk" is a real search with real
 * volume, and this is the page that answers it.
 */

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return PLACES.map((place) => ({ place: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const place = placeBySlug((await params).place);
  if (!place) return {};
  return {
    title: place.title,
    description: place.description,
    alternates: { canonical: `/events/${place.slug}` },
    openGraph: { url: `${siteUrl()}/events/${place.slug}`, type: "website" },
  };
}

export default async function PlaceCalendar({
  params,
}: {
  params: Promise<{ place: string }>;
}) {
  const place = placeBySlug((await params).place);
  if (!place) notFound();

  const now = new Date();
  const all = await getResultsSource().listEvents();
  const events = eventsAtPlace(place, all);

  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status !== "upcoming");
  const athletes = events.reduce((sum, e) => sum + (e.totalAthletes ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <Breadcrumbs
        trail={[
          { name: "Results", path: "/results" },
          { name: "Events", path: "/events" },
          { name: place.label, path: `/events/${place.slug}` },
        ]}
      />

      <header>
        <MicroLabel>[ CALENDAR ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX in {place.label}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-suth-text-secondary">{place.blurb}</p>
        {events.length > 0 ? (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            {events.length} race{events.length === 1 ? "" : "s"}
            {athletes > 0 ? ` · ${athletes.toLocaleString("en-GB")} results` : ""}
            {upcoming.length > 0 ? ` · ${upcoming.length} upcoming` : ""}
          </p>
        ) : null}
      </header>

      {events.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`No races in ${place.label} yet`}
            body="Nothing has been held here that we hold results for. The worldwide calendar has everything else."
            action={
              <Link href="/events" className="text-sm text-suth-accent underline">
                See every race
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {upcoming.length > 0 ? (
            <Section id="upcoming" heading="Upcoming" events={upcoming} now={now} />
          ) : null}
          {past.length > 0 ? (
            <Section id="past" heading="Results" events={past} now={now} />
          ) : null}
        </div>
      )}

      <div className="mt-12">
        <RelatedLinks
          links={[
            { href: "/events", label: "The worldwide calendar" },
            { href: "/results/city", label: "Browse by city" },
            { href: "/rankings/records", label: "The record book" },
            { href: "/simulator", label: "Model your next race" },
          ]}
        />
      </div>

      {/* Other markets, so a visitor who wanted a neighbouring one has a route
          there rather than a back button. */}
      <nav aria-label="Other places" className="mt-8 flex flex-wrap gap-2">
        {PLACES.filter((p) => p.slug !== place.slug).map((p) => (
          <Link
            key={p.slug}
            href={`/events/${p.slug}`}
            className="inline-flex min-h-[36px] items-center rounded-pill border border-suth-border bg-suth-elevated px-3 text-xs text-suth-text-secondary transition-colors hover:text-suth-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
          >
            {p.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Section({
  id, heading, events, now,
}: {
  id: string;
  heading: string;
  events: Awaited<ReturnType<ReturnType<typeof getResultsSource>["listEvents"]>>;
  now: Date;
}) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
      >
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventTile key={event.slug} event={event} now={now} />
        ))}
      </div>
    </section>
  );
}
