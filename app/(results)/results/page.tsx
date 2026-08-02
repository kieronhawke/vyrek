import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { HeroSearch } from "@/components/results/search/hero-search";
import { EventTile, EventRail, RailItem } from "@/components/results/event-tiles";
import { LiveStrip } from "@/components/results/live/live-strip";
import { StatusBadge, MicroLabel, EmptyState } from "@/components/results/ui/primitives";
import { SlidersHorizontal, GitCompareArrows, Percent, Trophy } from "lucide-react";

/**
 * `/results` — the landing page.
 *
 * Search first, because that is what people arrive wanting. Then live, then
 * the most recent finished events, then what is coming. Tools last: they are
 * the reason to come back, not the reason to arrive.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "HYROX Results, Rankings & Race Analytics | Suth Performance",
  description:
    "Every HYROX result, ranking and split, searchable in one place. Compare athletes, "
    + "simulate your race, and see exactly where your time goes. Built by Suth Performance.",
  alternates: { canonical: "/results" },
  openGraph: {
    title: "HYROX Results, Rankings & Race Analytics",
    description: "Every HYROX result, ranking and split, searchable in one place.",
    url: `${siteUrl()}/results`,
    type: "website",
  },
};

const TOOLS = [
  { href: "/simulator", label: "Race simulator", detail: "Model your finish, station by station", icon: SlidersHorizontal },
  { href: "/compare", label: "Compare", detail: "Two athletes, or two of your own races", icon: GitCompareArrows },
  { href: "/tools/good-hyrox-time", label: "Percentile check", detail: "Where your time actually places you", icon: Percent },
  { href: "/rankings/world-records", label: "Records", detail: "Fastest times by division", icon: Trophy },
];

export default async function ResultsLandingPage() {
  const source = getResultsSource();
  const now = new Date();

  const [events, live, upcoming] = await Promise.all([
    source.listEvents({ status: "finished" }),
    source.listEvents({ status: "live" }),
    source.listEvents({ status: "upcoming" }),
  ]);

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

      <section className="mt-12" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="mb-3 text-lg font-semibold text-suth-text">
          Work out what your time means
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
