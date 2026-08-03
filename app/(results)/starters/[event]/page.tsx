import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { formatCount } from "@/lib/results/format";
import { StartersList } from "@/components/results/starters/starters-list";
import { MicroLabel, StatusBadge, EmptyState } from "@/components/results/ui/primitives";

/**
 * `/starters/{event}` — start lists by division and wave.
 *
 * Targets "hyrox {city} start list", which spikes hard in the week before a
 * race. The searchable list is the point: on the morning, people are looking
 * for one name and one wave time, usually one-handed.
 */

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ event: string }>;
}): Promise<Metadata> {
  const { event: slug } = await params;
  const event = await getResultsSource().getEvent(slug);
  if (!event) return { title: "Start list not found" };

  return {
    title: `HYROX ${event.city} ${event.year} Start List & Wave Times`,
    description:
      `Every wave and division for HYROX ${event.city} ${event.year} — `
      + `${formatCount(event.totalAthletes)} athletes, searchable by name.`,
    alternates: { canonical: `/starters/${slug}` },
    openGraph: { url: `${siteUrl()}/starters/${slug}`, type: "website" },
  };
}

export default async function StartersPage({
  params, searchParams,
}: {
  params: Promise<{ event: string }>;
  searchParams: Promise<{ division?: string }>;
}) {
  const { event: slug } = await params;
  const { division } = await searchParams;

  const source = getResultsSource();
  const [event, startList] = await Promise.all([
    source.getEvent(slug),
    source.getStarters(slug),
  ]);
  if (!event) notFound();

  const waves = startList?.waves ?? [];
  const divisions = [...new Map(
    waves.map((w) => [w.divisionCode, { code: w.divisionCode, label: w.divisionLabel }]),
  ).values()];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/event/${event.slug}`} className="hover:text-suth-accent">
              {event.city} {event.year}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">Start list</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <MicroLabel>[ START LIST ]</MicroLabel>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
            HYROX {event.city} {event.year}
          </h1>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            {formatCount(event.totalAthletes)} athletes across {divisions.length} divisions.
          </p>
        </div>
        <StatusBadge status={event.status} />
      </header>

      <div className="mt-6">
        {waves.length === 0 ? (
          <EmptyState
            title="Start list not published"
            body="Waves appear here once the organiser confirms them, usually the week of the race."
          />
        ) : (
          <StartersList
            waves={waves}
            divisions={divisions}
            initialDivision={division ?? divisions[0]?.code ?? ""}
            eventFinished={event.status === "finished"}
            eventSlug={event.slug}
          />
        )}
      </div>
    </div>
  );
}
