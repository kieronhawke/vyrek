import { describe, expect, it } from "vitest";
import {
  cleanSessionContext,
  describeDuration,
  describeLocation,
  googleMapsUrl,
  requestLocation,
  staticMapUrl,
} from "./request-location";

function req(headers: Record<string, string>): Request {
  return new Request("https://www.suthperformance.com/api/consultation", {
    headers,
  });
}

describe("reading the location off a request", () => {
  it("pulls city, region, country and coordinates", () => {
    const loc = requestLocation(
      req({
        "x-vercel-ip-city": "Leeds",
        "x-vercel-ip-country-region": "England",
        "x-vercel-ip-country": "GB",
        "x-vercel-ip-latitude": "53.7997",
        "x-vercel-ip-longitude": "-1.5492",
      }),
    );
    expect(loc).toEqual({
      city: "Leeds",
      region: "England",
      country: "GB",
      latitude: 53.7997,
      longitude: -1.5492,
    });
  });

  it("decodes a percent-encoded city name", () => {
    // Vercel encodes anything non-ASCII, so "Málaga" arrives as M%C3%A1laga
    // and would otherwise be printed raw in Ben's email.
    expect(
      requestLocation(req({ "x-vercel-ip-city": "M%C3%A1laga" })).city,
    ).toBe("Málaga");
  });

  it("returns nulls off Vercel rather than throwing", () => {
    // Local development, and any other host. The email is written to cope.
    expect(requestLocation(req({}))).toEqual({
      city: null,
      region: null,
      country: null,
      latitude: null,
      longitude: null,
    });
  });

  it("ignores coordinates that are not numbers", () => {
    const loc = requestLocation(
      req({ "x-vercel-ip-latitude": "unknown", "x-vercel-ip-longitude": "" }),
    );
    expect(loc.latitude).toBeNull();
    expect(loc.longitude).toBeNull();
  });
});

describe("what Ben sees", () => {
  const leeds = {
    city: "Leeds",
    region: "England",
    country: "GB",
    latitude: 53.7997,
    longitude: -1.5492,
  };

  it("describes the place in the order a person says it", () => {
    expect(describeLocation(leeds)).toBe("Leeds, England, GB");
  });

  it("says nothing rather than something empty", () => {
    expect(
      describeLocation({
        city: null,
        region: null,
        country: null,
        latitude: null,
        longitude: null,
      }),
    ).toBeNull();
  });

  it("links to Google Maps by coordinates when it has them", () => {
    expect(googleMapsUrl(leeds)).toBe(
      "https://www.google.com/maps/search/?api=1&query=53.7997,-1.5492",
    );
  });

  it("falls back to searching the place name", () => {
    const noCoords = { ...leeds, latitude: null, longitude: null };
    expect(googleMapsUrl(noCoords)).toContain("Leeds%2C%20England%2C%20GB");
  });

  it("has no map to draw without coordinates", () => {
    expect(staticMapUrl({ ...leeds, latitude: null, longitude: null })).toBeNull();
    expect(staticMapUrl(leeds)).toContain("53.7997,-1.5492");
  });
});

describe("how long they were on the site", () => {
  it("reads as a duration, not a number of seconds", () => {
    expect(describeDuration(45)).toBe("45 seconds");
    expect(describeDuration(600)).toBe("10 minutes");
    expect(describeDuration(60)).toBe("60 seconds");
    expect(describeDuration(7200)).toBe("2 hours");
    expect(describeDuration(5400)).toBe("1h 30m");
  });

  it("says nothing when there is nothing to say", () => {
    expect(describeDuration(undefined)).toBeNull();
    expect(describeDuration(0)).toBeNull();
    expect(describeDuration(NaN)).toBeNull();
  });
});

describe("what the browser is allowed to send", () => {
  it("keeps a plausible path, a real referrer and sane numbers", () => {
    expect(
      cleanSessionContext({
        landingPath: "/hyrox/leeds",
        referrer: "https://www.google.com/",
        secondsOnSite: 412,
        pageViews: 6,
      }),
    ).toEqual({
      landingPath: "/hyrox/leeds",
      referrer: "https://www.google.com/",
      secondsOnSite: 412,
      pageViews: 6,
    });
  });

  it("drops anything that is not a path or an http referrer", () => {
    // Both end up in rendered HTML in Ben's inbox, so neither is trusted.
    const out = cleanSessionContext({
      landingPath: "javascript:alert(1)",
      referrer: "javascript:alert(1)",
      secondsOnSite: "loads",
      pageViews: -4,
    });
    expect(out.landingPath).toBeUndefined();
    expect(out.referrer).toBeUndefined();
    expect(out.secondsOnSite).toBeUndefined();
    expect(out.pageViews).toBe(0);
  });

  it("caps a very long path rather than passing it through", () => {
    const out = cleanSessionContext({ landingPath: "/" + "a".repeat(5000) });
    expect(out.landingPath!.length).toBeLessThanOrEqual(200);
  });

  it("copes with nothing at all", () => {
    expect(cleanSessionContext(undefined)).toEqual({});
    expect(cleanSessionContext("nope")).toEqual({});
  });
});
