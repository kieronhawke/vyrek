import { describe, it, expect } from "vitest";
import {
  normalise, editDistance, scoreMatch, scoreMultiTerm, detectIntent, rankBy, MATCH,
} from "./search";

describe("normalise", () => {
  it("strips accents so typed and printed spellings agree", () => {
    expect(normalise("Málaga")).toBe("malaga");
    expect(normalise("MÜLLER")).toBe("muller");
  });
  it("strips apostrophes so O'Connor matches oconnor", () => {
    expect(normalise("O'Connor")).toBe("oconnor");
  });
});

describe("editDistance", () => {
  it("counts a single substitution", () => expect(editDistance("johanson", "johansson")).toBe(1));
  it("counts a transposition as one mistake, not two", () => expect(editDistance("teh", "the")).toBe(1));
  it("is zero for identical strings", () => expect(editDistance("patel", "patel")).toBe(0));
  it("bails out past the cap instead of computing a big number", () => {
    expect(editDistance("abc", "zzzzzzzzz", 2)).toBeGreaterThan(2);
  });
});

describe("scoreMatch ranking order", () => {
  it("ranks exact above prefix above word-prefix above contains", () => {
    const exact = scoreMatch("patel", "patel").score;
    const prefix = scoreMatch("patelson", "patel").score;
    const wordPrefix = scoreMatch("zachary patel", "pat").score;
    const contains = scoreMatch("spatelli", "patel").score;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordPrefix);
    expect(wordPrefix).toBeGreaterThan(contains);
  });

  it("matches initials", () => {
    expect(scoreMatch("Charlie Johansson", "cj").kind).toBe("initials");
  });

  it("tolerates a typo in a long enough word", () => {
    expect(scoreMatch("Charlie Johansson", "johanson").kind).toBe("fuzzy");
  });

  it("does not fuzzy-match very short queries, which would match everything", () => {
    // "abc" vs "abd" is one edit but at three characters that is noise.
    expect(scoreMatch("Zachary Patel", "abc").score).toBe(0);
  });

  it("returns no match for an unrelated query", () => {
    expect(scoreMatch("Zachary Patel", "wallaby").score).toBe(0);
  });

  it("ignores accents when matching", () => {
    expect(scoreMatch("Málaga", "malaga").kind).toBe("exact");
  });

  it("treats an empty query as no match rather than matching everything", () => {
    expect(scoreMatch("Zachary Patel", "  ").score).toBe(0);
  });
});

describe("scoreMultiTerm", () => {
  it("requires every term to match something", () => {
    expect(scoreMultiTerm("Zachary Patel", "zachary patel").score).toBeGreaterThan(0);
    expect(scoreMultiTerm("Zachary Patel", "zachary wallaby").score).toBe(0);
  });

  it("matches terms in any order", () => {
    expect(scoreMultiTerm("Zachary Patel", "patel zachary").score).toBeGreaterThan(0);
  });

  it("ranks a full-name match above a scattered one", () => {
    const full = scoreMultiTerm("Zachary Patel", "zachary patel").score;
    const scattered = scoreMultiTerm("Zachary Ferrers Patelson", "zachary patel").score;
    expect(full).toBeGreaterThan(scattered);
  });
});

describe("detectIntent", () => {
  it("reads a finish time", () => {
    expect(detectIntent("1:31:30")).toEqual({ type: "time", seconds: 5490 });
    expect(detectIntent("91:30")).toEqual({ type: "time", seconds: 5490 });
  });

  it("reads a sub-goal the way people say it", () => {
    expect(detectIntent("sub 90")).toMatchObject({ type: "goal", seconds: 5400 });
    expect(detectIntent("sub-75")).toMatchObject({ type: "goal", seconds: 4500 });
    expect(detectIntent("SUB90")).toMatchObject({ type: "goal", seconds: 5400 });
  });

  it("reads a season year", () => {
    expect(detectIntent("2026")).toEqual({ type: "year", year: 2026 });
  });

  it("does not mistake a name for a time", () => {
    expect(detectIntent("Zachary Patel").type).toBe("text");
    expect(detectIntent("london").type).toBe("text");
  });

  it("rejects times outside anything a HYROX race could be", () => {
    expect(detectIntent("2:00").type).toBe("text");      // two minutes
    expect(detectIntent("sub 10").type).toBe("text");    // ten minutes
    expect(detectIntent("sub 400").type).toBe("text");
  });
});

describe("rankBy", () => {
  const athletes = [
    { text: "Zachary Patelson", weight: 2 },
    { text: "Zachary Patel", weight: 13 },
    { text: "Arun Patel", weight: 1 },
    { text: "Unrelated Person", weight: 50 },
  ];

  it("puts the exact match first even when another has more races", () => {
    expect(rankBy(athletes, "Zachary Patel")[0].text).toBe("Zachary Patel");
  });

  it("excludes non-matches regardless of weight", () => {
    expect(rankBy(athletes, "patel").map((a) => a.text)).not.toContain("Unrelated Person");
  });

  it("breaks ties on weight, so the busier athlete comes first", () => {
    const tied = [
      { text: "Patel One", weight: 1 },
      { text: "Patel Two", weight: 40 },
    ];
    expect(rankBy(tied, "patel")[0].text).toBe("Patel Two");
  });

  it("never lets weight overwhelm match quality", () => {
    const items = [
      { text: "Patel", weight: 0 },
      { text: "Spatelli", weight: 10_000 },
    ];
    expect(rankBy(items, "patel")[0].text).toBe("Patel");
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ text: `Patel ${i}`, weight: i }));
    expect(rankBy(many, "patel", 5)).toHaveLength(5);
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(rankBy(athletes, "")).toHaveLength(0);
  });
});

describe("match constants stay ordered", () => {
  it("keeps the ranking ladder monotonic", () => {
    expect(MATCH.exact).toBeGreaterThan(MATCH.prefix);
    expect(MATCH.prefix).toBeGreaterThan(MATCH.wordPrefix);
    expect(MATCH.wordPrefix).toBeGreaterThan(MATCH.initials);
    expect(MATCH.initials).toBeGreaterThan(MATCH.contains);
    expect(MATCH.contains).toBeGreaterThan(MATCH.fuzzy);
    expect(MATCH.fuzzy).toBeGreaterThan(MATCH.none);
  });
});
