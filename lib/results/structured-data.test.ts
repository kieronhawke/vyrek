import { describe, it, expect } from "vitest";
import {
  breadcrumbList, sportsEvent, athletePerson, rankingDataset, faqPage, jsonLd,
} from "./structured-data";

const SITE = "https://www.suthperformance.com";

describe("breadcrumbList", () => {
  const trail = breadcrumbList(SITE, [
    { name: "Results", path: "/results" },
    { name: "London 2026", path: "/event/s9-2026-london" },
    { name: "Men", path: "/ranking/s9-2026-london-hyrox-men" },
  ]);

  it("numbers positions from one", () => {
    expect(trail.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
  });

  it("gives every crumb but the last an absolute item URL", () => {
    expect(trail.itemListElement[0]).toHaveProperty("item", `${SITE}/results`);
    expect(trail.itemListElement[1]).toHaveProperty("item");
  });

  it("omits item on the current page, which is what Google requires", () => {
    expect(trail.itemListElement[2]).not.toHaveProperty("item");
  });
});

describe("sportsEvent", () => {
  const base = {
    slug: "s9-2026-london", name: "HYROX London 2026", city: "London",
    country: "United Kingdom", venue: "ExCeL London",
    startDate: "2026-05-16", endDate: "2026-05-17",
    status: "finished", totalAthletes: 14037,
  };

  it("emits a valid, addressable event", () => {
    const event = sportsEvent(SITE, base);
    expect(event["@type"]).toBe("SportsEvent");
    expect(event.url).toBe(`${SITE}/event/s9-2026-london`);
    expect(event.startDate).toBe("2026-05-16");
  });

  it("omits dates entirely rather than sending empty strings", () => {
    // The ingested catalogue does not always carry a date, and an empty
    // startDate is a validation error rather than a missing field.
    const event = sportsEvent(SITE, { ...base, startDate: "", endDate: "" });
    expect(event).not.toHaveProperty("startDate");
    expect(event).not.toHaveProperty("endDate");
  });

  it("omits location when there is neither venue nor city", () => {
    const event = sportsEvent(SITE, { ...base, venue: "", city: "" });
    expect(event).not.toHaveProperty("location");
  });

  it("omits capacity when no athletes are recorded", () => {
    expect(sportsEvent(SITE, { ...base, totalAthletes: 0 })).not.toHaveProperty(
      "maximumAttendeeCapacity",
    );
  });
});

describe("athletePerson", () => {
  it("gives the athlete a stable id and ties it to the page", () => {
    const person = athletePerson(SITE, {
      slug: "charlie-johansson", name: "Charlie Johansson",
      countryIso: "se", races: 12, pbSeconds: 5400,
    });
    expect(person["@id"]).toBe(`${SITE}/athlete/charlie-johansson#person`);
    expect(person.nationality).toBe("SE");
    expect(person.subjectOf["@id"]).toBe(`${SITE}/athlete/charlie-johansson`);
  });

  it("omits nationality rather than emitting an empty one", () => {
    const person = athletePerson(SITE, {
      slug: "x", name: "X", countryIso: "", races: 1, pbSeconds: null,
    });
    expect(person).not.toHaveProperty("nationality");
  });
});

describe("rankingDataset", () => {
  const dataset = rankingDataset(SITE, {
    slug: "s9-2026-london-hyrox-men",
    eventName: "HYROX London 2026",
    divisionLabel: "HYROX Men",
    fieldSize: 3221,
    date: "2026-05-16",
  });

  it("describes itself as a free, downloadable dataset", () => {
    expect(dataset["@type"]).toBe("Dataset");
    expect(dataset.isAccessibleForFree).toBe(true);
    expect(dataset.distribution.encodingFormat).toBe("text/csv");
  });

  it("puts the field size in the description, where it is searchable", () => {
    expect(dataset.description).toContain("3,221");
  });

  it("omits temporal coverage rather than sending an empty date", () => {
    const undated = rankingDataset(SITE, {
      slug: "x", eventName: "e", divisionLabel: "HYROX Men", fieldSize: 10, date: "",
    });
    expect(undated).not.toHaveProperty("temporalCoverage");
  });
});

describe("faqPage", () => {
  it("wraps each question as an answered Question", () => {
    const page = faqPage([{ q: "What is a good HYROX time?", a: "It depends." }]);
    expect(page.mainEntity[0]["@type"]).toBe("Question");
    expect(page.mainEntity[0].acceptedAnswer.text).toBe("It depends.");
  });
});

describe("jsonLd", () => {
  it("escapes < so a name cannot break out of the script element", () => {
    // Athlete names come from an external feed. Nothing is hostile today.
    const output = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(output).not.toContain("</script>");
    expect(output).toContain("\\u003c");
  });

  it("round-trips ordinary data unchanged", () => {
    expect(JSON.parse(jsonLd({ a: 1, b: "two" }))).toEqual({ a: 1, b: "two" });
  });
});
