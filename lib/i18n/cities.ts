import { LOCALE_CONFIG, type Locale } from "@/lib/i18n/config";
import { RACE_CITIES } from "@/lib/race-cities";
import { INTL_CITIES } from "@/lib/intl-cities";

/**
 * Which cities a locale serves.
 *
 * Drawn from the catalogues we already have rather than a second list, so a
 * city cannot exist in German and not in English, and adding cities to a
 * market localises them automatically.
 */

/**
 * Cities in a locale's countries where that locale is not the local language.
 *
 * Switzerland is the reason this exists: Basel reads German, Geneva reads
 * French, and serving a German page for Geneva would be worse than serving the
 * English one. Listed explicitly because there is no language field in the
 * city data to derive it from, and guessing from coordinates would be worse.
 */
const WRONG_LANGUAGE: Record<Locale, string[]> = {
  // Basel and the German-speaking cantons read German; Geneva reads French.
  de: ["geneva"],
  // Gent is in Flanders and reads Dutch; Basel is German-speaking.
  fr: ["gent", "basel"],
  es: [],
};

/**
 * Endonyms: what the city is called in the language of the page.
 *
 * The first German build shipped "Hyrox Training in Cologne", which defeats
 * the entire purpose — a German reader searches Köln, and a page in German
 * calling the city by its English exonym reads as translated-by-machine to
 * exactly the audience it is meant to convince.
 *
 * Only the cities where the name actually differs are listed. Hamburg,
 * Frankfurt, Karlsruhe, Düsseldorf and Basel are already German.
 */
const ENDONYM: Record<Locale, Record<string, string>> = {
  de: {
    cologne: "Köln",
    vienna: "Wien",
    munich: "München",
    geneva: "Genf",
    zurich: "Zürich",
    nuremberg: "Nürnberg",
  },
  fr: {
    // The catalogue already carries the French spelling for French cities;
    // only the non-French ones this locale serves need a mapping.
    geneva: "Genève",
  },
  es: {
    "mexico-city": "Ciudad de México",
    // The catalogue spells these correctly already, accents included.
  },
};

export type LocalisedCity = { slug: string; name: string; country: string };

/** The city's name in this locale, falling back to the catalogue name. */
export function localName(locale: Locale, slug: string, fallback: string): string {
  return ENDONYM[locale]?.[slug] ?? fallback;
}

export function localisedCities(locale: Locale): LocalisedCity[] {
  const { countries } = LOCALE_CONFIG[locale];
  const excluded = new Set(WRONG_LANGUAGE[locale] ?? []);
  const out: LocalisedCity[] = [];
  for (const c of RACE_CITIES) {
    if (!countries.includes(c.country) || excluded.has(c.slug)) continue;
    out.push({ slug: c.slug, name: localName(locale, c.slug, c.name), country: c.country });
  }
  for (const c of INTL_CITIES) {
    if (!countries.includes(c.country) || excluded.has(c.slug)) continue;
    out.push({ slug: c.slug, name: localName(locale, c.slug, c.name), country: c.country });
  }
  return out;
}

/** Nearest other cities in the same locale, for cross-linking. */
export function localisedNearby(
  locale: Locale,
  slug: string,
  count = 6,
): { slug: string; name: string; km: number }[] {
  const all = localisedCities(locale);
  const coords = (s: string) =>
    RACE_CITIES.find((c) => c.slug === s) ?? INTL_CITIES.find((c) => c.slug === s);
  const here = coords(slug);
  if (!here) return [];
  const R = 6371;
  const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  return all
    .filter((c) => c.slug !== slug)
    .map((c) => {
      const t = coords(c.slug);
      return t ? { slug: c.slug, name: c.name, km: Math.round(km(here, t)) } : null;
    })
    .filter((x): x is { slug: string; name: string; km: number } => x !== null)
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}
