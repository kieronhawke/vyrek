import type { UkLocation } from "@/lib/uk-locations";
import { getLocationBySlug, listLocationSlugs } from "@/lib/uk-locations";
import type { GeoSeo } from "@/lib/locations/seo";
import { getGeoSeo, geoRobots } from "@/lib/locations/seo";
import {
  getFocusCity,
  getFocusCityGeo,
  focusCityAsLocation,
  listFocusCitySlugs,
} from "@/lib/focus-cities";
import {
  RACE_CITIES,
  getRaceCityBySlug,
  getRaceCityGeo,
  listRaceCitySlugs,
  nearbyRaceCities,
  raceCityAsLocation,
  type RaceCity,
} from "@/lib/race-cities";

/**
 * One resolver for both geo page families.
 *
 * /personal-trainer/[location] and /hyrox-training/[location] each serve two
 * catalogues that were built at different times from different sources: the
 * 1,882 UK towns from GeoNames, and the 91 international cities from HYROX's
 * own race calendar. Everything downstream — the template, the JSON-LD, the
 * sitemap — wants one shape, and the route files should not each be growing
 * their own copy of the branch.
 *
 * Both families resolve the same slug space, so a slug is looked up in the UK
 * registry first and the race cities second. The four names both catalogues
 * claim (Perth, Boston, Houston, Portland) are qualified on the international
 * side at build time, in scripts/build-race-cities.mjs, so the two never
 * actually compete for a slug here.
 */

export type ResolvedGeo = {
  loc: UkLocation;
  seo: GeoSeo;
  /** Present only for the international race cities. */
  city?: RaceCity;
  /** Set on a focus city that carries the in-person VIP offer. */
  vip?: { city: string; country: string };
  robots: { index: boolean; follow: boolean };
  /** The directory this page sits under, for breadcrumbs and cross-links. */
  parent: { name: string; path: (base: string) => string };
  nearby?: { items: { slug: string; name: string; km: number }[]; heading: string };
};

export function listAllGeoSlugs(): string[] {
  return [...listLocationSlugs(), ...listRaceCitySlugs(), ...listFocusCitySlugs()];
}

export function resolveGeo(slug: string): ResolvedGeo | undefined {
  const uk = getLocationBySlug(slug);
  if (uk) {
    return {
      loc: uk,
      seo: getGeoSeo(slug),
      robots: geoRobots(slug),
      parent: {
        name: uk.region,
        path: (base) => `${base}/in/${regionSlugOf(uk.region)}`,
      },
    };
  }

  /* Focus cities: markets we target that carry no race, so they cannot come
     from the race-city catalogue. Dubai is the first. */
  const focus = getFocusCity(slug);
  if (focus) {
    return {
      loc: focusCityAsLocation(focus),
      seo: getFocusCityGeo(slug),
      robots: { index: true, follow: true },
      vip: focus.vip ? { city: focus.name, country: focus.country } : undefined,
      parent: {
        name: focus.country,
        path: (base) => `${base}/country/${focus.countrySlug}`,
      },
    };
  }

  const city = getRaceCityBySlug(slug);
  if (!city) return undefined;

  const nearby = nearbyRaceCities(slug, 6);
  return {
    loc: raceCityAsLocation(city),
    seo: getRaceCityGeo(slug),
    city,
    /* Every city in this set hosts a race, which is the local substance the
       index rule asks for. There is no thin-page case to guard against here
       the way there is for a 5,000-person town with no data. */
    robots: { index: true, follow: true },
    parent: {
      name: city.country,
      path: (base) => `${base}/country/${city.countrySlug}`,
    },
    nearby: nearby.length
      ? {
          items: nearby,
          heading: `Other cities on the HYROX calendar. The programme is the same wherever you race — these are the ones closest to ${city.name}.`,
        }
      : undefined,
  };
}

/** Local copy so this module does not pull the whole UK catalogue in. */
function regionSlugOf(region: string): string {
  return region.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * The coaching page for a race's host city, if we have one.
 *
 * The 113 race pages carried no link into the geo programme and the city pages
 * carried none back, which left the two halves of the site that are most
 * obviously about the same thing — this race, and the twelve weeks before it —
 * completely disconnected. It is the highest-intent link available: somebody
 * reading the HYROX Cologne page has already told us what they want.
 *
 * Matched on name *and* country rather than a slugified name, because four
 * cities exist twice in the slug space. Slugifying "Boston" alone would send a
 * reader of the Massachusetts race to a page about Lincolnshire.
 */
export function coachingSlugForRace(race: {
  city: string;
  country: string | null;
}): string | undefined {
  const intl = RACE_CITIES.find(
    (c) => c.name === race.city && c.country === race.country,
  );
  if (intl) return intl.slug;

  // UK host cities live in the UK registry rather than the race-city set.
  const slug = race.city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return getLocationBySlug(slug) ? slug : undefined;
}
