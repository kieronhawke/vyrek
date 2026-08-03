/**
 * Reading a city out of a weekend label.
 *
 * The value of this layer is measurable: without it 208 of 223 events had no
 * country and no region, because the published calendar lists upcoming races
 * only and the entire archive has fallen off it. With it, 218 do.
 *
 * The tests that matter most are the ones asserting a *null*. Every label here
 * that names no city is a label the resolver could have guessed at, and a wrong
 * guess puts one race's country on another race's results.
 */

import { describe, expect, it } from "vitest";
import { RACES } from "@/lib/hyrox/races";
import { cityCandidates, resolveCityName } from "./city-name";
import { HOST_CITIES } from "./host-cities";
import { countryIsoFor, normaliseKey, regionFor } from "./timezones";
import { placeFor } from "../sync/event-metadata";

const KNOWN = new Set([
  ...RACES.map((r) => normaliseKey(r.city)),
  ...Object.keys(HOST_CITIES).map(normaliseKey),
]);

const resolve = (label: string) => resolveCityName(label, KNOWN);

describe("championship decoration", () => {
  it("finds the city inside a title, whichever end it sits at", () => {
    expect(resolve("World Championships Manchester")).toBe("Manchester");
    expect(resolve("Vienna - European Championship")).toBe("Vienna");
    expect(resolve("Washington - North American Championships")).toBe("Washington");
    expect(resolve("APAC Championship Brisbane")).toBe("Brisbane");
    expect(resolve("Chicago - North American Open Championship")).toBe("Chicago");
    expect(resolve("Maastricht European Championships")).toBe("Maastricht");
  });

  it("strips a venue that trails the city", () => {
    expect(resolve("EMEA London Olympia")).toBe("London");
  });

  it("strips the brand and a sponsor that leads the city", () => {
    // Taking only the leading words missed every sponsor-titled race, because
    // the sponsor is what leads.
    expect(resolve("Sports Direct HYROX London")).toBe("London");
    expect(resolve("Gainful Anaheim")).toBe("Anaheim");
  });

  it("drops the year the source prefixes to every weekend", () => {
    expect(resolve("2023 Manchester")).toBe("Manchester");
    expect(resolve("Berlin - Youngstars")).toBe("Berlin");
  });
});

describe("German exonyms", () => {
  it("maps the timing platform's own spelling to the calendar's", () => {
    // mika:Timing is German and labels some weekends in German; the HYROX
    // calendar publishes the English name, so every one of these missed.
    expect(resolve("München")).toBe("Munich");
    expect(resolve("Wien")).toBe("Vienna");
    expect(resolve("Warschau")).toBe("Warsaw");
    expect(resolve("Nürnberg")).toBe("Nuremberg");
    expect(resolve("Lisboa")).toBe("Lisbon");
  });
});

describe("⚠️ labels that name no city stay null", () => {
  it("refuses to guess", () => {
    // Each of these is a real event label. A resolver that reached for the
    // nearest plausible city would put a country, a region and a timezone on a
    // race that is not there — worse than the null it replaces, and invisible.
    for (const label of [
      "Elite 12",
      "World Championships",
      "Red Bull Monday Night shift: HYROX Invitational",
    ]) {
      expect(resolve(label)).toBeNull();
    }
  });

  it("does not mistake a country for a city", () => {
    expect(resolve("Belgium")).toBeNull();
  });

  it("only ever returns a city the lookup already knows", () => {
    // Resolution is closed over the known set on purpose: candidates are
    // generated liberally, and this is what stops a liberal guess escaping.
    for (const label of ["Atlantis", "Somewhere Championships", "HYROX"]) {
      expect(resolve(label)).toBeNull();
    }
  });
});

describe("candidate generation", () => {
  it("offers both ends of a multi-word label, longest first", () => {
    const candidates = cityCandidates("Gainful Anaheim");
    expect(candidates).toContain("Anaheim");
    expect(candidates.indexOf("Gainful Anaheim")).toBeLessThan(candidates.indexOf("Anaheim"));
  });

  it("keeps a two-word city ahead of either of its halves", () => {
    const candidates = cityCandidates("New York");
    expect(candidates.indexOf("New York")).toBeLessThan(candidates.indexOf("York"));
    expect(resolve("New York")).toBe("New York");
    // And the two-word city survives a decoration.
    expect(resolve("New York - North American Championships")).toBe("New York");
  });
});

describe("placing an event the calendar has forgotten", () => {
  it("answers where, from the archive", () => {
    expect(placeFor("Berlin")).toMatchObject({
      city: "Berlin",
      country: "Germany",
      timeZone: "Europe/Berlin",
    });
    expect(placeFor("World Championships Manchester")).toMatchObject({
      country: "United Kingdom",
    });
    expect(placeFor("Delhi")?.country).toBe("India");
  });

  it("never answers when", () => {
    // A finished event's date is year-specific and is not recoverable from its
    // city. `placeFor` returns no date field at all, so there is nothing to
    // accidentally write: an invented date sorts the calendar wrong, and on an
    // upcoming event would arm the live poller on the wrong day.
    expect(placeFor("Berlin")).not.toHaveProperty("startDate");
    expect(placeFor("Berlin")).not.toHaveProperty("startDatetime");
  });

  it("returns null rather than a guess", () => {
    expect(placeFor("Elite 12")).toBeNull();
  });
});

describe("the archive table itself", () => {
  it("names a real IANA zone for every city", () => {
    for (const [city, place] of Object.entries(HOST_CITIES)) {
      expect(() =>
        new Intl.DateTimeFormat("en-GB", { timeZone: place.timeZone }).format(new Date()),
      ).not.toThrow(`${city} has an unusable timezone`);
    }
  });

  it("has no duplicate city under a different spelling", () => {
    const keys = Object.keys(HOST_CITIES).map(normaliseKey);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it("names a country that resolves to a region and an ISO code", () => {
    // A country the region table has never heard of yields "", and an event
    // with a country but no region belongs to no regional calendar and matches
    // no filter — it is simply invisible. Six events sat in exactly that state
    // (Dubai, Doha, Sharjah, Jakarta, Lisbon) because the table stopped at the
    // countries the *upcoming* calendar happened to visit.
    const orphans = [...new Set(Object.values(HOST_CITIES).map((p) => p.country))]
      .filter((country) => !regionFor(country) || !countryIsoFor(country));
    expect(orphans).toEqual([]);
  });
});
