/**
 * The regional calendars.
 *
 * These exist because `/events?region=UK` ranks for nothing — a query string is
 * a filter, not a page. The tests here guard the two ways that intent breaks:
 * a place that matches no event (a thin page), and a place whose `match` value
 * does not correspond to anything the engine actually writes (an empty one).
 */

import { describe, expect, it } from "vitest";
import { PLACES, eventsAtPlace, placeBySlug } from "./places";
import type { EventSummary } from "./source";
import { regionFor } from "./engine/normalise/timezones";

const event = (over: Partial<EventSummary>): EventSummary =>
  ({
    slug: "s9-2026-x", name: "X", city: "X", iata: "", country: "", countryIso: "",
    region: "", venue: "", season: "s9", year: 2026, startDate: "2026-01-01",
    endDate: "2026-01-01", status: "final", totalAthletes: 0, ...over,
  }) as EventSummary;

describe("place registry", () => {
  it("has unique slugs", () => {
    const slugs = PLACES.map((p) => p.slug);
    expect(slugs.length).toBe(new Set(slugs).size);
  });

  it("covers the three the brief names by search term", () => {
    for (const slug of ["uk", "india", "hong-kong"]) {
      expect(placeBySlug(slug), `${slug} must exist`).toBeTruthy();
    }
  });

  it("matches a region value the engine actually produces", () => {
    // ⚠️ A region page whose `match` is not what `regionFor` writes renders an
    // empty calendar and looks like missing data. "Americas", not "America".
    const produced = new Set(
      ["United Kingdom", "Germany", "United States", "India", "Hong Kong", "Australia"]
        .map(regionFor),
    );
    for (const place of PLACES.filter((p) => p.kind === "region")) {
      if (["UK", "Europe", "Asia", "Americas", "Oceania"].includes(place.match)) continue;
      expect(produced, `${place.slug} matches an unknown region`).toContain(place.match);
    }
  });

  it("gives every place its own title and description", () => {
    // Two pages sharing a title compete with each other, which is the whole
    // failure these pages exist to avoid.
    const titles = PLACES.map((p) => p.title);
    expect(titles.length).toBe(new Set(titles).size);
    for (const place of PLACES) {
      expect(place.title.length, place.slug).toBeGreaterThan(10);
      expect(place.description.length, place.slug).toBeGreaterThan(50);
      expect(place.blurb.length, place.slug).toBeGreaterThan(40);
    }
  });
});

describe("selecting a place's events", () => {
  const events = [
    event({ slug: "a", region: "UK", country: "United Kingdom", startDate: "2026-03-01" }),
    event({ slug: "b", region: "UK", country: "United Kingdom", startDate: "2026-05-01" }),
    event({ slug: "c", region: "Europe", country: "Germany", startDate: "2026-04-01" }),
  ];

  it("matches a region on region, and a country on country", () => {
    expect(eventsAtPlace(placeBySlug("uk")!, events).map((e) => e.slug)).toEqual(["b", "a"]);
    expect(eventsAtPlace(placeBySlug("germany")!, events).map((e) => e.slug)).toEqual(["c"]);
  });

  it("puts the newest race first", () => {
    // A calendar sorted oldest-first buries this season under 2017.
    expect(eventsAtPlace(placeBySlug("uk")!, events)[0].slug).toBe("b");
  });

  it("does not confuse a country with the region containing it", () => {
    // Germany is in Europe, but /events/germany must not sweep up every
    // European race, and /events/europe must still include the German one.
    expect(eventsAtPlace(placeBySlug("germany")!, events)).toHaveLength(1);
    expect(eventsAtPlace(placeBySlug("europe")!, events).map((e) => e.slug)).toEqual(["c"]);
  });

  it("returns empty rather than throwing when a place has no races", () => {
    expect(eventsAtPlace(placeBySlug("india")!, events)).toEqual([]);
  });
});
