/**
 * The places that get their own race calendar.
 *
 * "hyrox uk", "hyrox india", "hyrox hong kong" are searches people actually
 * make, and `/events?region=UK` answers none of them: a query string is a filter,
 * not a page, and it ranks for nothing. Each entry here is a real URL with its
 * own title, its own copy and its own indexable calendar.
 *
 * Two kinds, deliberately mixed. **Regions** map onto the `region` facet the
 * engine already writes. **Countries** are finer than that facet — "hyrox
 * germany" is a much larger search than "hyrox europe" — and match on the
 * country name instead.
 *
 * The list is curated rather than generated. A page per country that has ever
 * hosted a race would be a long tail of one-event pages competing with each
 * other; these are the markets with enough history to be worth reading.
 */

import type { EventSummary } from "./source";

export type Place = {
  slug: string;
  /** How the place is named in a sentence: "in the UK", "in Germany". */
  label: string;
  kind: "region" | "country";
  /** Matched against `EventSummary.region` or `.country`. */
  match: string;
  title: string;
  description: string;
  blurb: string;
};

export const PLACES: Place[] = [
  {
    slug: "uk",
    label: "the UK",
    kind: "region",
    match: "UK",
    title: "HYROX UK: Every Race, Result and Date",
    description:
      "Every HYROX race held in the United Kingdom — London, Manchester, Birmingham, "
      + "Glasgow and the rest — with full results, start lists and entrant counts.",
    blurb:
      "The UK is one of HYROX's biggest markets and its calendar is the busiest outside "
      + "Germany. Every British race is here, newest first, with the full field for each.",
  },
  {
    slug: "germany",
    label: "Germany",
    kind: "country",
    match: "Germany",
    title: "HYROX Germany: Every Race and Result",
    description:
      "Every HYROX race in Germany — Berlin, Hamburg, Munich, Cologne, Stuttgart and more — "
      + "with complete results and fields.",
    blurb:
      "HYROX started in Germany, and the German calendar runs deeper than anywhere else. "
      + "These are every race and every result, back to the first seasons.",
  },
  {
    slug: "usa",
    label: "the United States",
    kind: "country",
    match: "United States",
    title: "HYROX USA: Every Race and Result",
    description:
      "Every HYROX race in the United States — New York, Chicago, Dallas, Los Angeles, "
      + "Miami and more — with full results and start lists.",
    blurb:
      "The American calendar has grown faster than any other. Every US race is here with "
      + "its complete field.",
  },
  {
    slug: "india",
    label: "India",
    kind: "country",
    match: "India",
    title: "HYROX India: Races, Results and Dates",
    description:
      "HYROX in India — every race held so far, with full results, division breakdowns "
      + "and entrant counts.",
    blurb:
      "HYROX is new to India and the calendar is still short, which makes it the easiest "
      + "place to see the whole picture at once. Every Indian race and result is here.",
  },
  {
    slug: "hong-kong",
    label: "Hong Kong",
    kind: "country",
    match: "Hong Kong",
    title: "HYROX Hong Kong: Races, Results and Dates",
    description:
      "Every HYROX race in Hong Kong, with complete results by division, start lists "
      + "and finishing times.",
    blurb:
      "Hong Kong hosts one of the strongest fields in Asia. Every race held there is "
      + "here with its full result.",
  },
  {
    slug: "spain",
    label: "Spain",
    kind: "country",
    match: "Spain",
    title: "HYROX Spain: Every Race and Result",
    description:
      "Every HYROX race in Spain — Madrid, Barcelona, Valencia and more — with full "
      + "results and entrant counts.",
    blurb: "Spain runs one of the fullest calendars in Europe. Every race and result is here.",
  },
  {
    slug: "netherlands",
    label: "the Netherlands",
    kind: "country",
    match: "Netherlands",
    title: "HYROX Netherlands: Every Race and Result",
    description:
      "Every HYROX race in the Netherlands — Amsterdam, Rotterdam, Maastricht and more — "
      + "with complete results.",
    blurb: "Dutch races draw large, fast fields. Every one is here with its full result.",
  },
  {
    slug: "australia",
    label: "Australia",
    kind: "country",
    match: "Australia",
    title: "HYROX Australia: Every Race and Result",
    description:
      "Every HYROX race in Australia — Sydney, Melbourne, Brisbane, Perth — with full "
      + "results and start lists.",
    blurb: "The Australian calendar and every result from it, newest race first.",
  },
  {
    slug: "europe",
    label: "Europe",
    kind: "region",
    match: "Europe",
    title: "HYROX Europe: The Full Race Calendar",
    description:
      "Every HYROX race across Europe by season and country, with results, start lists "
      + "and entrant counts.",
    blurb:
      "Europe is where HYROX has the most history and the deepest fields. Every European "
      + "race is here, grouped by season.",
  },
  {
    slug: "asia",
    label: "Asia",
    kind: "region",
    match: "Asia",
    title: "HYROX Asia: The Full Race Calendar",
    description:
      "Every HYROX race across Asia — Hong Kong, Singapore, Tokyo, Shanghai, Dubai and "
      + "more — with complete results.",
    blurb: "The Asian calendar, from the earliest races to the most recent, with full results.",
  },
  {
    slug: "americas",
    label: "the Americas",
    kind: "region",
    match: "Americas",
    title: "HYROX Americas: The Full Race Calendar",
    description:
      "Every HYROX race across North, Central and South America, with results, start "
      + "lists and fields.",
    blurb: "Every race held across the Americas, grouped by season and newest first.",
  },
  {
    slug: "oceania",
    label: "Oceania",
    kind: "region",
    match: "Oceania",
    title: "HYROX Oceania: Every Race and Result",
    description:
      "Every HYROX race in Australia and New Zealand, with full results and entrant counts.",
    blurb: "The Oceania calendar and every result from it.",
  },
];

export function placeBySlug(slug: string): Place | null {
  return PLACES.find((p) => p.slug === slug) ?? null;
}

/** Events at this place, newest first. */
export function eventsAtPlace(place: Place, events: EventSummary[]): EventSummary[] {
  const matched = events.filter((event) =>
    place.kind === "region" ? event.region === place.match : event.country === place.match,
  );
  return matched.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
}
