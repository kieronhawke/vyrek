/**
 * Dates, places and timezones — the layer that lets live mode arm itself.
 *
 * The timezone assertions use real IANA zones and real DST transitions, because
 * the whole point is that a hand-written offset would be wrong twice a year.
 */

import { describe, expect, it } from "vitest";
import { RACES } from "@/lib/hyrox/races";
import {
  countryIsoFor,
  localStartToUtc,
  offsetMinutesAt,
  regionFor,
  timeZoneFor,
} from "../normalise/timezones";
import { enrichEventMetadata, matchRace, metadataFor } from "./event-metadata";
import { makeHarness } from "../testing";
import { shouldArmLive } from "./live";

describe("timezone coverage", () => {
  it("knows a zone for every city on the HYROX calendar", () => {
    const missing = RACES.filter((r) => !timeZoneFor(r.city, r.country)).map(
      (r) => `${r.city} (${r.country})`,
    );
    // If this fails, the calendar gained a city and RACE_CITY_TIMEZONES needs it.
    expect(missing).toEqual([]);
  });
});

describe("offsets are resolved per date, not per zone", () => {
  it("follows British Summer Time", () => {
    // London is UTC in January and UTC+1 in July. A fixed offset is wrong for
    // half the season.
    expect(offsetMinutesAt("Europe/London", new Date("2026-01-15T12:00:00Z"))).toBe(0);
    expect(offsetMinutesAt("Europe/London", new Date("2026-07-15T12:00:00Z"))).toBe(60);
  });

  it("handles zones that do not observe DST at all", () => {
    // Brisbane does not, unlike the rest of Australia's east coast; Phoenix
    // does not, unlike the rest of Mountain Time.
    expect(offsetMinutesAt("Australia/Brisbane", new Date("2026-01-15T12:00:00Z"))).toBe(600);
    expect(offsetMinutesAt("Australia/Brisbane", new Date("2026-07-15T12:00:00Z"))).toBe(600);
    expect(offsetMinutesAt("America/Phoenix", new Date("2026-07-15T12:00:00Z"))).toBe(-420);
  });

  it("handles half-hour offsets", () => {
    expect(offsetMinutesAt("Asia/Kolkata", new Date("2026-07-15T12:00:00Z"))).toBe(330);
  });
});

describe("local start to a real instant", () => {
  it("converts 07:00 local into the right UTC moment, east and west", () => {
    // Chiba: 07:00 on the 6th is 22:00 UTC on the 5th.
    expect(localStartToUtc("2026-08-06", "Asia/Tokyo", 7)?.utc).toBe("2026-08-05T22:00:00.000Z");
    // Vancouver: 07:00 on the 6th is 14:00 UTC the same day.
    expect(localStartToUtc("2026-08-06", "America/Vancouver", 7)?.utc).toBe(
      "2026-08-06T14:00:00.000Z",
    );
    // London in summer: 06:00 UTC.
    expect(localStartToUtc("2026-08-06", "Europe/London", 7)?.utc).toBe(
      "2026-08-06T06:00:00.000Z",
    );
    // London in winter: 07:00 UTC. Same local hour, different instant.
    expect(localStartToUtc("2026-01-10", "Europe/London", 7)?.utc).toBe(
      "2026-01-10T07:00:00.000Z",
    );
  });

  it("puts the Canaries an hour behind mainland Spain", () => {
    const tenerife = localStartToUtc("2026-08-06", "Atlantic/Canary", 7)!;
    const madrid = localStartToUtc("2026-08-06", "Europe/Madrid", 7)!;
    expect(new Date(tenerife.utc).getTime() - new Date(madrid.utc).getTime()).toBe(3_600_000);
  });

  it("refuses a malformed date rather than inventing one", () => {
    expect(localStartToUtc("not-a-date", "Europe/London")).toBeNull();
  });
});

describe("matching the results source to the published calendar", () => {
  it("matches on city and year together", () => {
    const race = RACES.find((r) => r.city === "Chiba");
    expect(race).toBeTruthy();
    const year = Number(race!.startDate.slice(0, 4));
    expect(matchRace("Chiba", year)?.slug).toBe(race!.slug);
    // Same city, wrong year: no match rather than the wrong race.
    expect(matchRace("Chiba", 1999)).toBeNull();
  });

  it("is accent and case insensitive", () => {
    const race = RACES.find((r) => /^d(ü|u)sseldorf$/i.test(r.city));
    if (race) {
      const year = Number(race.startDate.slice(0, 4));
      expect(matchRace("dusseldorf", year)?.slug).toBe(race.slug);
    }
  });

  it("returns dates, place and a real start instant", () => {
    const race = RACES.find((r) => r.city === "Chiba")!;
    const meta = metadataFor("Chiba", Number(race.startDate.slice(0, 4)))!;
    expect(meta.startDate).toBe(race.startDate);
    expect(meta.country).toBe("Japan");
    expect(meta.countryIso).toBe("JP");
    expect(meta.region).toBe("Asia");
    expect(meta.tzOffsetMinutes).toBe(540);
    expect(meta.startDatetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
  });

  it("puts UK races in their own region, because backfill prioritises it", () => {
    expect(regionFor("United Kingdom")).toBe("UK");
    expect(regionFor("Ireland")).toBe("Europe");
    expect(regionFor("Australia")).toBe("Oceania");
    expect(countryIsoFor("United Kingdom")).toBe("GB");
  });
});

describe("enrichment, end to end", () => {
  it("dates an undated event and lets it arm itself", async () => {
    const race = RACES.find((r) => r.city === "London") ?? RACES[0];
    const year = Number(race.startDate.slice(0, 4));

    const h = await makeHarness({
      event: {
        slug: `s9-${year}-enrich-check`,
        city: race.city,
        year,
        startDate: null,
        endDate: null,
        startDatetime: null,
        endDatetime: null,
        country: "",
        countryIso: "",
        region: "",
      },
    });

    // Before: no start instant, so it can never arm however long you wait.
    const before = await h.repo.getEventBySlug(`s9-${year}-enrich-check`);
    expect(before?.startDatetime).toBeFalsy();
    expect(shouldArmLive(before!, new Date(`${race.startDate}T09:00:00Z`))).toBe(false);

    const outcome = await enrichEventMetadata(h.repo);
    expect(outcome.enriched).toContain(`s9-${year}-enrich-check`);

    const after = await h.repo.getEventBySlug(`s9-${year}-enrich-check`);
    expect(after?.startDatetime).toBeTruthy();
    expect(after?.startDate).toBe(race.startDate);
    expect(after?.region).toBeTruthy();

    // After: armed at the right moment, derived from the city's own timezone.
    expect(shouldArmLive(after!, new Date(after!.startDatetime as string))).toBe(true);
  });

  it("never overwrites dates an operator already set", async () => {
    const h = await makeHarness({
      event: { city: "London", startDatetime: "2030-01-01T00:00:00.000Z" },
    });
    const outcome = await enrichEventMetadata(h.repo);
    expect(outcome.enriched).toHaveLength(0);
    const event = await h.repo.getEventBySlug(h.event.slug);
    expect(event?.startDatetime).toBe("2030-01-01T00:00:00.000Z");
  });

  it("flags an event with no calendar match instead of guessing a date", async () => {
    const h = await makeHarness({
      event: { slug: "s9-2026-nowhere", city: "Nowhere-on-Sea", startDatetime: null },
    });

    const outcome = await enrichEventMetadata(h.repo);
    expect(outcome.unmatched.map((u) => u.slug)).toContain("s9-2026-nowhere");

    const event = await h.repo.getEventBySlug("s9-2026-nowhere");
    expect(event?.startDatetime).toBeFalsy();

    const alert = (await h.repo.listAlerts()).find((a) => a.message.includes("no match"));
    expect(alert).toBeTruthy();
  });
});
