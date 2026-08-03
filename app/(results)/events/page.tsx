import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { EventTile } from "@/components/results/event-tiles";
import { MicroLabel, EmptyState } from "@/components/results/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * `/events` — the season calendar.
 *
 * Filters are links, not client state: every combination is a real URL that
 * server-renders, so "hyrox events 2026" and "hyrox uk" land on something
 * indexable. The reference site filters client-side and ranks for neither.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "HYROX Events & Race Calendar: Every Season",
  description:
    "The full HYROX race calendar — every event by season, region and country, "
    + "with results, start lists and entrant counts.",
  alternates: { canonical: "/events" },
  openGraph: { url: `${siteUrl()}/events`, type: "website" },
};

const SEASONS = [
  { value: "", label: "All seasons" },
  { value: "s9", label: "Season 9" },
  { value: "s8", label: "Season 8" },
  { value: "s7", label: "Season 7" },
];

const REGIONS = [
  { value: "", label: "Worldwide" },
  { value: "Europe", label: "Europe" },
  { value: "Asia", label: "Asia" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; region?: string }>;
}) {
  const { season = "", region = "" } = await searchParams;
  const now = new Date();

  const events = await getResultsSource().listEvents({
    ...(season ? { season } : {}),
    ...(region ? { region } : {}),
  });

  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const key = `${event.season.toUpperCase()} · ${event.year}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  const buildHref = (next: { season?: string; region?: string }) => {
    const params = new URLSearchParams();
    const s = next.season ?? season;
    const r = next.region ?? region;
    if (s) params.set("season", s);
    if (r) params.set("region", r);
    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <header>
        <MicroLabel>[ CALENDAR ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Events
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          Every race across three seasons. {events.length} events shown.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        <FilterRow label="Season" options={SEASONS} active={season} build={(v) => buildHref({ season: v })} />
        <FilterRow label="Region" options={REGIONS} active={region} build={(v) => buildHref({ region: v })} />
      </div>

      {events.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No events match those filters"
            body="Try widening the season or region."
            action={
              <Link href="/events" className="text-sm text-suth-accent underline">
                Clear filters
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {[...grouped.entries()].map(([label, group]) => (
            <section key={label} aria-labelledby={`season-${label.replace(/\W/g, "")}`}>
              <h2
                id={`season-${label.replace(/\W/g, "")}`}
                className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
              >
                {label}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.map((event) => (
                  <EventTile key={event.slug} event={event} now={now} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label, options, active, build,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  build: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
        {label}
      </span>
      {options.map((option) => (
        <Link
          key={option.value || "all"}
          href={build(option.value)}
          aria-current={active === option.value ? "true" : undefined}
          className={cn(
            "inline-flex min-h-[36px] items-center rounded-pill border px-3 text-xs transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
            active === option.value
              ? "border-suth-accent/40 bg-suth-accent/10 text-suth-accent"
              : "border-suth-border bg-suth-elevated text-suth-text-secondary hover:text-suth-text",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
