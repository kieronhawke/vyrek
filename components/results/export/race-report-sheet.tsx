import {
  STATION_IDS, STATION_LABEL, type StationId,
} from "@/lib/results/model";
import { formatTime, formatSplit, formatDelta, formatOrdinal, formatPercent, nationCode } from "@/lib/results/format";
import type { PacingReport, RoxzoneReport, StationStanding, WhatIfResult } from "@/lib/results/analysis";

/**
 * The printed race report.
 *
 * Screen-only on `display: none`; `results-print.css` reveals it and hides the
 * interactive page. That separation is the point — the first version printed
 * the web page, and a web page makes a poor document: interactive controls
 * become dead ink, charts sized for a viewport waste a third of the paper, and
 * a reader loses the summary that the screen puts behind a tap.
 *
 * This is laid out for A4: a masthead, the four numbers that matter, a full
 * segment table with every split against the division average, the analysis in
 * prose, and a footer that makes the sheet attributable. One page for most
 * races, two at most.
 *
 * A table rather than a chart, deliberately. On paper you want to read exact
 * values and compare columns; a bar you cannot hover is decoration.
 */
export function RaceReportSheet({
  athleteName, eventName, eventCity, divisionLabel, ageGroup, countryIso,
  rank, fieldSize, ageGroupRank, finishSeconds, percentile,
  runs, stations, roxzoneSeconds,
  averageRuns, averageStations, averageRoxzone,
  standings, pacing, roxzone, whatIf, generatedOn, isDemo,
}: {
  athleteName: string;
  eventName: string;
  eventCity: string;
  divisionLabel: string;
  ageGroup: string;
  countryIso: string;
  rank: number;
  fieldSize: number;
  ageGroupRank: number;
  finishSeconds: number;
  percentile: number;
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  averageRuns: number[];
  averageStations: Record<StationId, number>;
  averageRoxzone: number;
  standings: StationStanding[];
  pacing: PacingReport;
  roxzone: RoxzoneReport;
  whatIf: WhatIfResult | null;
  generatedOn: string;
  isDemo: boolean;
}) {
  const runTotal = runs.reduce((s, v) => s + v, 0);
  const runAverage = averageRuns.reduce((s, v) => s + v, 0);
  const stationTotal = STATION_IDS.reduce((s, id) => s + (stations[id] ?? 0), 0);
  const stationAverage = STATION_IDS.reduce((s, id) => s + (averageStations[id] ?? 0), 0);

  const rows: { label: string; kind: string; seconds: number; average: number }[] = [];
  STATION_IDS.forEach((station, i) => {
    rows.push({ label: `Run ${i + 1}`, kind: "Run", seconds: runs[i] ?? 0, average: averageRuns[i] ?? 0 });
    rows.push({
      label: STATION_LABEL[station], kind: "Station",
      seconds: stations[station] ?? 0, average: averageStations[station] ?? 0,
    });
  });

  const weakest = [...standings].sort((a, b) => a.percentile - b.percentile)[0];
  const strongest = [...standings].sort((a, b) => b.percentile - a.percentile)[0];

  return (
    <div className="results-print-sheet" aria-hidden>
      {/* Masthead */}
      <header className="print-masthead">
        <div>
          <p className="print-eyebrow">HYROX RACE REPORT</p>
          <h1 className="print-name">{athleteName}</h1>
          <p className="print-sub">
            {eventName} · {divisionLabel.replace("HYROX ", "")} · {ageGroup} · {nationCode(countryIso)}
          </p>
        </div>
        <div className="print-brand">
          <p className="print-brand-name">SUTH PERFORMANCE</p>
          <p className="print-brand-url">suthperformance.com/results</p>
        </div>
      </header>

      {/* Headline figures */}
      <section className="print-figures">
        <Figure label="Finish" value={formatTime(finishSeconds)} big />
        <Figure label="Overall" value={formatOrdinal(rank)} note={`of ${fieldSize.toLocaleString("en-GB")}`} />
        <Figure label="Age group" value={formatOrdinal(ageGroupRank)} note={ageGroup} />
        <Figure label="Percentile" value={formatPercent(percentile)} note="of this division" />
      </section>

      {/* Where the time went */}
      <section className="print-block">
        <h2 className="print-h2">Where the time went</h2>
        <table className="print-split-summary">
          <tbody>
            <tr>
              <th scope="row">Running</th>
              <td>{formatSplit(runTotal)}</td>
              <td>{formatSplit(runAverage)}</td>
              <td className={runTotal <= runAverage ? "print-fast" : "print-slow"}>
                {formatDelta(runTotal - runAverage)}
              </td>
              <td>{formatPercent((runTotal / finishSeconds) * 100)}</td>
            </tr>
            <tr>
              <th scope="row">Stations</th>
              <td>{formatSplit(stationTotal)}</td>
              <td>{formatSplit(stationAverage)}</td>
              <td className={stationTotal <= stationAverage ? "print-fast" : "print-slow"}>
                {formatDelta(stationTotal - stationAverage)}
              </td>
              <td>{formatPercent((stationTotal / finishSeconds) * 100)}</td>
            </tr>
            <tr>
              <th scope="row">Roxzone</th>
              <td>{formatSplit(roxzoneSeconds)}</td>
              <td>{formatSplit(averageRoxzone)}</td>
              <td className={roxzoneSeconds <= averageRoxzone ? "print-fast" : "print-slow"}>
                {formatDelta(roxzoneSeconds - averageRoxzone)}
              </td>
              <td>{formatPercent((roxzoneSeconds / finishSeconds) * 100)}</td>
            </tr>
          </tbody>
          <thead>
            <tr>
              <th scope="col">Block</th>
              <th scope="col">You</th>
              <th scope="col">Division avg</th>
              <th scope="col">Delta</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
        </table>
      </section>

      {/* Full segment table */}
      <section className="print-block">
        <h2 className="print-h2">Every segment</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Segment</th>
              <th scope="col">Type</th>
              <th scope="col" className="print-right">Your time</th>
              <th scope="col" className="print-right">Division avg</th>
              <th scope="col" className="print-right">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label}>
                <td className="print-dim">{i + 1}</td>
                <th scope="row">{row.label}</th>
                <td className="print-dim">{row.kind}</td>
                <td className="print-right">{formatSplit(row.seconds)}</td>
                <td className="print-right print-dim">{formatSplit(row.average)}</td>
                <td className={`print-right ${row.seconds <= row.average ? "print-fast" : "print-slow"}`}>
                  {formatDelta(row.seconds - row.average)}
                </td>
              </tr>
            ))}
            <tr className="print-total">
              <td />
              <th scope="row">Roxzone</th>
              <td className="print-dim">Transition</td>
              <td className="print-right">{formatSplit(roxzoneSeconds)}</td>
              <td className="print-right print-dim">{formatSplit(averageRoxzone)}</td>
              <td className={`print-right ${roxzoneSeconds <= averageRoxzone ? "print-fast" : "print-slow"}`}>
                {formatDelta(roxzoneSeconds - averageRoxzone)}
              </td>
            </tr>
            <tr className="print-total">
              <td />
              <th scope="row">Finish</th>
              <td />
              <td className="print-right">{formatTime(finishSeconds)}</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      {/* Analysis, in prose */}
      <section className="print-block">
        <h2 className="print-h2">What the numbers say</h2>
        <dl className="print-analysis">
          <div>
            <dt>Pacing</dt>
            <dd>
              {pacing.verdict === "fading"
                ? `Faded in the back half — the second half of the runs was ${formatSplit(Math.abs(pacing.splitDifferenceSeconds))} slower than the first.`
                : pacing.verdict === "negative-split"
                  ? `Negative split — the second half of the runs was ${formatSplit(Math.abs(pacing.splitDifferenceSeconds))} faster than the first.`
                  : "Even pacing across the eight runs."}
              {" "}Consistency {pacing.consistency}/100. Fastest run {formatSplit(pacing.fastestRun.seconds)} (run {pacing.fastestRun.index + 1}),
              slowest {formatSplit(pacing.slowestRun.seconds)} (run {pacing.slowestRun.index + 1}).
            </dd>
          </div>
          <div>
            <dt>Transitions</dt>
            <dd>
              {formatSplit(roxzone.seconds)} in the Roxzone, {formatPercent(roxzone.shareOfRace * 100, 1)} of the race.
              {roxzone.verdict === "leaking"
                ? ` That is ${formatSplit(roxzone.deltaSeconds)} slower than the division average — the cheapest time on this sheet to win back.`
                : roxzone.verdict === "sharp"
                  ? ` Sharper than the division average by ${formatSplit(Math.abs(roxzone.deltaSeconds))}.`
                  : " In line with the division average."}
            </dd>
          </div>
          {weakest ? (
            <div>
              <dt>Weakest station</dt>
              <dd>
                {weakest.label} at {formatSplit(weakest.seconds)}, {formatDelta(weakest.deltaSeconds)} against
                the division and in the {formatPercent(weakest.percentile)} percentile for this segment.
                {strongest && strongest.station !== weakest.station
                  ? ` Strongest is ${strongest.label} at ${formatPercent(strongest.percentile)}.`
                  : ""}
              </dd>
            </div>
          ) : null}
          {whatIf && whatIf.secondsSaved > 0 ? (
            <div>
              <dt>What one change is worth</dt>
              <dd>
                Bringing {whatIf.label} to the division median ({formatSplit(whatIf.targetSeconds)}) saves{" "}
                {formatSplit(whatIf.secondsSaved)} and moves this result from {formatOrdinal(rank)} to{" "}
                {formatOrdinal(whatIf.projectedRank)} — {whatIf.ranksGained.toLocaleString("en-GB")} places.
                Every other split held fixed.
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <footer className="print-footer">
        <span>
          {athleteName} · {eventName} · {eventCity} · generated {generatedOn}
        </span>
        <span>
          suthperformance.com/results{isDemo ? " · DEMO DATA, not a record of a real race" : ""}
        </span>
      </footer>
    </div>
  );
}

function Figure({
  label, value, note, big,
}: {
  label: string;
  value: string;
  note?: string;
  big?: boolean;
}) {
  return (
    <div className={big ? "print-figure print-figure-big" : "print-figure"}>
      <p className="print-figure-label">{label}</p>
      <p className="print-figure-value">{value}</p>
      {note ? <p className="print-figure-note">{note}</p> : null}
    </div>
  );
}
