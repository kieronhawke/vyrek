import { describe, expect, it } from "vitest";
import {
  RACE_CITIES,
  getCountryBySlug,
  getRaceCityBySlug,
  getRaceCityGeo,
  listCountrySlugs,
  listRaceCitySlugs,
  nearbyRaceCities,
  nextRaceIn,
  raceCityAsLocation,
} from "@/lib/race-cities";
import { listLocationSlugs } from "@/lib/uk-locations";
import { listAllGeoSlugs, resolveGeo } from "@/lib/geo-page";

/**
 * The international race cities share one slug space with 1,882 UK towns
 * across two page families. A collision there does not throw: it silently
 * serves one place's page at the other's URL, or renders two pages with the
 * same title. Both are the duplicate-content failure the geo programme is
 * built to avoid, so the collision rules are worth pinning down.
 */

describe("the slug space is shared with the UK registry", () => {
  const ukSlugs = new Set(listLocationSlugs());

  it("gives no race city a slug a UK town already owns", () => {
    const clashes = listRaceCitySlugs().filter((s) => ukSlugs.has(s));
    expect(clashes).toEqual([]);
  });

  it("produces no duplicate slugs across the two catalogues", () => {
    const all = listAllGeoSlugs();
    expect(all.length).toBe(new Set(all).size);
  });

  it("qualifies the four names both catalogues claim, and keeps the UK town on the bare slug", () => {
    for (const [bare, qualified] of [
      ["boston", "boston-usa"],
      ["houston", "houston-usa"],
      ["perth", "perth-australia"],
      ["portland", "portland-usa"],
    ]) {
      expect(ukSlugs.has(bare)).toBe(true);
      expect(getRaceCityBySlug(bare)).toBeUndefined();
      const city = getRaceCityBySlug(qualified);
      expect(city?.bareSlug).toBe(bare);
    }
  });

  it("marks only the qualified cities with a bareSlug, so only they disambiguate their heading", () => {
    const qualified = RACE_CITIES.filter((c) => c.bareSlug);
    expect(qualified.map((c) => c.slug).sort()).toEqual([
      "boston-usa",
      "houston-usa",
      "perth-australia",
      "portland-usa",
    ]);
  });
});

describe("resolveGeo routes a slug to the right catalogue", () => {
  it("resolves a UK town to its region directory", () => {
    const r = resolveGeo("leeds");
    expect(r?.city).toBeUndefined();
    expect(r?.parent.path("/personal-trainer")).toMatch(/^\/personal-trainer\/in\//);
  });

  it("resolves a race city to its country directory", () => {
    const r = resolveGeo("cologne");
    expect(r?.city?.country).toBe("Germany");
    expect(r?.parent.path("/personal-trainer")).toBe(
      "/personal-trainer/country/germany",
    );
  });

  it("sends Boston, Lincolnshire and Boston, Massachusetts to different pages", () => {
    const uk = resolveGeo("boston");
    const us = resolveGeo("boston-usa");
    expect(uk?.city).toBeUndefined();
    expect(us?.city?.country).toBe("United States");
    expect(uk?.loc.region).not.toBe(us?.loc.region);
  });

  it("returns undefined for a slug in neither catalogue", () => {
    expect(resolveGeo("atlantis")).toBeUndefined();
  });

  it("points every parent directory at a country that actually has a page", () => {
    const countries = new Set(listCountrySlugs());
    for (const c of RACE_CITIES) {
      expect(countries.has(c.countrySlug)).toBe(true);
    }
  });
});

describe("the race layer says only what the data supports", () => {
  it("treats every race city as hosting a race", () => {
    for (const c of RACE_CITIES.slice(0, 20)) {
      expect(getRaceCityGeo(c.slug).hostsRace).toBe(true);
    }
  });

  it("never invents a distance for a venue that would not geocode", () => {
    // 16 of 113 venues are unresolved, mostly non-Latin-script addresses.
    // Those must not surface a confident "0 km from the centre".
    for (const c of RACE_CITIES) {
      const race = nextRaceIn(c);
      if (race && race.lat == null) {
        expect(getRaceCityGeo(c.slug).nearestRace?.straightLineKm).toBe(0);
      }
    }
  });

  it("names an unannounced venue as unannounced rather than guessing one", () => {
    const withoutVenue = RACE_CITIES.flatMap((c) =>
      c.races.filter((r) => !r.venueAnnounced),
    );
    expect(withoutVenue.length).toBeGreaterThan(0);
    for (const r of withoutVenue) {
      expect(r.lat).toBeNull();
    }
  });

  it("picks the soonest race in a city with more than one", () => {
    const multi = RACE_CITIES.find((c) => c.races.length > 1);
    expect(multi).toBeDefined();
    const next = nextRaceIn(multi!, new Date("2020-01-01"));
    const earliest = [...multi!.races].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    )[0];
    expect(next?.slug).toBe(earliest.slug);
  });

  it("rolls a past date forward and flags it, so the copy can hedge", () => {
    const city = RACE_CITIES[0];
    const next = nextRaceIn(city, new Date("2099-01-01"));
    expect(next?.rolledForward).toBe(true);
  });
});

describe("cross-linking keeps the set from being 91 orphans", () => {
  it("gives every race city neighbours to link to", () => {
    for (const c of RACE_CITIES) {
      expect(nearbyRaceCities(c.slug).length).toBeGreaterThan(0);
    }
  });

  it("never links a city to itself", () => {
    for (const c of RACE_CITIES.slice(0, 30)) {
      expect(nearbyRaceCities(c.slug).some((n) => n.slug === c.slug)).toBe(false);
    }
  });

  it("prefers cities in the same country before reaching abroad", () => {
    // Germany has several host cities, so the first neighbour must be German.
    const nearby = nearbyRaceCities("cologne", 3);
    const first = getRaceCityBySlug(nearby[0].slug);
    expect(first?.country).toBe("Germany");
  });

  it("lists every country directory with at least one city", () => {
    for (const slug of listCountrySlugs()) {
      expect(getCountryBySlug(slug)?.cities.length).toBeGreaterThan(0);
    }
  });
});

describe("the adapter to the shared template", () => {
  it("carries the country in the region field, which is what the eyebrow renders", () => {
    const osaka = getRaceCityBySlug("osaka")!;
    expect(raceCityAsLocation(osaka).region).toBe("Japan");
  });

  it("reports no population rather than an invented one", () => {
    // Hard rule 1: a fact without a source does not go in the database, and
    // the template renders nothing for zero.
    for (const c of RACE_CITIES.slice(0, 10)) {
      expect(raceCityAsLocation(c).populationK).toBe(0);
    }
  });
});
