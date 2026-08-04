import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { collectRecordCandidates } from "@/lib/results/records-source";
import { worldRecords, ageGroupRecords, freshRecords } from "@/lib/results/records";
import { RecordBanner } from "@/components/results/rankings/record-banner";
import { siteUrl } from "@/lib/blog/urls";
import { HeroSearch } from "@/components/results/search/hero-search";
import { EventTile, EventRail, RailItem } from "@/components/results/event-tiles";
import { LiveStrip } from "@/components/results/live/live-strip";
import { StatusBadge, MicroLabel, EmptyState } from "@/components/results/ui/primitives";
import { SlidersHorizontal, GitCompareArrows, Percent, Trophy, Gauge, MapPin } from "lucide-react";
import { ogImages } from "@/lib/seo/og";

/**
 * `/results` — the landing page.
 *
 * Search first, because that is what people arrive wanting. Then live, then
 * the most recent finished events, then what is coming. Tools last: they are
 * the reason to come back, not the reason to arrive.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  // layout.tsx appends " · Suth Performance", so naming it here doubled
  // it — and with a pipe, against the dot separator used sitewide.
  title: "HYROX results, rankings and race analytics",
  description:
    "Every HYROX result, ranking and split, searchable in one place. Compare "
    + "athletes, simulate your race, and see exactly where your time goes.",
  alternates: { canonical: "/results" },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(),
    title: "HYROX Results, Rankings & Race Analytics",
    description: "Every HYROX result, ranking and split, searchable in one place.",
    url: `${siteUrl()}/results`,
    type: "website",
  },
};

const TOOLS = [
  { href: "/simulator", label: "Race simulator", detail: "Model your finish, station by station", icon: SlidersHorizontal },
  { href: "/results/compare", label: "Compare", detail: "Two athletes, or two of your own races", icon: GitCompareArrows },
  { href: "/tools/good-hyrox-time", label: "Percentile check", detail: "Where your time actually places you", icon: Percent },
  { href: "/rankings/records", label: "The record book", detail: "World, national and age-group records", icon: Trophy },
  { href: "/results/course-index", label: "Course speed index", detail: "Which venues actually run slow", icon: Gauge },
  { href: "/results/city", label: "Browse by city", detail: "Every host city, every edition", icon: MapPin },
];

export default async function ResultsLandingPage() {
  const source = getResultsSource();
  const now = new Date();

  const [events, live, upcoming, recordCandidates] = await Promise.all([
    source.listEvents({ status: "finished" }),
    source.listEvents({ status: "live" }),
    source.listEvents({ status: "upcoming" }),
    // A record falling is the only moment most people look at a record book,
    // so it is announced on the page they are already on. Failing softly here
    // is right: a banner is not worth taking the whole hub down for.
    collectRecordCandidates().catch(() => []),
  ]);

  const freshlySet = freshRecords(
    [...worldRecords(recordCandidates), ...ageGroupRecords(recordCandidates)],
    now,
  ).sort((a, b) => (a.scope === "world" ? -1 : 1) - (b.scope === "world" ? -1 : 1));

  const athleteTotal = [...events, ...live, ...upcoming]
    .reduce((sum, e) => sum + e.totalAthletes, 0);

  // Winner chips need the division detail, which listEvents deliberately omits.
  const latest = events.slice(0, 6);
  const latestDetail = await Promise.all(latest.map((e) => source.getEvent(e.slug)));

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <header className="mx-auto max-w-3xl text-center">
        <MicroLabel>[ SUTH PERFORMANCE ]</MicroLabel>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-suth-text md:text-5xl">
          HYROX Results
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-suth-text-secondary md:text-base">
          Every race, every split, every ranking — and what to do about them.
        </p>
        <div className="mt-6">
          <HeroSearch
            athleteCount={athleteTotal}
            eventCount={events.length + live.length + upcoming.length}
          />
        </div>
      </header>

      {live.length > 0 ? (
        <section className="mt-12" aria-labelledby="live-heading">
          <div className="mb-3 flex items-center gap-3">
            <h2 id="live-heading" className="text-lg font-semibold text-suth-text">
              Racing now
            </h2>
            <StatusBadge status="live" />
          </div>
          <LiveStrip eventSlug={live[0].slug} eventName={live[0].name} />
        </section>
      ) : null}

      {freshlySet.length > 0 ? (
        <div className="mt-8">
          <RecordBanner rows={freshlySet} />
        </div>
      ) : null}

      {/* ⚠️ Before the finished races, deliberately.
          The reference site opens on what is about to happen — its first card
          reads "in 20 hours" — and a visitor arriving the week of their race
          wants that before an archive. "Latest results" follows immediately. */}
{upcoming.length > 0 ? (
        <section className="mt-12" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-3 text-lg font-semibold text-suth-text">
            Coming up
          </h2>
          <EventRail label="Upcoming events">
            {upcoming.map((event) => (
              <RailItem key={event.slug}>
                <EventTile event={event} now={now} className="h-full" />
              </RailItem>
            ))}
          </EventRail>
        </section>
      ) : null}
      <section className="mt-12" aria-labelledby="latest-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="latest-heading" className="text-lg font-semibold text-suth-text">
            Latest results
          </h2>
          <Link
            href="/events"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-suth-text-tertiary
                       hover:text-suth-accent focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            All events →
          </Link>
        </div>

        {latest.length === 0 ? (
          <EmptyState
            title="No finished events yet"
            body="Results appear here the moment a race is marked final."
          />
        ) : (
          <EventRail label="Latest results">
            {latest.map((event, i) => (
              <RailItem key={event.slug}>
                <EventTile
                  event={event}
                  now={now}
                  winners={latestDetail[i]?.divisions.filter((d) => d.headline)}
                  className="h-full"
                />
              </RailItem>
            ))}
          </EventRail>
        )}
      </section>

      

      <section className="mt-12" aria-labelledby="tools-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tools-heading" className="text-lg font-semibold text-suth-text">
            Work out what your time means
          </h2>
          <Link
            href="/results/tools"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-suth-text-tertiary
                       hover:text-suth-accent focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            All tools →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {TOOLS.map(({ href, label, detail, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-md border border-suth-border-subtle bg-suth-elevated p-4
                         transition-colors hover:border-suth-border-strong
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
            >
              <Icon className="size-5 text-suth-text-tertiary transition-colors
                               group-hover:text-suth-accent" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-suth-text">{label}</h3>
              <p className="mt-1 text-xs text-suth-text-secondary">{detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
