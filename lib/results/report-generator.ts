/**
 * Automated race reports — brief §5.9.
 *
 * A pure function from event data to structured report content, so it runs
 * identically on a live feed. No React, no data source, no I/O.
 *
 * **House policy, non-negotiable.** These are never written in Ben
 * Sutherland's voice, never signed by him, and never implied to be his
 * opinion. Every sentence this produces is a statement about numbers. The
 * "Ben's Take" slot is separate, empty by default, and only rendered when a
 * human has actually written something — see `hasHumanTake` in the page.
 *
 * Tone: data desk. Factual, short, no adjectives doing work that a number
 * could do instead.
 */

import { STATION_LABEL, type StationId } from "./model";
import { formatTime, formatSplit, formatOrdinal } from "./format";

export type ReportPodiumEntry = {
  rank: number;
  athleteName: string;
  athleteSlug: string;
  resultId: string;
  countryIso: string;
  finishSeconds: number;
  gapToLeaderSeconds: number;
};

export type ReportInput = {
  eventName: string;
  eventCity: string;
  eventSlug: string;
  year: number;
  venue: string;
  startDate: string;
  totalAthletes: number;
  divisions: {
    divisionCode: string;
    label: string;
    headline: boolean;
    finisherCount: number;
    podium: ReportPodiumEntry[];
  }[];
  /** Fastest single split of the weekend, per station, across all divisions. */
  fastestStations: {
    station: StationId;
    seconds: number;
    athleteName: string;
    athleteSlug: string;
    divisionLabel: string;
  }[];
  /** Largest negative split (second half faster than first) of the weekend. */
  biggestNegativeSplit?: {
    athleteName: string;
    athleteSlug: string;
    resultId: string;
    divisionLabel: string;
    differenceSeconds: number;
  };
  /** Standout age-group results — a top finish from outside the youngest brackets. */
  ageGroupStandouts: {
    athleteName: string;
    athleteSlug: string;
    ageGroup: string;
    divisionLabel: string;
    rank: number;
    finishSeconds: number;
  }[];
};

export type RaceReport = {
  headline: string;
  standfirst: string;
  sections: { heading: string; paragraphs: string[] }[];
  statOfTheRace: { label: string; value: string; detail: string } | null;
  podiums: ReportInput["divisions"];
};

/** The label that must appear above every generated report. */
export const AUTOMATED_LABEL = "Automated race report, generated from race data";

export function generateRaceReport(input: ReportInput): RaceReport {
  const headlineDivision =
    input.divisions.find((d) => d.headline && d.podium.length > 0)
    ?? input.divisions.find((d) => d.podium.length > 0);
  const winner = headlineDivision?.podium[0];

  const headline = winner
    ? `${winner.athleteName} wins ${input.eventName} in ${formatTime(winner.finishSeconds)}`
    : `${input.eventName}: full results`;

  const standfirst = [
    `${input.totalAthletes.toLocaleString("en-GB")} athletes raced at ${input.venue}`,
    `across ${input.divisions.length} divisions.`,
  ].join(" ");

  const sections: { heading: string; paragraphs: string[] }[] = [];

  /* ── How it was won ── */
  if (headlineDivision && winner) {
    const second = headlineDivision.podium[1];
    const paragraphs = [
      `${winner.athleteName} took ${headlineDivision.label.replace("HYROX ", "")} in `
      + `${formatTime(winner.finishSeconds)} from a field of `
      + `${headlineDivision.finisherCount.toLocaleString("en-GB")}.`,
    ];
    if (second) {
      const gap = second.gapToLeaderSeconds;
      paragraphs.push(
        gap <= 30
          ? `${second.athleteName} finished ${formatSplit(gap)} back — inside half a minute after `
            + `an hour of racing.`
          : `${second.athleteName} was ${formatSplit(gap)} behind in second.`,
      );
    }
    sections.push({ heading: "How it was won", paragraphs });
  }

  /* ── Fastest splits of the weekend ── */
  if (input.fastestStations.length > 0) {
    const top = input.fastestStations.slice(0, 4);
    sections.push({
      heading: "Fastest splits of the weekend",
      paragraphs: top.map((entry) =>
        `${STATION_LABEL[entry.station]}: ${entry.athleteName} in ${formatSplit(entry.seconds)} `
        + `(${entry.divisionLabel.replace("HYROX ", "")}).`,
      ),
    });
  }

  /* ── Pacing ──
     Only worth reporting if the margin is meaningful. Calling a two-second
     difference "the best-paced race of the weekend" is technically true and
     reads as noise. */
  if (input.biggestNegativeSplit && Math.abs(input.biggestNegativeSplit.differenceSeconds) >= 20) {
    const neg = input.biggestNegativeSplit;
    sections.push({
      heading: "Best-paced race",
      paragraphs: [
        `${neg.athleteName} ran the second half of the runs `
        + `${formatSplit(Math.abs(neg.differenceSeconds))} faster than the first — the largest `
        + `negative split of the weekend in ${neg.divisionLabel.replace("HYROX ", "")}.`,
      ],
    });
  }

  /* ── Age-group standouts ── */
  if (input.ageGroupStandouts.length > 0) {
    sections.push({
      heading: "Age-group standouts",
      paragraphs: input.ageGroupStandouts.slice(0, 4).map((entry) =>
        `${entry.athleteName} (${entry.ageGroup}) finished ${formatOrdinal(entry.rank)} overall in `
        + `${entry.divisionLabel.replace("HYROX ", "")} in ${formatTime(entry.finishSeconds)}.`,
      ),
    });
  }

  /* ── Stat of the race ── */
  const statOfTheRace = pickStat(input);

  return {
    headline,
    standfirst,
    sections,
    statOfTheRace,
    podiums: input.divisions.filter((d) => d.podium.length > 0),
  };
}

/**
 * One number worth remembering. Preference order: a genuinely close finish
 * beats a big field, because a margin is a story and a headcount is not.
 */
function pickStat(input: ReportInput): RaceReport["statOfTheRace"] {
  const closest = input.divisions
    .filter((d) => d.podium.length >= 2)
    .map((d) => ({ division: d, gap: d.podium[1].gapToLeaderSeconds }))
    .sort((a, b) => a.gap - b.gap)[0];

  if (closest && closest.gap <= 60) {
    return {
      label: "Closest win",
      value: formatSplit(closest.gap),
      detail: `${closest.division.podium[0].athleteName} over `
        + `${closest.division.podium[1].athleteName} in `
        + `${closest.division.label.replace("HYROX ", "")}.`,
    };
  }

  const biggest = [...input.divisions].sort((a, b) => b.finisherCount - a.finisherCount)[0];
  if (biggest) {
    return {
      label: "Biggest division",
      value: biggest.finisherCount.toLocaleString("en-GB"),
      detail: `finishers in ${biggest.label.replace("HYROX ", "")}.`,
    };
  }
  return null;
}
