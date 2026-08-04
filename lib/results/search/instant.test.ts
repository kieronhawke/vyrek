/**
 * What the suggestion list must do while somebody is still typing.
 *
 * These are the cases the search was reported broken on, written as the
 * behaviour rather than the implementation: typing a few letters of a name has
 * to put that person first, immediately.
 */

import { describe, expect, it } from "vitest";
import { fold, instantSearch, mergeResults, score, type PopularAthlete } from "./instant";

/** A slice shaped like the real index: [name, slug, nationality, races]. */
const INDEX: PopularAthlete[] = [
  ["Benjamin Amsallem", "benjamin-amsallem", "FRA", 10],
  ["Ben Sutherland", "ben-sutherland", "GBR", 14],
  ["Ben Haldon", "ben-haldon", "GBR", 10],
  ["Benjamin Steker", "benjamin-steker", "GER", 13],
  ["Alexander Roncevic", "alexander-roncevic", "AUT", 13],
  ["José Núñez", "jose-nunez", "ESP", 7],
  ["Marie-Claire O'Neill", "marie-claire-o-neill", "IRL", 9],
  ["Sam Benson", "sam-benson", "USA", 12],
];

const names = (q: string, limit?: number) => instantSearch(INDEX, q, limit).map((a) => a.name);

describe("typing a name", () => {
  it("puts the person being typed first", () => {
    expect(names("ben sut")[0]).toBe("Ben Sutherland");
  });

  it("finds a person from their surname alone", () => {
    expect(names("sutherland")[0]).toBe("Ben Sutherland");
  });

  it("ranks a surname match above a forename match", () => {
    // "benson" as a surname is a more deliberate thing to type than "ben".
    expect(names("benson")[0]).toBe("Sam Benson");
  });

  it("copes with the name typed backwards", () => {
    expect(names("sutherland ben")[0]).toBe("Ben Sutherland");
  });

  it("finds a name from the middle when the spelling is unsure", () => {
    expect(names("utherl")).toContain("Ben Sutherland");
  });

  it("returns nothing on one character", () => {
    // A single letter matches thousands of people and suggests none of them.
    expect(names("b")).toEqual([]);
  });

  it("returns nothing for a name that is not there", () => {
    expect(names("zzzzz")).toEqual([]);
  });

  it("honours the limit", () => {
    expect(names("ben", 3)).toHaveLength(3);
  });
});

describe("ties between people who all match", () => {
  it("prefers the shorter name over the busier athlete", () => {
    // Benjamin Steker has raced more than Ben Haldon, but somebody who typed
    // three letters more likely wants the three-letter name.
    const forBen = names("ben");
    expect(forBen.indexOf("Ben Haldon")).toBeLessThan(forBen.indexOf("Benjamin Steker"));
  });

  it("prefers the athlete with more races when names are the same length", () => {
    const index: PopularAthlete[] = [
      ["Ann Kelly", "ann-kelly", "IRL", 2],
      ["Amy Kelly", "amy-kelly", "IRL", 9],
    ];
    expect(instantSearch(index, "kelly")[0].name).toBe("Amy Kelly");
  });
});

describe("names as they are actually written", () => {
  it("matches an accented name typed without accents", () => {
    expect(names("jose nunez")[0]).toBe("José Núñez");
    expect(names("nunez")[0]).toBe("José Núñez");
  });

  it("matches an apostrophe name typed without one", () => {
    expect(names("oneill")[0]).toBe("Marie-Claire O'Neill");
  });

  it("matches a hyphenated name typed with a space", () => {
    expect(names("marie claire")[0]).toBe("Marie-Claire O'Neill");
  });

  it("ignores surrounding whitespace", () => {
    expect(names("  sutherland  ")[0]).toBe("Ben Sutherland");
  });
});

describe("folding", () => {
  it("matches the identity grouper's folding", () => {
    // If these diverge, one person shows up as two rows in the suggestions.
    expect(fold("Ben O'Neill")).toBe(fold("ben oneill"));
    expect(fold("Marie-Claire")).toBe(fold("Marie Claire"));
    expect(fold("José")).toBe("jose");
  });
});

describe("scoring tiers", () => {
  it("orders exact, full prefix, word prefix and substring", () => {
    const name = "ben sutherland";
    expect(score(name, "ben sutherland")).toBeGreaterThan(score(name, "ben suth"));
    expect(score(name, "ben suth")).toBeGreaterThan(score(name, "sutherland"));
    expect(score(name, "sutherland")).toBeGreaterThan(score(name, "utherl"));
    expect(score(name, "nothing")).toBe(0);
  });

  it("scores an empty query as no match", () => {
    expect(score("ben sutherland", "")).toBe(0);
  });
});

describe("folding the server's answer in", () => {
  const instant = [{ slug: "ben-sutherland", name: "Ben Sutherland", countryIso: "GBR", raceCount: 14 }];

  it("does not show a person twice", () => {
    const merged = mergeResults(instant, [
      { slug: "ben-sutherland-2", name: "Ben Sutherland", countryIso: "GBR", raceCount: 3 },
      { slug: "ben-carter", name: "Ben Carter", countryIso: "USA", raceCount: 4 },
    ]);
    expect(merged.map((a) => a.name)).toEqual(["Ben Sutherland", "Ben Carter"]);
  });

  it("never moves a row that is already on screen", () => {
    // The server's answer lands mid-tap. If it reordered the list, the finger
    // already travelling towards a row would land on a different person.
    const merged = mergeResults(instant, [
      { slug: "aaron-abbott", name: "Aaron Abbott", countryIso: "USA", raceCount: 99 },
    ]);
    expect(merged[0].name).toBe("Ben Sutherland");
  });

  it("still answers from the server alone when nothing was prefetched", () => {
    const fromServer = [{ slug: "obscure", name: "Obscure Runner", countryIso: "", raceCount: 1 }];
    expect(mergeResults([], fromServer)).toEqual(fromServer);
  });

  it("honours the limit across both sources", () => {
    const fromServer = Array.from({ length: 20 }, (_, i) => ({
      slug: `a-${i}`,
      name: `Athlete ${i}`,
      countryIso: "",
      raceCount: 1,
    }));
    expect(mergeResults(instant, fromServer, 8)).toHaveLength(8);
  });
});
