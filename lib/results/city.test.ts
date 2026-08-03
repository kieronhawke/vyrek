import { describe, it, expect } from "vitest";
import { citySlug, groupEventsByCity, findCityProfile, cityIntro, cityFaqs } from "./city";
import type { EventSummary } from "./source";

function event(over: Partial<EventSummary>): EventSummary {
  return {
    slug: "s8-2025-london", name: "HYROX London 2025", city: "London",
    iata: "LON", country: "United Kingdom", countryIso: "gb", region: "Europe",
    venue: "ExCeL London", season: "S8", year: 2025,
    startDate: "2025-05-16", endDate: "2025-05-17",
    status: "finished", totalAthletes: 12000,
    ...over,
  };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

describe("citySlug", () => {
  it("lowercases and hyphenates", () => {
    expect(citySlug("New York")).toBe("new-york");
  });

  it("folds accents so one city does not become two hubs", () => {
    expect(citySlug("München")).toBe(citySlug("Munchen"));
    expect(citySlug("Malmö")).toBe("malmo");
  });

  it("collapses punctuation rather than leaving stray hyphens", () => {
    expect(citySlug("Frankfurt a.M.")).toBe("frankfurt-a-m");
    expect(citySlug("  Dublin  ")).toBe("dublin");
  });
});

describe("groupEventsByCity", () => {
  const events = [
    event({ slug: "s7-2024-london", year: 2024, startDate: "2024-05-01", totalAthletes: 9000 }),
    event({ slug: "s8-2025-london", year: 2025, startDate: "2025-05-16", totalAthletes: 12000 }),
    event({
      slug: "s9-2026-london", year: 2026, startDate: "2026-11-20",
      status: "upcoming", totalAthletes: 0, venue: "Olympia London",
    }),
    event({
      slug: "s8-2025-berlin", city: "Berlin", name: "HYROX Berlin 2025",
      country: "Germany", countryIso: "de", venue: "Messe Berlin",
      year: 2025, startDate: "2025-03-08", totalAthletes: 7000,
    }),
  ];

  it("buckets by city and orders newest first", () => {
    const [london] = groupEventsByCity(events);
    expect(london.city).toBe("London");
    expect(london.events.map((e) => e.slug)).toEqual([
      "s9-2026-london", "s8-2025-london", "s7-2024-london",
    ]);
  });

  it("ranks the most-raced city first", () => {
    expect(groupEventsByCity(events).map((c) => c.slug)).toEqual(["london", "berlin"]);
  });

  it("totals finishers across every edition", () => {
    expect(groupEventsByCity(events)[0].totalFinishers).toBe(21000);
  });

  it("picks the soonest upcoming race, not the furthest away", () => {
    const withTwo = [
      ...events,
      event({ slug: "s9-2027-london", year: 2027, startDate: "2027-05-01", status: "upcoming" }),
    ];
    expect(findCityProfile(withTwo, "london")?.nextEvent?.slug).toBe("s9-2026-london");
  });

  it("reports the latest *finished* edition, ignoring scheduled ones", () => {
    expect(findCityProfile(events, "london")?.latestFinished?.slug).toBe("s8-2025-london");
  });

  it("collects every venue the city has used, newest first", () => {
    expect(findCityProfile(events, "london")?.venues).toEqual([
      "Olympia London", "ExCeL London",
    ]);
  });

  it("falls back to year when the catalogue has no dates", () => {
    // Most of the ingested catalogue is currently undated; sorting must not
    // collapse those editions into arbitrary order.
    const undated = [
      event({ slug: "a", year: 2023, startDate: "", endDate: "" }),
      event({ slug: "b", year: 2026, startDate: "", endDate: "" }),
    ];
    expect(groupEventsByCity(undated)[0].events.map((e) => e.slug)).toEqual(["b", "a"]);
  });

  it("skips events with no city rather than creating an empty hub", () => {
    expect(groupEventsByCity([event({ city: "" })])).toHaveLength(0);
  });
});

describe("cityIntro", () => {
  it("carries the numbers a reader came for", () => {
    const profile = findCityProfile(
      [
        event({ slug: "a", year: 2024, totalAthletes: 9000 }),
        event({ slug: "b", year: 2025, totalAthletes: 12000 }),
      ],
      "london",
    )!;
    const intro = cityIntro(profile);
    expect(intro).toContain("2 times");
    expect(intro).toContain("between 2024 and 2025");
    expect(intro).toContain("21,000 athletes");
  });

  it("reads correctly for a city that has raced once", () => {
    const profile = findCityProfile([event({ year: 2025 })], "london")!;
    expect(cityIntro(profile)).toContain("once in 2025");
  });

  it("names the single venue rather than counting to one", () => {
    const profile = findCityProfile([event({})], "london")!;
    expect(cityIntro(profile)).toContain("Every edition has been held at ExCeL London");
  });
});

describe("cityFaqs", () => {
  const profile = findCityProfile([event({})], "london")!;

  it("omits time questions entirely when there is no field to quote", () => {
    // An invented answer inside FAQPage schema is worse than no schema.
    const questions = cityFaqs(profile, null, clock).map((f) => f.q);
    expect(questions).not.toContain("What is a good HYROX time in London?");
  });

  it("answers the time questions from real numbers when they exist", () => {
    const faqs = cityFaqs(
      profile, { medianSeconds: 5400, winnerSeconds: 3600, sampleSize: 3221 }, clock,
    );
    const good = faqs.find((f) => f.q.startsWith("What is a good"))!;
    expect(good.a).toContain("90:00");
    expect(good.a).toContain("3,221");
  });

  it("always offers the question every visitor actually has", () => {
    expect(cityFaqs(profile, null, clock).some((f) => f.q.includes("find my HYROX"))).toBe(true);
  });

  it("never returns an unanswered question", () => {
    for (const faq of cityFaqs(profile, null, clock)) {
      expect(faq.a.length).toBeGreaterThan(40);
    }
  });
});
