import { describe, expect, it } from "vitest";
import { RACES, homeRaces, upcoming, venueLabel } from "@/lib/hyrox/races";
import { cityCoords, raceCoords, venueCoords } from "@/lib/hyrox/race-geo";
import { getGeoSeo } from "@/lib/locations/seo";

/**
 * The race calendar feeds three surfaces — /hyrox/events, /hyrox/{city} and
 * the 3,764 geo pages — and until this evening the third of them scored four
 * placeholder-dated events against four hard-coded venue coordinates. The
 * dates were invented, they were emitted as structured data, and they were
 * the stated blocker on indexing. These pin the replacement down.
 */

describe("venueLabel reads like a name, not a database field", () => {
  it("drops the street that HYROX joins to the venue name with a dash", () => {
    expect(venueLabel({ venueName: "ExCel - 1 Western Gateway", city: "London" })).toBe("ExCel");
    expect(venueLabel({ venueName: "NEC - Pendigo Way", city: "Birmingham" })).toBe("NEC");
  });

  it("keeps the parenthetical acronyms people actually use", () => {
    expect(
      venueLabel({ venueName: "Scottish Event Campus (SEC)", city: "Glasgow" }),
    ).toBe("Scottish Event Campus (SEC)");
  });

  it("leaves a clean name alone", () => {
    expect(
      venueLabel({ venueName: "Manchester Central Convention Complex", city: "Manchester" }),
    ).toBe("Manchester Central Convention Complex");
  });

  it("falls back to the city rather than rendering nothing", () => {
    expect(venueLabel({ venueName: null, venue: null, city: "Nagoya" })).toBe("Nagoya");
  });
});

describe("the calendar is real", () => {
  it("carries every race hyrox.com listed", () => {
    expect(RACES.length).toBe(113);
  });

  it("returns only unfinished races from upcoming()", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const r of upcoming()) expect(r.endDate >= today).toBe(true);
  });

  it("limits the home calendar to the UK and Ireland", () => {
    for (const r of homeRaces()) {
      expect(["United Kingdom", "Ireland"]).toContain(r.country);
    }
  });
});

describe("race coordinates come from the geocoder, not from constants", () => {
  it("places every home race, so no UK town is left without a nearest race", () => {
    for (const r of homeRaces()) expect(raceCoords(r)).toBeDefined();
  });

  it("prefers the venue over the city centroid where both exist", () => {
    const withVenue = homeRaces().find((r) => venueCoords(r.slug));
    expect(withVenue).toBeDefined();
    expect(raceCoords(withVenue!)).toEqual(venueCoords(withVenue!.slug));
  });

  it("returns undefined rather than a wrong point for an unknown place", () => {
    expect(cityCoords("Atlantis")).toBeUndefined();
    expect(venueCoords("hyrox-atlantis")).toBeUndefined();
  });
});

describe("a UK town's nearest race", () => {
  it("names a real venue at a real date, never a rolled-forward guess", () => {
    const leeds = getGeoSeo("leeds").nearestRace;
    expect(leeds).toBeDefined();
    expect(leeds!.rolledForward).toBe(false);
    // The date must be one the calendar actually carries.
    expect(RACES.some((r) => r.slug === leeds!.eventSlug)).toBe(true);
    expect(RACES.find((r) => r.slug === leeds!.eventSlug)!.startDate).toBe(
      leeds!.startDate,
    );
  });

  it("picks Manchester for Leeds and London for Canterbury", () => {
    // Sanity on the distance sort: these are not close calls either way.
    expect(getGeoSeo("leeds").nearestRace?.city).toBe("Manchester");
    expect(getGeoSeo("canterbury").nearestRace?.city).toBe("London");
  });

  it("never advertises a race weekend that has already been and gone", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const slug of ["leeds", "inverness", "canterbury", "swansea", "norwich"]) {
      const race = getGeoSeo(slug).nearestRace;
      expect(race).toBeDefined();
      expect(race!.startDate >= today).toBe(true);
    }
  });
});
