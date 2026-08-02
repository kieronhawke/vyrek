import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { STATION_IDS, type StationId } from "@/lib/results/model";
import { formatTime, formatOrdinal, formatCount, formatRelativeDate } from "@/lib/results/format";
import { ProgressionChart } from "@/components/results/athlete/progression-chart";
import { CareerStations, type CareerSplit } from "@/components/results/athlete/career-stations";
import { ClaimProfile } from "@/components/results/athlete/claim-profile";
import { AthleteExport } from "@/components/results/export/athlete-export";
import { StatTile, Nationality, Time, Delta } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";

/**
 * `/athlete/{slug}` — profile and full history.
 *
 * Also the entry point for our authorised user-submitted route: "is this you?
 * claim this profile". The brief asks for that entry point to be excellent,
 * because it is the one place a visitor becomes a customer record.
 */

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const athlete = await getResultsSource().getAthlete(slug);
  if (!athlete) return { title: "Athlete not found | Suth Performance" };

  const pb = athlete.pbSeconds ? formatTime(athlete.pbSeconds) : null;
  return {
    title: `${athlete.name}: HYROX Results, PBs & Race History`,
    description:
      `Every HYROX race by ${athlete.name} — ${athlete.races.length} results across `
      + `${athlete.seasonsActive.length} season${athlete.seasonsActive.length === 1 ? "" : "s"}`
      + `${pb ? `, personal best ${pb}` : ""}. Splits, progression and station analysis.`,
    alternates: { canonical: `/athlete/${slug}` },
    openGraph: {
      title: `${athlete.name} — HYROX race history`,
      url: `${siteUrl()}/athlete/${slug}`,
      type: "profile",
    },
  };
}

export default async function AthletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const source = getResultsSource();
  const athlete = await source.getAthlete(slug);
  if (!athlete) notFound();

  const now = new Date();
  const races = [...athlete.races].sort((a, b) => b.date.localeCompare(a.date));
  const finished = races.filter((r) => r.finishSeconds > 0);

  // Career splits, for the per-station axes. One getResult per race; they hit
  // the same cached event shards, so this stays cheap.
  const details = await Promise.all(finished.map((r) => source.getResult(r.resultId)));
  const latestId = finished[0]?.resultId;

  const splits: CareerSplit[] = [];
  const averageTotals = new Map<StationId, { sum: number; n: number }>();
  details.forEach((detail, i) => {
    if (!detail) return;
    for (const station of STATION_IDS) {
      const seconds = detail.stations[station];
      if (seconds > 0) {
        splits.push({
          station,
          seconds,
          eventCity: finished[i].eventCity,
          year: finished[i].year,
          isLatest: finished[i].resultId === latestId,
        });
      }
      const avg = detail.divisionAverage.stations[station];
      if (avg > 0) {
        const held = averageTotals.get(station) ?? { sum: 0, n: 0 };
        averageTotals.set(station, { sum: held.sum + avg, n: held.n + 1 });
      }
    }
  });

  const divisionAverages: Partial<Record<StationId, number>> = {};
  for (const [station, { sum, n }] of averageTotals) {
    divisionAverages[station] = Math.round(sum / n);
  }

  const bestRace = finished.reduce<typeof finished[number] | null>(
    (best, r) => (!best || r.finishSeconds < best.finishSeconds ? r : best),
    null,
  );
  // "Podiums: 0" is true for almost every athlete and tells them nothing.
  // Their best finish always says something.
  const podiums = finished.filter((r) => r.rank > 0 && r.rank <= 3).length;
  const bestRank = finished.reduce<number | null>(
    (best, r) => (r.rank > 0 && (best === null || r.rank < best) ? r.rank : best),
    null,
  );
  const bestRankRace = bestRank
    ? finished.find((r) => r.rank === bestRank) ?? null
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: athlete.name,
    url: `${siteUrl()}/athlete/${slug}`,
    nationality: athlete.countryIso.toUpperCase(),
  };

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">Athlete</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Nationality iso={athlete.countryIso} />
            <h1 className="truncate text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
              {athlete.name}
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            {formatCount(athlete.races.length)} races ·{" "}
            {athlete.divisionsRaced.length} division{athlete.divisionsRaced.length === 1 ? "" : "s"} ·{" "}
            {athlete.seasonsActive.length} season{athlete.seasonsActive.length === 1 ? "" : "s"} ·{" "}
            {athlete.ageGroup}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={`/results/compare?a=${athlete.slug}`}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-sm border
                     border-suth-border bg-suth-elevated px-4 text-sm text-suth-text
                     transition-colors hover:border-suth-border-strong
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
        >
          Compare
        </Link>
        <AthleteExport
          name={athlete.name}
          races={races.map((r) => ({
            date: r.date, eventCity: r.eventCity, year: r.year, season: r.season,
            divisionLabel: r.divisionLabel, rank: r.rank,
            ageGroupRank: r.ageGroupRank, finishSeconds: r.finishSeconds,
          }))}
        />
        </div>
      </header>

      {athlete.isPlaceholder ? (
        <p className="mt-4 rounded-md border border-suth-warning/30 bg-suth-warning/5 px-4 py-2.5 text-xs text-suth-text-secondary">
          <span className="font-semibold text-suth-warning">Demo placeholder.</span>{" "}
          This profile holds synthetic data pending a profile claim. The times below are not a
          record of any real race.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Personal best"
          value={athlete.pbSeconds ? <Time seconds={athlete.pbSeconds} /> : "—"}
          sub={bestRace ? `${bestRace.eventCity} ${bestRace.year}` : undefined}
          tone="accent"
        />
        <StatTile label="Races" value={formatCount(athlete.races.length)} />
        <StatTile
          label={podiums > 0 ? "Podiums" : "Best finish"}
          value={podiums > 0 ? podiums : bestRank ? formatOrdinal(bestRank) : "—"}
          sub={podiums > 0
            ? "Top three finishes"
            : bestRankRace ? `${bestRankRace.eventCity} ${bestRankRace.year}` : undefined}
        />
        <StatTile
          label="Last raced"
          value={races[0] ? races[0].eventCity : "—"}
          sub={races[0] ? formatRelativeDate(races[0].date, now) : undefined}
        />
      </div>

      {finished.length >= 2 ? (
        <div className="mt-4">
          <ProgressionChart races={finished} />
        </div>
      ) : null}

      {splits.length > 0 ? (
        <div className="mt-4">
          <CareerStations splits={splits} divisionAverages={divisionAverages} />
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-lg font-semibold text-suth-text">
          Race history
        </h2>
        <ul className="divide-y divide-suth-border-subtle overflow-hidden rounded-md border border-suth-border-subtle">
          {races.map((race) => (
            <li key={race.resultId}>
              <Link
                href={`/result/${race.resultId}`}
                data-inline-tap
                className="flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-1 bg-suth-elevated
                           px-4 py-2.5 transition-colors hover:bg-suth-overlay
                           focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-suth-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-suth-text">
                    HYROX {race.eventCity} {race.year}
                  </p>
                  <p className="results-num mt-0.5 text-[11px] text-suth-text-tertiary">
                    {race.divisionLabel.replace("HYROX ", "")} ·{" "}
                    {race.season.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <Time seconds={race.finishSeconds} className="block text-sm" />
                  {athlete.pbSeconds && race.finishSeconds > athlete.pbSeconds ? (
                    <Delta
                      seconds={race.finishSeconds - athlete.pbSeconds}
                      className="text-[11px]"
                    />
                  ) : (
                    <span className="results-num text-[11px] text-suth-accent">PB</span>
                  )}
                </div>
                <div className="w-16 shrink-0 text-right">
                  <span className="results-num text-sm text-suth-text-secondary">
                    {race.rank > 0 ? formatOrdinal(race.rank) : "DNF"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6">
        <ClaimProfile athleteName={athlete.name} athleteSlug={athlete.slug} />
      </div>

      <CoachingCta
        className="mt-6"
        headline={`${athlete.pbSeconds ? formatTime(athlete.pbSeconds) : "Your PB"} is a starting point`}
        body="A plan built on what these splits actually show, rather than a template that ignores them."
      />
    </div>
  );
}
