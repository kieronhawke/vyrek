import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { athletePerson, breadcrumbList, jsonLd } from "@/lib/results/structured-data";
import { STATION_IDS, type StationId } from "@/lib/results/model";
import { formatTime, formatOrdinal, formatCount, formatRelativeDate } from "@/lib/results/format";
import { ProgressionChart } from "@/components/results/athlete/progression-chart";
import { CareerStations, type CareerSplit } from "@/components/results/athlete/career-stations";
import { ClaimProfile } from "@/components/results/athlete/claim-profile";
import { PowerCard } from "@/components/results/athlete/power-card";
import { StationProfileTable } from "@/components/results/athlete/station-profile-table";
import {
  powerScore, formTrend, stationProfile, divisionBests, careerSummary,
} from "@/lib/results/athlete-analytics";
import { percentileOf, buildDistribution } from "@/lib/results/percentiles";
import { AthleteExport } from "@/components/results/export/athlete-export";
import { StatTile, MicroLabel, Nationality, Time, Delta } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";
import { RelatedLinks } from "@/components/results/ui/related-links";

/**
 * `/athlete/{slug}` — profile and full history.
 *
 * Also the entry point for our authorised user-submitted route: "is this you?
 * claim this profile". The brief asks for that entry point to be excellent,
 * because it is the one place a visitor becomes a customer record.
 */

export const revalidate = 3600;


/**
 * One read of the profile per request.
 *
 * ⚠️ `generateMetadata` and the page body both need the athlete, and Next calls
 * them separately — so this ran twice, and on a career of any size that is two
 * of the most expensive reads on the site for one page view. `cache` dedupes
 * them within a request.
 */
const loadAthlete = cache(async (slug: string) => getResultsSource().getAthlete(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const athlete = await loadAthlete(slug);
  if (!athlete) return { title: "Athlete not found" };

  const pb = athlete.pbSeconds ? formatTime(athlete.pbSeconds) : null;
  return {
    title: `${athlete.name}: HYROX Results & PBs`,
    description:
      `Every HYROX race by ${athlete.name} — ${athlete.races.length} results across `
      + `${athlete.seasonsActive.length} season${athlete.seasonsActive.length === 1 ? "" : "s"}`
      + `${pb ? `, personal best ${pb}` : ""}. Splits, progression and station analysis.`,
    alternates: { canonical: `/athlete/${slug}` },
    openGraph: {
      title: `${athlete.name} — HYROX race history`,
      url: `${siteUrl()}/athlete/${slug}`,
      type: "profile",
      images: [{ url: `${siteUrl()}/api/og/athlete/${slug}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${siteUrl()}/api/og/athlete/${slug}`],
    },
  };
}

/** How many recent races to pull full splits for, for the career chart. */
const CAREER_SPLIT_DEPTH = 8;

export default async function AthletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const source = getResultsSource();
  const athlete = await loadAthlete(slug);
  if (!athlete) notFound();

  const now = new Date();
  // ⚠️ Year is the tiebreak, because most races have no date.
  //
  // Sorting on the date string alone put an undated 2025 race above a dated
  // 2026 one — a career listed London 2025, Phoenix 2026, World Championships
  // 2025, Miami 2025, EMEA London 2026 in that order, which reads as broken.
  // The published HYROX calendar carries upcoming races only, so most of the
  // archive arrives here with an empty date and this is the normal case.
  const races = [...athlete.races].sort((a, b) => {
    const byDate = (b.date || `${b.year}-00-00`).localeCompare(a.date || `${a.year}-00-00`);
    return byDate !== 0 ? byDate : b.year - a.year;
  });
  const finished = races.filter((r) => r.finishSeconds > 0);

  // Career splits, for the per-station axes.
  //
  // ⚠️ Bounded. Each `getResult` is about six queries, so a long career meant
  // ninety of them for one page — and splits exist on 21 of 630,287 results,
  // so almost all of that work finds nothing. The chart plots a trend, and the
  // most recent races are the ones a trend is about.
  const details = await Promise.all(
    finished.slice(0, CAREER_SPLIT_DEPTH).map((r) => source.getResult(r.resultId)),
  );
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

  /* ── Career analytics ──────────────────────────────────────────────
     All derived from the race list and the details already fetched above, so
     this adds no round trips. */

  const summary = careerSummary(races);
  const bests = divisionBests(races);

  // Percentile per race, needed by the power score. `rank` and `fieldSize`
  // give it directly — no distribution to build.
  const scored = finished.map((race, i) => {
    const detail = details[i];
    const fieldSize = detail?.fieldSize ?? 0;
    return {
      percentile: fieldSize > 0 && race.rank > 0
        ? ((fieldSize - race.rank) / fieldSize) * 100
        : 0,
      fieldSize,
      ageDays: Math.max(0, Math.round(
        (now.getTime() - new Date(race.date).getTime()) / 86_400_000,
      )),
    };
  });
  const power = powerScore(scored);

  // Form is only meaningful within one division: an Open time and a Doubles
  // time on the same line is not a trend.
  const primaryDivision = bests[0]?.division;
  const trend = formTrend(
    finished
      .filter((r) => r.division === primaryDivision)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => r.finishSeconds),
  );

  // Station splits with a percentile against the division at that event.
  const stationSamples: Partial<Record<StationId, { seconds: number; percentile: number }[]>> = {};
  details.forEach((detail) => {
    if (!detail) return;
    for (const station of STATION_IDS) {
      const seconds = detail.stations[station];
      const average = detail.divisionAverage.stations[station];
      if (!seconds || !average) continue;
      // Approximate: a station distribution per event is not held, so this
      // places the split against the division mean rather than its full curve.
      const percentile = Math.max(0, Math.min(100, 50 - ((seconds / average) - 1) * 200));
      (stationSamples[station] ??= []).push({ seconds, percentile });
    }
  });
  const profile = stationProfile(stationSamples);

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

  const personLd = athletePerson(siteUrl(), {
    slug, name: athlete.name, countryIso: athlete.countryIso,
    races: summary.races, pbSeconds: athlete.pbSeconds,
  });
  const crumbsLd = breadcrumbList(siteUrl(), [
    { name: "Results", path: "/results" },
    { name: athlete.name, path: `/athlete/${slug}` },
  ]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(personLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

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
            {formatCount(summary.races)} races · {summary.divisions} division
            {summary.divisions === 1 ? "" : "s"} · {summary.seasons} season
            {summary.seasons === 1 ? "" : "s"} · {summary.countries} cit
            {summary.countries === 1 ? "y" : "ies"} · {athlete.ageGroup}
          </p>
        </div>

        {/* Not `shrink-0`.
         *
         * This sits in a `flex-wrap` header beside the athlete's name. With
         * `shrink-0` it refused to narrow, so its own `flex-wrap` never got a
         * constrained width to wrap into — it laid the buttons out on one line
         * at 356px inside a 280px header and pushed every phone under ~380px
         * sideways. Allowing it to shrink is what lets its children wrap. */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Form, stated plainly. A career list cannot answer "am I getting
          faster"; a fitted slope over comparable races can. */}
      {trend.direction !== "unknown" ? (
        <p className="mt-4 rounded-md border border-suth-border-subtle bg-suth-elevated px-4 py-2.5 text-sm text-suth-text-secondary">
          <span className="font-semibold text-suth-text">
            {trend.direction === "improving" ? "Getting faster."
              : trend.direction === "declining" ? "Slowing down."
              : "Holding steady."}
          </span>{" "}
          {trend.direction === "steady"
            ? `Finish times within a minute of each other across ${trend.sampleSize} races in ${bests[0]?.divisionLabel.replace("HYROX ", "") ?? "this division"}.`
            : `About ${formatTime(Math.abs(trend.secondsPerRace))} per race ${trend.direction === "improving" ? "quicker" : "slower"}, over ${trend.sampleSize} races in ${bests[0]?.divisionLabel.replace("HYROX ", "") ?? "this division"}.`}
        </p>
      ) : null}

      {finished.length >= 2 ? (
        <div className="mt-4">
          <ProgressionChart races={finished} />
        </div>
      ) : null}

      {/* Depth below the fold: the summary above is what most visitors want,
          and this is for the ones who came to dig. */}
      {power.score > 0 || profile.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {power.score > 0 ? <PowerCard power={power} /> : null}
          {profile.length > 0 ? <StationProfileTable profile={profile} /> : null}
        </div>
      ) : null}

      {bests.length > 1 ? (
        <section className="mt-4 rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
          <MicroLabel>[ PERSONAL BESTS ]</MicroLabel>
          <ul className="mt-3 space-y-2">
            {bests.map((best) => (
              <li key={best.division} className="flex items-baseline justify-between gap-3 text-sm">
                <Link
                  href={`/result/${best.resultId}`}
                  data-inline-tap
                  className="truncate text-suth-text-secondary hover:text-suth-accent
                             focus-visible:outline-2 focus-visible:outline-suth-accent"
                >
                  {best.divisionLabel.replace("HYROX ", "")}
                </Link>
                <span className="flex shrink-0 items-baseline gap-2.5">
                  {best.isCurrent ? (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-suth-accent">
                      current
                    </span>
                  ) : null}
                  <span className="text-[11px] text-suth-text-tertiary">
                    {best.eventCity} {best.year}
                  </span>
                  <Time seconds={best.seconds} className="text-suth-accent" />
                </span>
              </li>
            ))}
          </ul>
        </section>
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
      <RelatedLinks
        links={[
          { href: "/results/city", label: "Results by city" },
          { href: "/rankings/records", label: "The record book" },
          { href: "/tools/good-hyrox-time", label: "Is my time good?" },
          { href: "/simulator", label: "Model your next race" },
        ]}
      />

    </div>
  );
}
