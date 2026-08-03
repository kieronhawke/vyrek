import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getResultsSource, getDataMode } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { STATION_IDS, type StationId } from "@/lib/results/model";
import { buildDistribution, percentileOf, type Distribution } from "@/lib/results/percentiles";
import {
  analyseRoxzone, analyseStations, weakestStation, strongestStation,
} from "@/lib/results/analysis";
import {
  buildSegments, buildPotentialBands, projectPotentialFinish, assessRunning,
  buildPaceStory, benchmarkSplits, compareToPrevious, projectNextRace,
  buildRacePlan, BAND_LABEL, type Segment,
} from "@/lib/results/race-report";
import {
  pacingNote, roxzoneNote, stationNote, potentialNote, progressNote,
  type NoteContext,
} from "@/lib/results/report-notes";
import {
  formatTime, formatSplit, formatDelta, formatOrdinal, formatPercent, formatCount, nationCode,
} from "@/lib/results/format";
import {
  StationRadar, RunSplitBars, BandBar, BandLegend, PaceStoryLine,
  SplitDeltaBars, BenchmarkBars, HistoryHeatmap,
} from "@/components/results/report/charts";
import { CoachNoteBlock, ReportSection, ReportFigure, PhotoBreak } from "@/components/results/report/furniture";
import { PrintButton } from "@/components/results/report/print-button";
import { MicroLabel } from "@/components/results/ui/primitives";
import { Breadcrumbs } from "@/components/results/ui/breadcrumbs";
import { RelatedLinks } from "@/components/results/ui/related-links";

/**
 * `/report/{resultId}` — the full race report.
 *
 * The paid version of this document costs $24.99 and is sixteen pages. This is
 * free, needs no account, and carries more: the same overview, pace story,
 * banded performance, running assessment, benchmark, last-race comparison,
 * next-race projection and race plan — plus a roxzone section, a stated
 * derivation for every figure, and coaching notes that change with the numbers
 * rather than shipping the same paragraph to everyone.
 *
 * It renders as a web page and prints as a document. `results-report-print.css`
 * handles the second job, so "Save as PDF" needs no round trip and no server.
 */

export const revalidate = 3600;

const COVER_PHOTO = "/media/images/race/race-start-smoke-wide.jpg";
const BEN_PHOTO = "/media/images/camp/camp-portrait-forders-banner.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getResultsSource().getResult(id);
  if (!result) return { title: "Report not found" };

  const division = result.divisionLabel.replace("HYROX ", "");
  return {
    title: `${result.athleteName} — ${result.eventName} race report`,
    description:
      `A full HYROX race report for ${result.athleteName} at ${result.eventName}: `
      + `${formatTime(result.finishSeconds)} in ${division}, with station percentiles, `
      + `pacing analysis and a plan for the next race.`,
    alternates: { canonical: `/report/${id}` },
    openGraph: {
      title: `${result.athleteName} — ${result.eventName} race report`,
      url: `${siteUrl()}/report/${id}`,
      images: [{ url: `${siteUrl()}/api/og/result/${id}`, width: 1200, height: 630 }],
      type: "article",
    },
  };
}

export default async function RaceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = getResultsSource();
  const result = await source.getResult(id);
  if (!result) notFound();

  const division = result.divisionLabel.replace("HYROX ", "");

  // Everything the report needs, in parallel. Station distributions are the
  // expensive part — eight reads — and they are what make the banding honest,
  // so they are worth the cost once a day.
  const [event, athlete, fieldTimes, distributionList, winnerPage] = await Promise.all([
    source.getEvent(result.eventSlug),
    source.getAthlete(result.athleteSlug),
    source.getDivisionFinishTimes(result.eventSlug, result.division),
    Promise.all(
      STATION_IDS.map((station) =>
        source.getStationDistribution(station, result.division).catch(() => null),
      ),
    ),
    source.getRanking(result.eventSlug, result.division, { limit: 1 }),
  ]);

  const distributions: Partial<Record<StationId, Distribution>> = {};
  STATION_IDS.forEach((station, i) => {
    const dist = distributionList[i];
    if (dist) distributions[station] = dist;
  });

  const fieldDist = fieldTimes.length ? buildDistribution(fieldTimes) : null;
  const overallPercentile = fieldDist ? percentileOf(fieldDist, result.finishSeconds) : 50;

  const segments = buildSegments(
    result.runs, result.stations, result.roxzoneSeconds,
    result.divisionAverage.runs, result.divisionAverage.stations, result.divisionAverage.roxzone,
  );

  const splits = {
    runs: result.runs,
    stations: result.stations,
    roxzoneSeconds: result.roxzoneSeconds,
    finishSeconds: result.finishSeconds,
  };

  const standings = analyseStations(splits, result.divisionAverage.stations, distributions);
  const weakest = weakestStation(standings);
  const strongest = strongestStation(standings);
  const roxzone = analyseRoxzone(splits, result.divisionAverage.roxzone);
  const running = assessRunning(result.runs);
  const paceStory = buildPaceStory(segments);
  const bands = buildPotentialBands(result.stations, distributions, overallPercentile);
  const potential = projectPotentialFinish(bands, distributions, result.finishSeconds);

  // The winner's splits, for the benchmark. One extra read.
  const winnerId = winnerPage?.rows[0]?.id;
  const winner = winnerId && winnerId !== result.id ? await source.getResult(winnerId) : null;
  const winnerSegments = winner
    ? buildSegments(
        winner.runs, winner.stations, winner.roxzoneSeconds,
        winner.divisionAverage.runs, winner.divisionAverage.stations, winner.divisionAverage.roxzone,
      )
    : [];

  const winnerBySegment: Record<string, number> = {};
  for (const s of winnerSegments) winnerBySegment[s.key] = s.seconds;

  // Only the winner is passed twice because `benchmarkSplits` takes both a
  // "fastest" and a "winner" series; we hold only the latter, and the chart
  // renders only the winner comparison. The caption says so.
  const benchmarks = benchmarkSplits(segments, winnerBySegment, winnerBySegment);

  // The athlete's previous race in the same division, for the comparison.
  const history = (athlete?.races ?? [])
    .filter((r) => r.division === result.division)
    .sort((a, b) => (a.date || String(a.year)).localeCompare(b.date || String(b.year)));
  const currentIndex = history.findIndex((r) => r.resultId === result.id);
  const previousRace = currentIndex > 0 ? history[currentIndex - 1] : null;
  const previousResult = previousRace ? await source.getResult(previousRace.resultId) : null;
  const previousSegments: Segment[] = previousResult
    ? buildSegments(
        previousResult.runs, previousResult.stations, previousResult.roxzoneSeconds,
        previousResult.divisionAverage.runs, previousResult.divisionAverage.stations,
        previousResult.divisionAverage.roxzone,
      )
    : [];
  const comparison = compareToPrevious(segments, previousSegments);

  const nextRace = projectNextRace(
    history.map((r) => r.finishSeconds),
    fieldDist?.sd ?? 600,
  );

  // Room per segment = the gap to the athlete's own ceiling, which is what the
  // plan distributes its savings across.
  const roomBySegment: Record<string, number> = {};
  for (const gap of potential?.gaps ?? []) roomBySegment[gap.station] = gap.secondsAvailable;
  if (roxzone.deltaSeconds > 0) roomBySegment["roxzone"] = roxzone.deltaSeconds;
  const goalSeconds = nextRace?.bands.find((b) => b.name === "great")?.seconds
    ?? result.finishSeconds;
  const plan = buildRacePlan(segments, goalSeconds, roomBySegment);

  const noteContext: NoteContext = {
    runVariationPercent: running?.variationPercent ?? 0,
    fadeSeconds: running?.fadeSeconds ?? 0,
    roxzoneDeltaSeconds: roxzone.deltaSeconds,
    roxzoneShare: roxzone.shareOfRace,
    overallPercentile,
    weakestLabel: weakest?.label ?? "",
    weakestPercentile: weakest?.percentile ?? 50,
    strongestLabel: strongest?.label ?? "",
    strongestPercentile: strongest?.percentile ?? 50,
    secondsAvailable: potential?.secondsAvailable ?? 0,
    netVsPreviousSeconds: comparison?.netSeconds ?? null,
    racesLogged: history.length,
  };

  const isDemo = getDataMode() === "demo";

  /**
   * Section numbers are counted as sections render, not hardcoded.
   *
   * Several sections are conditional — the benchmark disappears for the winner
   * of the division, the comparison for a first race — and with fixed numbers
   * the winner's own report read 06, then 08. To a reader that is a missing
   * page, not a skipped section.
   */
  let sectionNo = 0;
  const nextNumber = () => String(++sectionNo).padStart(2, "0");

  return (
    <div className="results-report mx-auto max-w-[1000px] px-5 py-8 md:py-12">
      {/* ── Cover ─────────────────────────────────────────────────── */}
      <Breadcrumbs trail={[{ name: "Results", path: "/results" }, { name: result.eventName, path: `/event/${result.eventSlug}` }, { name: `${result.athleteName} report`, path: `/report/${result.id}` }]} className="mb-4" />

      <header className="report-cover relative overflow-hidden rounded-lg border border-suth-border-subtle">
        {/* The scrim runs left-to-right, not top-to-bottom.
          *
          * The first version was a dark grayscale photo at 40% opacity under a
          * top-to-bottom scrim on a near-black base, and it rendered as a plain
          * black rectangle — the image loaded, painted, and was invisible.
          * `geo-landing.tsx` has a comment describing exactly this, which is
          * how I recognised it; I still made it first.
          *
          * The text sits on the left, so that is the side that needs to be
          * near-opaque. The right half is where the photograph actually is and
          * it can breathe. */}
        <Image
          src={COVER_PHOTO}
          alt=""
          width={1600}
          height={900}
          priority
          sizes="(min-width: 1000px) 1000px, 100vw"
          className="absolute inset-0 h-full w-full object-cover grayscale"
        />
        {/* The scrim is a four-stop gradient rather than a flat wash, and the
          * image runs at full opacity underneath it.
          *
          * The first attempt dimmed the photograph to 40% and laid a
          * top-to-bottom wash over it, which rendered as a plain black
          * rectangle — a bright, high-contrast start-line shot reduced to
          * nothing. Dimming the image is the wrong lever: it flattens the
          * whole frame to protect one corner of it. Shape the scrim instead,
          * so it is near-opaque under the type on the left and almost absent
          * on the right where the photograph actually is. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg,"
              + " var(--suth-bg-base) 0%,"
              + " color-mix(in srgb, var(--suth-bg-base) 94%, transparent) 32%,"
              + " color-mix(in srgb, var(--suth-bg-base) 62%, transparent) 56%,"
              + " color-mix(in srgb, var(--suth-bg-base) 22%, transparent) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-suth-base to-transparent"
        />
        <div className="relative px-6 py-12 md:px-10 md:py-16">
          <MicroLabel>[ HYROX RACE REPORT ]</MicroLabel>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-suth-text md:text-5xl">
            {result.athleteName}
          </h1>
          <p className="mt-2 text-sm text-suth-text-secondary md:text-base">
            {result.eventName} · {division} · {result.ageGroup} · {nationCode(result.countryIso)}
          </p>
          {event?.venue || event?.startDate ? (
            <p className="mt-1 text-xs text-suth-text-tertiary">
              {[event?.venue, event?.city, event?.startDate].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="results-num mt-6 text-5xl leading-none text-suth-accent md:text-7xl">
            {formatTime(result.finishSeconds)}
          </p>
          <p className="mt-3 text-sm text-suth-text-secondary">
            {formatOrdinal(result.rank)} of {formatCount(result.fieldSize)} in {division}
            {" · "}
            {formatOrdinal(result.ageGroupRank)} in {result.ageGroup}
            {fieldDist ? ` · faster than ${formatPercent(overallPercentile)} of the field` : ""}
          </p>
        </div>
      </header>

      <div className="report-toolbar mt-4 flex flex-wrap items-center justify-between gap-3" data-print-hide>
        <p className="text-xs text-suth-text-tertiary">
          Free, no account. Print or save as PDF — it is laid out for A4.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/result/${result.id}`}
            className="inline-flex min-h-[40px] items-center rounded-sm border border-suth-border px-3 text-xs text-suth-text-secondary hover:text-suth-text"
          >
            Back to the result
          </Link>
          <PrintButton />
        </div>
      </div>

      {isDemo ? (
        <p className="mt-4 rounded-sm border border-suth-warning/40 bg-suth-warning/5 px-3 py-2 text-xs text-suth-warning">
          Demo data. This report is generated from synthetic results and is not a record of a real race.
        </p>
      ) : null}

      {/* ── Overview ──────────────────────────────────────────────── */}
      <ReportSection
        number={nextNumber()}
        title="Overview"
        lede={`Where this race sits in ${division}, station by station.`}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure label="Finish" value={formatTime(result.finishSeconds)} accent />
          <Figure
            label="Running"
            value={formatSplit(result.runs.reduce((s, v) => s + v, 0))}
            note={formatDelta(
              result.runs.reduce((s, v) => s + v, 0)
              - result.divisionAverage.runs.reduce((s, v) => s + v, 0),
            )}
          />
          <Figure
            label="Stations"
            value={formatSplit(STATION_IDS.reduce((s, id) => s + (result.stations[id] ?? 0), 0))}
            note={formatDelta(
              STATION_IDS.reduce((s, id) => s + (result.stations[id] ?? 0), 0)
              - STATION_IDS.reduce((s, id) => s + (result.divisionAverage.stations[id] ?? 0), 0),
            )}
          />
          <Figure
            label="Roxzone"
            value={formatSplit(result.roxzoneSeconds)}
            note={formatDelta(roxzone.deltaSeconds)}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_260px] md:items-center">
          <ReportFigure
            caption={
              `Each spoke is your percentile for that station within ${division}. `
              + `The dashed ring is your overall standard — anything inside it is `
              + `costing you time relative to the rest of your own race.`
            }
          >
            <StationRadar
              points={standings.map((s) => ({ label: s.label, percentile: s.percentile }))}
              standardPercentile={overallPercentile}
            />
          </ReportFigure>

          <dl className="space-y-3 text-sm">
            <Definition term="Overall standard" value={`${formatPercent(overallPercentile)} percentile`} />
            {strongest ? (
              <Definition
                term="Strongest"
                value={strongest.label}
                note={`${formatPercent(strongest.percentile)} percentile`}
              />
            ) : null}
            {weakest ? (
              <Definition
                term="Weakest"
                value={weakest.label}
                note={`${formatPercent(weakest.percentile)} percentile`}
              />
            ) : null}
            <Definition term="Division rank" value={`${formatOrdinal(result.rank)} of ${formatCount(result.fieldSize)}`} />
            <Definition term="Age group" value={`${formatOrdinal(result.ageGroupRank)} in ${result.ageGroup}`} />
          </dl>
        </div>

        <CoachNoteBlock note={stationNote(noteContext)} photo={BEN_PHOTO} />
      </ReportSection>

      {/* ── The story of the race ─────────────────────────────────── */}
      <ReportSection
        number={nextNumber()}
        title="The story of your race"
        lede="Where the finish time was won and lost, checkpoint by checkpoint."
      >
        <ReportFigure
          caption={
            "At each segment this takes the time you had actually spent and adds the division "
            + "average for everything still to come. A falling line means you were pulling away "
            + "from the field as the race went on; a rising one means you were giving it back. "
            + "No model, no prediction — arithmetic on what happened."
          }
        >
          <PaceStoryLine checkpoints={paceStory} finishSeconds={result.finishSeconds} />
        </ReportFigure>
        <CoachNoteBlock note={pacingNote(noteContext)} photo={BEN_PHOTO} />
      </ReportSection>

      <PhotoBreak
        src="/media/images/race/race-sled-push-wide.jpg"
        caption="The sled is where most races are decided, and where most people find out how they paced the first two runs."
      />

      {/* ── Performance against your own standard ─────────────────── */}
      {bands.length > 0 ? (
        <ReportSection
          number={nextNumber()}
          title="Every station against your own standard"
          lede={
            `You raced at the ${formatPercent(overallPercentile)} percentile overall. `
            + `These bands show what someone of that standard typically runs on each station — `
            + `so a split above the middle band is a strength, and one below it is where your time is going.`
          }
        >
          <BandLegend />
          <div className="mt-4 space-y-2.5">
            {bands.map((band) => (
              <div key={band.station} className="report-band-row grid grid-cols-1 gap-1 sm:grid-cols-[128px_1fr_84px] sm:items-center sm:gap-3">
                <span className="text-xs font-semibold text-suth-text">{band.label}</span>
                <BandBar edges={band.edges} actualSeconds={band.actualSeconds} />
                <span className="text-[11px] text-suth-text-tertiary">
                  {BAND_LABEL[band.band]}
                  {band.deltaToExpected !== 0 ? ` · ${formatDelta(band.deltaToExpected)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </ReportSection>
      ) : null}

      {/* ── Potential ─────────────────────────────────────────────── */}
      {potential && potential.secondsAvailable > 0 ? (
        <ReportSection
          number={nextNumber()}
          title="What this race was worth on the same legs"
          lede={
            `Your best station on the day was ${potential.ceilingStation}, at the `
            + `${potential.ceilingPercentile}th percentile. If every other station had matched `
            + `that same level — on the same day, on the same legs — this is where you would have finished.`
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Figure label="You ran" value={formatTime(potential.actualSeconds)} />
            <Figure label="Same-day potential" value={formatTime(potential.potentialSeconds)} accent />
            <Figure label="Available" value={formatSplit(potential.secondsAvailable)} />
          </div>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            Where it is
          </h3>
          <ul className="mt-2 space-y-1.5">
            {potential.gaps.map((gap) => (
              <li key={gap.station} className="flex items-baseline justify-between gap-3 border-b border-suth-border-subtle pb-1.5 text-sm">
                <span className="text-suth-text">{gap.label}</span>
                <span className="results-num text-suth-accent">{formatSplit(gap.secondsAvailable)}</span>
              </li>
            ))}
          </ul>

          <CoachNoteBlock note={potentialNote(noteContext)} photo={BEN_PHOTO} />
        </ReportSection>
      ) : null}

      {/* ── Running ───────────────────────────────────────────────── */}
      {running ? (
        <ReportSection
          number={nextNumber()}
          title="Running assessment"
          lede="How evenly you ran, and what the back half cost you."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Figure label="Run total" value={formatSplit(result.runs.reduce((s, v) => s + v, 0))} />
            <Figure label="Variation" value={`${running.variationPercent}%`} note={BAND_LABEL[running.band]} accent />
            <Figure label="Average lap" value={formatSplit(running.meanCountedSeconds)} note="runs 2–7" />
            <Figure
              label={running.fadeSeconds >= 0 ? "Faded by" : "Negative split"}
              value={formatSplit(Math.abs(running.fadeSeconds))}
              note="back four vs front four"
            />
          </div>

          <ReportFigure
            caption={
              "Runs 1 and 8 are shown but excluded from the variation figure. Run 1 depends on "
              + "where the start line sits, and run 8 absorbs the transition into wall balls — "
              + "including either measures the venue rather than the athlete."
            }
            className="mt-6"
          >
            <RunSplitBars
              runs={running.runs}
              countedIndexes={running.countedIndexes}
              fastestIndex={running.fastestIndex}
              slowestIndex={running.slowestIndex}
            />
          </ReportFigure>

          <CoachNoteBlock note={pacingNote(noteContext)} photo={BEN_PHOTO} />
        </ReportSection>
      ) : null}

      {/* ── Roxzone ───────────────────────────────────────────────── */}
      <ReportSection
        number={nextNumber()}
        title="The roxzone"
        lede="The part of the race nobody trains, and the cheapest time on this sheet."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure label="Your roxzone" value={formatSplit(roxzone.seconds)} />
          <Figure label="Division average" value={formatSplit(result.divisionAverage.roxzone)} />
          <Figure label="Difference" value={formatDelta(roxzone.deltaSeconds)} accent={roxzone.deltaSeconds < 0} />
          <Figure label="Share of race" value={formatPercent(roxzone.shareOfRace * 100, 1)} />
        </div>
        <CoachNoteBlock note={roxzoneNote(noteContext)} photo={BEN_PHOTO} />
      </ReportSection>

      {/* ── Benchmark ─────────────────────────────────────────────── */}
      {winner ? (
        <ReportSection
          number={nextNumber()}
          title={`Against the winner of ${division}`}
          lede={
            `${winner.athleteName} won this division in ${formatTime(winner.finishSeconds)}. `
            + `This is where the gap actually is — it is rarely spread evenly.`
          }
        >
          <ReportFigure
            caption={
              `Only the gap is drawn. Bars to the right of the line are segments where `
              + `${winner.athleteName} was faster than you; bars to the left are ones where you `
              + `were faster. The winner's splits come from the published result — we do not hold `
              + `per-segment records for the whole field, so this is the winner rather than the `
              + `fastest split anyone posted.`
            }
          >
            <BenchmarkBars rows={benchmarks.filter((b) => b.winnerSeconds > 0)} />
          </ReportFigure>
        </ReportSection>
      ) : null}

      <PhotoBreak
        src="/media/images/race/race-wall-ball-wide.jpg"
        caption="A hundred wall balls with nothing after them. What you have left here was decided an hour earlier."
      />

      {/* ── Against your last race ────────────────────────────────── */}
      {comparison && previousRace ? (
        <ReportSection
          number={nextNumber()}
          title="Against your last race"
          lede={
            `Compared with ${previousRace.eventCity} ${previousRace.year} `
            + `(${formatTime(previousRace.finishSeconds)}). `
            + `Net ${formatDelta(comparison.netSeconds)} across the splits that matched.`
          }
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Figure label="This race" value={formatTime(result.finishSeconds)} accent />
            <Figure label="Last race" value={formatTime(previousRace.finishSeconds)} />
            <Figure label="Splits faster" value={String(comparison.improved)} />
            <Figure label="Splits slower" value={String(comparison.regressed)} />
          </div>
          <ReportFigure className="mt-6">
            <SplitDeltaBars deltas={comparison.deltas} />
          </ReportFigure>
          <CoachNoteBlock note={progressNote(noteContext)} photo={BEN_PHOTO} />
        </ReportSection>
      ) : (
        <ReportSection
          number={nextNumber()}
          title="Against your last race"
          lede="Nothing to compare yet — this is the first race we hold for you in this division."
        >
          <CoachNoteBlock note={progressNote(noteContext)} photo={BEN_PHOTO} />
        </ReportSection>
      )}

      {/* ── Next race ─────────────────────────────────────────────── */}
      {nextRace ? (
        <ReportSection
          number={nextNumber()}
          title="What your next race looks like"
          lede={nextRace.note}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {nextRace.bands.map((band) => (
              <Figure
                key={band.name}
                label={BAND_LABEL[band.name]}
                value={formatTime(band.seconds)}
                accent={band.name === "expected"}
                note={
                  band.seconds === result.finishSeconds
                    ? "same as this race"
                    : formatDelta(band.seconds - result.finishSeconds)
                }
              />
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-suth-text-tertiary">
            {nextRace.basis === "history"
              ? `Fitted through your ${nextRace.racesUsed} races in this division and extrapolated `
                + `one race forward. The spread is your own — how far your results actually land `
                + `from your own trend line — so a consistent athlete gets a tight range and a `
                + `streaky one gets a wide one.`
              : `Based on ${nextRace.racesUsed === 1 ? "a single race" : "two races"}, so this is `
                + `a range around your current time rather than a trend. It sharpens considerably `
                + `at three.`}
          </p>
        </ReportSection>
      ) : null}

      {/* ── Race plan ─────────────────────────────────────────────── */}
      {potential && potential.secondsAvailable > 0 && goalSeconds < result.finishSeconds ? (
        <ReportSection
          number={nextNumber()}
          title="Split targets for your next race"
          lede={
            `Built to ${formatTime(goalSeconds)}. Time is taken off each segment in proportion to `
            + `how much room it has against your own best standard, rather than shaved evenly — `
            + `asking the same improvement from your strongest station and your weakest is both `
            + `harder and slower.`
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-sm">
              <caption className="sr-only">Target split times for the next race</caption>
              <thead>
                <tr className="border-b border-suth-border-subtle text-left">
                  <Th>Segment</Th>
                  <Th className="text-right">This race</Th>
                  <Th className="text-right">Target</Th>
                  <Th className="text-right">Change</Th>
                  <Th className="text-right">Elapsed</Th>
                </tr>
              </thead>
              <tbody>
                {plan.map((row) => (
                  <tr key={row.label} className="border-b border-suth-border-subtle last:border-0">
                    <td className="py-1.5 pr-2 text-suth-text">{row.label}</td>
                    <td className="results-num py-1.5 text-right text-suth-text-tertiary">
                      {formatSplit(row.lastSeconds)}
                    </td>
                    <td className="results-num py-1.5 text-right text-suth-text">
                      {formatSplit(row.targetSeconds)}
                    </td>
                    <td className={`results-num py-1.5 text-right ${row.deltaSeconds < 0 ? "text-suth-accent" : "text-suth-text-tertiary"}`}>
                      {row.deltaSeconds === 0 ? "—" : formatDelta(row.deltaSeconds)}
                    </td>
                    <td className="results-num py-1.5 text-right text-suth-text-secondary">
                      {formatTime(row.cumulativeSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      ) : null}

      {/* ── History ───────────────────────────────────────────────── */}
      {history.length > 1 ? (
        <ReportSection
          number={nextNumber()}
          title="Your race history"
          lede={`Every ${division} race we hold for you. Darker means faster within that column.`}
        >
          <HistoryHeatmap
            columns={["Run total", "Stations", "Roxzone"]}
            races={history.map((race) => ({
              label: `${race.eventCity} ${race.year}`,
              finishSeconds: race.finishSeconds,
              values: race.resultId === result.id
                ? [
                    result.runs.reduce((s, v) => s + v, 0),
                    STATION_IDS.reduce((s, x) => s + (result.stations[x] ?? 0), 0),
                    result.roxzoneSeconds,
                  ]
                : race.resultId === previousResult?.id
                  ? [
                      previousResult.runs.reduce((s, v) => s + v, 0),
                      STATION_IDS.reduce((s, x) => s + (previousResult.stations[x] ?? 0), 0),
                      previousResult.roxzoneSeconds,
                    ]
                  : [null, null, null],
            }))}
          />
          <p className="mt-3 text-xs text-suth-text-tertiary">
            Split detail is shown for the races loaded in full. Open any race from your profile to
            add it here.
          </p>
        </ReportSection>
      ) : null}

      {/* ── Method ────────────────────────────────────────────────── */}
      <ReportSection
        number={nextNumber()}
        title="How every figure here was worked out"
        lede="No black box. If you cannot check a number, you cannot train against it."
      >
        <dl className="space-y-3 text-sm leading-relaxed">
          <Method term="Percentiles">
            Computed against every finisher in {division} at this event — {formatCount(fieldTimes.length)} times
            for the overall figure, and the full division sample for each station.
          </Method>
          <Method term="Performance bands">
            Your overall percentile is read back against each station&rsquo;s own distribution. The
            middle band is what an athlete of your standard typically posts there; the others are
            the same distribution read further up and down. Shifting in percentile space rather
            than in seconds matters, because ten points is worth far more time on the sled than on
            the ski erg.
          </Method>
          <Method term="Same-day potential">
            Your strongest station sets the ceiling, and every other station is measured against
            that same percentile. It is deliberately not &ldquo;if you were perfect&rdquo; — you
            proved you could operate at that level on the day, so it is a target rather than a
            fantasy.
          </Method>
          <Method term="The race story">
            At each checkpoint: time actually elapsed, plus the division average for everything
            still to come. Your roxzone is spread evenly across the sixteen timed segments, which
            is why the line lands exactly on your finish time.
          </Method>
          <Method term="Next race">
            A least-squares line through your finish times in this division, extrapolated one race
            forward. The band width is your own residual spread, not a population figure.
          </Method>
          <Method term="What is not here">
            Per-transition roxzone splits, because the timing feed publishes one roxzone total
            rather than eight. Where a benchmark says &ldquo;winner&rdquo; it is the winner&rsquo;s
            split, not the fastest split in the field — we do not hold per-segment records for
            every finisher.
          </Method>
        </dl>
      </ReportSection>

      <RelatedLinks
        title="Keep going"
        links={[
          { href: `/result/${result.id}`, label: "The full result" },
          { href: `/athlete/${result.athleteSlug}`, label: `${result.athleteName}'s profile` },
          { href: "/simulator", label: "Model your next race" },
          { href: "/tools/good-hyrox-time", label: "Is my time good?" },
        ]}
      />
    </div>
  );
}

/* ── Small pieces ───────────────────────────────────────────────────── */

function Figure({
  label, value, note, accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className="report-figure rounded-md border border-suth-border-subtle bg-suth-elevated px-3 py-2.5">
      <MicroLabel>{label}</MicroLabel>
      <p className={`results-num mt-1 text-xl leading-none md:text-2xl ${accent ? "text-suth-accent" : "text-suth-text"}`}>
        {value}
      </p>
      {note ? <p className="mt-1 text-[11px] text-suth-text-tertiary">{note}</p> : null}
    </div>
  );
}

function Definition({ term, value, note }: { term: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-suth-border-subtle pb-2">
      <dt className="text-suth-text-tertiary">{term}</dt>
      <dd className="text-right">
        <span className="text-suth-text">{value}</span>
        {note ? <span className="ml-2 text-[11px] text-suth-text-tertiary">{note}</span> : null}
      </dd>
    </div>
  );
}

function Method({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-suth-text">{term}</dt>
      <dd className="mt-0.5 max-w-3xl text-suth-text-secondary">{children}</dd>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`py-1.5 pr-2 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-suth-text-tertiary ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
