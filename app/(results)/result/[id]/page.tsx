import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { buildRankingSlug } from "@/lib/results/slugs";
import { STATION_IDS, stationGuideHref } from "@/lib/results/model";
import { formatCount, formatOrdinal, formatPercent, formatSplit, formatTime } from "@/lib/results/format";
import { buildDistribution, percentileOf } from "@/lib/results/percentiles";
import {
  analyseStations, analysePacing, analyseRoxzone, analyseBalance,
  weakestStation, projectWhatIf, flagImplausibleSplits,
} from "@/lib/results/analysis";
import { RaceStrip } from "@/components/results/result/race-strip";
import { PacingChart } from "@/components/results/result/pacing-chart";
import { StationBars } from "@/components/results/result/station-bars";
import { WhatIfCard } from "@/components/results/result/what-if";
import { ShareResult } from "@/components/results/result/share-result";
import { ResultExport } from "@/components/results/export/result-export";
import { StatTile, MicroLabel, Nationality, Time } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";
import { Reveal } from "@/components/results/ui/reveal";
import { getDataMode } from "@/lib/results";

/**
 * `/result/{id}` — the crown jewel.
 *
 * Everything here is derived from one row of splits plus the division field.
 * The order is deliberate: what happened (race strip), how it was paced, where
 * it was lost (stations, weakest first), and what fixing it would be worth.
 */

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getResultsSource().getResult(id);
  if (!result) return { title: "Result not found | Suth Performance" };

  const division = result.divisionLabel.replace("HYROX ", "");
  return {
    title: `${result.athleteName}: ${result.eventName} ${division} Result & Splits`,
    description:
      `${result.athleteName} finished ${formatOrdinal(result.rank)} of `
      + `${formatCount(result.fieldSize)} in ${division} at ${result.eventName}. `
      + `Full splits, station-by-station analysis and pacing breakdown.`,
    alternates: { canonical: `/result/${id}` },
    openGraph: {
      title: `${result.athleteName} — ${result.eventName}`,
      description: `${formatOrdinal(result.rank)} of ${formatCount(result.fieldSize)} in ${division}.`,
      url: `${siteUrl()}/result/${id}`,
      type: "website",
      images: [{
        url: `${siteUrl()}/api/og/result/${id}`,
        width: 1200,
        height: 630,
        alt: `${result.athleteName} — ${formatTime(result.finishSeconds)} at ${result.eventName}`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${result.athleteName} — ${result.eventName}`,
      images: [`${siteUrl()}/api/og/result/${id}`],
    },
  };
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getResultsSource();
  const result = await source.getResult(id);
  if (!result) notFound();

  // Just the times — the field is only needed to place this athlete in it.
  const fieldTimes = await source.getDivisionFinishTimes(result.eventSlug, result.division);
  const distribution = buildDistribution(fieldTimes);
  const percentile = percentileOf(distribution, result.finishSeconds);

  const splits = {
    runs: result.runs,
    stations: result.stations,
    roxzoneSeconds: result.roxzoneSeconds,
    finishSeconds: result.finishSeconds,
  };

  const standings = analyseStations(splits, result.divisionAverage.stations);
  const pacing = analysePacing(result.runs);
  const roxzone = analyseRoxzone(splits, result.divisionAverage.roxzone);
  const averageRunTotal = result.divisionAverage.runs.reduce((s, v) => s + v, 0);
  const averageStationTotal = STATION_IDS.reduce(
    (s, id) => s + (result.divisionAverage.stations[id] ?? 0), 0,
  );
  const balance = analyseBalance(
    splits,
    averageStationTotal > 0 ? averageRunTotal / averageStationTotal : 1,
  );
  const weakest = weakestStation(standings);
  const whatIf = weakest
    ? projectWhatIf(splits, weakest, fieldTimes, result.rank, 50)
    : null;
  const flags = flagImplausibleSplits(splits);

  const division = result.divisionLabel.replace("HYROX ", "");
  const rankingSlug = buildRankingSlug(result.eventSlug, result.division);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/event/${result.eventSlug}`} className="hover:text-suth-accent">
              {result.eventCity}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/ranking/${rankingSlug}`} className="hover:text-suth-accent">{division}</Link>
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Nationality iso={result.countryIso} />
            <h1 className="truncate text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
              <Link
                href={`/athlete/${result.athleteSlug}`}
                data-inline-tap
                className="hover:text-suth-accent focus-visible:outline-2 focus-visible:outline-suth-accent"
              >
                {result.athleteName}
              </Link>
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            {result.eventName} · {division} · {result.ageGroup}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ShareResult
          athleteName={result.athleteName}
          eventName={result.eventName}
          finishSeconds={result.finishSeconds}
          cardUrl={`/api/og/result/${id}`}
          rank={result.rank}
          fieldSize={result.fieldSize}
          division={division}
        />
        <ResultExport
          input={{
            athleteName: result.athleteName,
            eventName: result.eventName,
            divisionLabel: result.divisionLabel,
            runs: result.runs,
            stations: result.stations,
            roxzoneSeconds: result.roxzoneSeconds,
            finishSeconds: result.finishSeconds,
            averageRuns: result.divisionAverage.runs,
            averageStations: result.divisionAverage.stations,
            averageRoxzone: result.divisionAverage.roxzone,
          }}
        />
        </div>
      </header>

      <p className="results-print-footer mt-6 border-t border-suth-border-subtle pt-2 text-[10px] text-suth-text-tertiary">
        {result.athleteName} · {result.eventName} · {division} · suthperformance.com/results
        {getDataMode() === "demo" ? " · DEMO DATA, not a record of a real race" : ""}
      </p>

      {flags.length > 0 ? (
        <p className="mt-4 rounded-md border border-suth-warning/30 bg-suth-warning/5 px-4 py-2.5 text-xs text-suth-text-secondary">
          <span className="font-semibold text-suth-warning">Check this data.</span>{" "}
          {flags.length === 1 ? "One split looks" : `${flags.length} splits look`} implausible
          ({flags.map((f) => f.segment).join(", ")}), so the charts below may be misleading.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Finish" value={<Time seconds={result.finishSeconds} />} tone="accent" />
        <StatTile
          label="Overall"
          value={formatOrdinal(result.rank)}
          sub={`of ${formatCount(result.fieldSize)}`}
        />
        <StatTile
          label="Age group"
          value={formatOrdinal(result.ageGroupRank)}
          sub={result.ageGroup}
        />
        <StatTile
          label="Percentile"
          value={formatPercent(percentile)}
          sub={`Faster than ${Math.round(percentile)}% of ${division}`}
        />
      </div>

      <Reveal className="mt-4">
        <RaceStrip
          runs={result.runs}
          stations={result.stations}
          roxzoneSeconds={result.roxzoneSeconds}
          averageRuns={result.divisionAverage.runs}
          averageStations={result.divisionAverage.stations}
        />
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PacingChart
          runs={result.runs}
          averageRuns={result.divisionAverage.runs}
          pacing={pacing}
        />
        <StationBars standings={standings} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
          <MicroLabel>[ ROXZONE ]</MicroLabel>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="results-num text-2xl text-suth-text">
              {formatSplit(roxzone.seconds)}
            </span>
            <span className="text-xs text-suth-text-tertiary">
              {formatPercent(roxzone.shareOfRace * 100, 1)} of the race
            </span>
          </p>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            {roxzone.verdict === "sharp"
              ? `Sharper transitions than the division average — ${formatSplit(Math.abs(roxzone.deltaSeconds))} of free time banked.`
              : roxzone.verdict === "leaking"
                ? `${formatSplit(roxzone.deltaSeconds)} slower than the division average. Transitions are the cheapest minutes in the sport to win back.`
                : "In line with the division average."}
          </p>
        </section>

        <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
          <MicroLabel>[ WORK TO RUN ]</MicroLabel>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="results-num text-2xl text-suth-text">{balance.ratio.toFixed(2)}</span>
            <span className="text-xs capitalize text-suth-text-tertiary">{balance.profile}</span>
          </p>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            {formatSplit(balance.runSeconds)} running, {formatSplit(balance.stationSeconds)} on
            stations.{" "}
            {balance.profile === "runner"
              ? "You run more of this race than your division does — the stations are where the time is."
              : balance.profile === "strength"
                ? "You spend less time on stations than your division does — the running is where the time is."
                : "Balanced against the division."}
          </p>
        </section>
      </div>

      {weakest && whatIf ? (
        <div className="mt-4">
          <WhatIfCard
            whatIf={whatIf}
            currentRank={result.rank}
            fieldSize={result.fieldSize}
            division={division}
          />
        </div>
      ) : null}

      <CoachingCta
        className="mt-6"
        headline={weakest ? `Fix your ${weakest.label}` : "Build the next block around this race"}
        body={
          weakest
            ? `${weakest.label} is your weakest station relative to ${division} at this event. `
              + `The guide is written by Benjamin Sutherland, Elite 15.`
            : "Train what this race exposed, not a generic template."
        }
        href={weakest ? stationGuideHref(weakest.station) : "/plans"}
        cta={weakest ? `Read the ${weakest.label} guide` : "See coaching options"}
      />

      <p className="mt-6 text-center text-xs text-suth-text-tertiary">
        <Link href={`/ranking/${rankingSlug}`} className="hover:text-suth-accent">
          ← Back to the full {division} ranking
        </Link>
      </p>
    </div>
  );
}
