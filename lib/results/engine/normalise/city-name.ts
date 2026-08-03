/**
 * Turning the timing platform's event label into a city we can look up.
 *
 * The source names a weekend, not a place. "2023 Manchester" is easy; most are
 * not. Measured across the 223 events we hold, only 15 carried a country, and
 * the exact-match join left 208 events with no country, no region and no dates —
 * so they could not be filtered, sorted, or given `SportsEvent` markup, and the
 * regional calendars they belong on were empty.
 *
 * Two patterns account for almost all of it, and both are mechanical:
 *
 * 1. **Championship decoration.** The city is buried in a title —
 *    "World Championships Manchester", "Vienna - European Championship",
 *    "Washington D.C. Open North American Championships", "EMEA London Olympia".
 *
 * 2. **German exonyms.** mika:Timing is a German company and labels some
 *    weekends in German: "München", "Wien", "Warschau", "Mailand". The published
 *    HYROX calendar uses the English name, so the join misses every one.
 *
 * What is deliberately *not* resolved: labels that name no city at all — "Elite
 * 12", "World Championships", "Belgium", "Red Bull Monday Night shift: HYROX
 * Invitational". Guessing a city for those would put a real race's country and
 * timezone on something that is not that race, which is worse than a null.
 */

import { normaliseKey } from "./timezones";

/**
 * Local-language city names to the English form the HYROX calendar publishes.
 *
 * Keyed on the normalised form, so "München" and "Muenchen" both land.
 */
export const CITY_EXONYMS: Record<string, string> = {
  munchen: "Munich",
  muenchen: "Munich",
  wien: "Vienna",
  warschau: "Warsaw",
  warszawa: "Warsaw",
  mailand: "Milan",
  milano: "Milan",
  koln: "Cologne",
  koeln: "Cologne",
  nurnberg: "Nuremberg",
  nuernberg: "Nuremberg",
  hameln: "Hamelin",
  braunschweig: "Brunswick",
  kobenhavn: "Copenhagen",
  kopenhagen: "Copenhagen",
  gothenburg: "Goteborg",
  prag: "Prague",
  praha: "Prague",
  lissabon: "Lisbon",
  lisboa: "Lisbon",
  genf: "Geneva",
  geneve: "Geneva",
  zurich: "Zurich",
  brussel: "Brussels",
  bruxelles: "Brussels",
  bruessel: "Brussels",
  // ⚠️ `normaliseKey` keeps spaces — it lowercases and strips accents only — so
  // multi-word keys are written with them.
  "den haag": "The Hague",
  antwerpen: "Antwerp",
  florenz: "Florence",
  firenze: "Florence",
  rom: "Rome",
  roma: "Rome",
  turin: "Turin",
  torino: "Turin",
  neapel: "Naples",
  napoli: "Naples",
  athen: "Athens",
  moskau: "Moscow",
  istanbul: "Istanbul",
  nizza: "Nice",
  strassburg: "Strasbourg",
  sevilla: "Seville",
  saragossa: "Zaragoza",
};

/**
 * Title furniture that wraps a city name rather than being one.
 *
 * Order matters only in that longer phrases must be removed before the shorter
 * phrases they contain, so "North American Open Championship" is stripped before
 * "Championship" gets a chance to leave "Open" behind.
 */
const DECORATIONS = [
  /\bworld\s+championships?\b/gi,
  /\beuropean\s+(?:open\s+)?championships?\b/gi,
  /\bnorth\s+american\s+(?:open\s+)?championships?\b/gi,
  /\bapac\s+championships?\b/gi,
  /\bemea\b/gi,
  /\bmajor\s+championships?\b/gi,
  /\bopen\s+championships?\b/gi,
  /\bchampionships?\b/gi,
  /\bqualifiers?\b/gi,
  /\binvitational\b/gi,
  /\belite\s*\d*\b/gi,
];

/**
 * Venue names that trail a city and are not part of it.
 *
 * Only names that would otherwise defeat the lookup are listed; a general
 * "strip the last word" rule would turn "Cape Town" into "Cape".
 */
const VENUE_SUFFIXES = [/\bolympia\b/gi, /\bexcel\b/gi, /\bmesse\b/gi, /\bexpo\b/gi, /\barena\b/gi];

/**
 * Candidate city names for an event label, best first.
 *
 * Returns several rather than one because the label is ambiguous by nature:
 * "Washington D.C. Open North American Championships" reduces to both
 * "Washington D.C." and "Washington", and only the caller's lookup table knows
 * which one the calendar publishes. Callers try each in turn and take the first
 * that resolves — so a wrong guess costs nothing, but a missing one costs a
 * whole event's metadata.
 */
export function cityCandidates(label: string): string[] {
  const out: string[] = [];
  const push = (value: string) => {
    const trimmed = value.replace(/\s+/g, " ").trim().replace(/^[-–—,:]+|[-–—,:]+$/g, "").trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  };

  push(label);

  // A leading year is the source's own convention: "2023 Manchester".
  let base = label.replace(/^\s*\d{4}\s+/, "").replace(/\s+\d{4}\s*$/, "");
  push(base);

  // "Vienna - European Championship" and "Red Bull …: HYROX Invitational" both
  // put the interesting half on one side of a separator. Try both sides.
  for (const part of base.split(/\s+[-–—:]\s+|:\s+/)) push(part);

  for (const pattern of DECORATIONS) base = base.replace(pattern, " ");
  push(base);

  for (const pattern of VENUE_SUFFIXES) base = base.replace(pattern, " ");
  push(base);

  // The brand appears inside sponsor-titled weekends and is never part of a
  // city: "Sports Direct HYROX London".
  base = base.replace(/\bhyrox\b/gi, " ");
  push(base);

  // Multi-word remnants carry the city plus something the calendar does not use,
  // and which side it sits on varies: a qualifier trails it ("Washington D.C.",
  // "Berlin Youngstars") while a sponsor leads it ("Gainful Anaheim"). Offer
  // both ends, longest first, so a two-word city still beats either of its
  // halves. Taking only the leading words missed every sponsor-titled race.
  const words = base.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  for (let take = Math.min(words.length, 3); take >= 1; take -= 1) {
    push(words.slice(0, take).join(" "));
    push(words.slice(-take).join(" "));
  }

  return out;
}

/**
 * The city name to look up in the published calendar, or null.
 *
 * `known` is the set of city names the calendar actually publishes, normalised.
 * Resolution is closed over that set on purpose: a candidate that matches
 * nothing real is not returned, so "Elite 12" and "Belgium" stay null rather
 * than becoming a plausible-looking guess.
 */
export function resolveCityName(label: string, known: Set<string>): string | null {
  for (const candidate of cityCandidates(label)) {
    const key = normaliseKey(candidate);
    if (!key) continue;
    if (known.has(key)) return candidate;

    const exonym = CITY_EXONYMS[key];
    if (exonym && known.has(normaliseKey(exonym))) return exonym;
  }
  return null;
}
