import { describe, expect, it } from "vitest";
import { leadAlertCost, leadAlertSms } from "./alert";
import { isLeadId, newLeadId, shortPlace, type Lead } from "./model";

/**
 * The lead text, which fires on every enquiry for ever.
 *
 * One segment or it costs double, and the failure is silent: nothing
 * errors, the bill just goes up. These hold that line against the two
 * things that break it — a character outside GSM-7, and a name long
 * enough to push the message over 160.
 */

const SITE = "https://www.suthperformance.com";

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "abcdefghjkmnpqrs",
    createdISO: "2026-08-03T18:00:00.000Z",
    name: "Sam Reeves",
    email: "sam@example.com",
    phone: "07700900123",
    invitedAtISO: null,
    rail: "Getting fit",
    wants: "A free consultation",
    readiness: null,
    goal: null,
    programme: null,
    injury: null,
    brief: "brief",
    city: "Leeds",
    region: "England",
    country: "GB",
    latitude: 53.8,
    longitude: -1.55,
    landingPath: "/hyrox/leeds",
    referrer: null,
    secondsOnSite: 400,
    pageViews: 5,
    sourcePath: null,
    ...over,
  };
}

describe("what the text says", () => {
  it("carries the name, the number, the place and the link", () => {
    const body = leadAlertSms(lead(), SITE);
    expect(body).toContain("Sam Reeves");
    expect(body).toContain("07700900123");
    expect(body).toContain("Leeds");
    expect(body).toContain("/l/abcdefghjkmnpqrs");
    expect(body.startsWith("New lead:")).toBe(true);
  });

  it("drops the scheme, because twelve characters is a whole segment", () => {
    const body = leadAlertSms(lead(), SITE);
    expect(body).not.toContain("https://");
    expect(body).not.toContain("www.");
    expect(body).toContain("suthperformance.com/l/");
  });

  it("says so rather than lying when there is no number", () => {
    expect(leadAlertSms(lead({ phone: null }), SITE)).toContain("no number");
  });

  it("copes with no location at all", () => {
    const body = leadAlertSms(
      lead({ city: null, region: null, country: null }),
      SITE,
    );
    expect(body).toContain("Sam Reeves");
    expect(body).toContain("/l/");
  });
});

describe("what it costs", () => {
  it("is one segment for a normal lead", () => {
    const cost = leadAlertCost(leadAlertSms(lead(), SITE));
    expect(cost.gsm7).toBe(true);
    expect(cost.segments).toBe(1);
    expect(cost.characters).toBeLessThanOrEqual(160);
  });

  it("stays one segment for a long name and a long place", () => {
    // The name is billed once here, unlike the invite where it appears
    // twice, but a double-barrelled name plus a long town still has to fit.
    const body = leadAlertSms(
      lead({
        name: "Christopher Worthington-Fairbairn",
        city: "Newcastle upon Tyne",
        region: "England",
      }),
      SITE,
    );
    const cost = leadAlertCost(body);
    expect(cost.segments, body).toBe(1);
  });

  it("drops the place rather than truncating it", () => {
    // A half-written town is worse than no town, and the link still has
    // everything either way.
    const body = leadAlertSms(
      lead({
        name: "Alexandra Fitzwilliam-Hargreaves",
        city: "Kingston upon Hull",
        region: "East Riding of Yorkshire",
      }),
      SITE,
    );
    expect(leadAlertCost(body).segments).toBe(1);
    expect(body).not.toMatch(/Kingston upon H\b/);
  });

  it("keeps the link and the number whole even for an absurd name", () => {
    const body = leadAlertSms(
      lead({ name: "A".repeat(200), city: null, region: null }),
      SITE,
    );
    expect(leadAlertCost(body).segments).toBe(1);
    expect(body).toContain("07700900123");
    expect(body).toContain("/l/abcdefghjkmnpqrs");
  });

  it("uses no character that would force UCS-2", () => {
    // One emoji or curly quote re-encodes the whole message and halves
    // every segment. This is the guard against somebody "improving" the
    // copy with an em dash later.
    // "Zoë" was the one that caught this: ë is outside GSM-7, so a single
    // character in a name halved the segment size and doubled the bill on
    // every alert. Folded to ASCII for the text only.
    for (const name of ["Zoë O'Brien", "Sam Reeves", "Jean-Luc", "Søren Müller"]) {
      const body = leadAlertSms(lead({ name }), SITE);
      const cost = leadAlertCost(body);
      expect(cost.gsm7, body).toBe(true);
      expect(cost.segments, body).toBe(1);
    }
    expect(leadAlertSms(lead({ name: "Zoë O'Brien" }), SITE)).toContain("Zoe O'Brien");
    // An accented place name must not cost double either.
    const body = leadAlertSms(lead({ city: "Málaga", region: "Andalucía" }), SITE);
    expect(leadAlertCost(body).gsm7, body).toBe(true);
  });
});

describe("the id in the link", () => {
  it("is long enough that guessing it is not a strategy", () => {
    // The page it opens has no login and shows a name, a number and
    // whatever they typed about their injuries.
    const id = newLeadId();
    expect(id).toHaveLength(16);
    expect(isLeadId(id)).toBe(true);
  });

  it("is url-safe and never repeats", () => {
    const ids = new Set(Array.from({ length: 500 }, newLeadId));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(encodeURIComponent(id)).toBe(id);
  });

  it("rejects anything that is not one", () => {
    for (const bad of ["", "short", "ABCDEFGHJKMNPQRS", "abcdefghjkmnpqr!", "0".repeat(16)]) {
      expect(isLeadId(bad), bad).toBe(false);
    }
  });
});

describe("the place shown to Ben", () => {
  it("is the city and the region", () => {
    expect(shortPlace({ city: "Leeds", region: "England", country: "GB" })).toBe(
      "Leeds, England",
    );
  });

  it("falls back to the country when there is no region", () => {
    expect(shortPlace({ city: "Leeds", region: null, country: "GB" })).toBe(
      "Leeds, GB",
    );
  });

  it("is nothing rather than an empty string", () => {
    expect(shortPlace({ city: null, region: null, country: null })).toBeNull();
  });
});
