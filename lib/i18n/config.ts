/**
 * Locale configuration for the translated location pages.
 *
 * Kieron, 3 August 2026: could we put some pages in the native language to
 * help ranking. Yes, and it is the difference between competing and not — an
 * English page for "hyrox training berlin" is answered in German by German
 * sites, and no amount of internal linking beats writing in the language the
 * reader searched in.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * This is not a site-wide i18n system. Translating the whole site — quiz,
 * blog, plans, results, checkout — is a different and much larger project, and
 * a half-translated funnel is worse than an English one because it strands the
 * reader mid-flow.
 *
 * What is translated is the location page family, because that is where the
 * language barrier actually costs us the click, and because those pages are
 * data-driven: one copy pack localises every city in that market at once.
 *
 * REVIEW BEFORE INDEXING
 *
 * These translations are written to be idiomatic rather than literal, but they
 * have not been reviewed by a native speaker. Google's guidance is explicit
 * about machine-translated text published without review, and brand voice is
 * the first thing lost in translation. The site is noindex, so there is time:
 * a native review is a prerequisite for opening these to search, not a
 * nice-to-have afterwards.
 */

export type Locale = "de";

export const LOCALES: Locale[] = ["de"];

export type LocaleConfig = {
  /** URL segment and `lang` attribute. */
  code: Locale;
  /** BCP 47 tag for `hreflang` and og:locale. */
  hreflang: string;
  ogLocale: string;
  /** Endonym, for the language switcher. */
  label: string;
  /** Countries this locale is written for, matched against the city catalogue. */
  countries: string[];
};

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  de: {
    code: "de",
    hreflang: "de",
    ogLocale: "de_DE",
    label: "Deutsch",
    // Austria and German-speaking Switzerland read the same pages. Switzerland
    // is also a French market, which is why locale is not derived from country.
    countries: ["Germany", "Austria", "Switzerland"],
  },
};

/** Country names as the locale writes them. */
const COUNTRY_ENDONYM: Record<Locale, Record<string, string>> = {
  de: {
    Germany: "Deutschland",
    Austria: "Österreich",
    Switzerland: "Schweiz",
  },
};

export function localCountry(locale: Locale, country: string): string {
  return COUNTRY_ENDONYM[locale]?.[country] ?? country;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

/** The locales that serve a given country, for the hreflang set on a page. */
export function localesForCountry(country: string): Locale[] {
  return LOCALES.filter((l) => LOCALE_CONFIG[l].countries.includes(country));
}
