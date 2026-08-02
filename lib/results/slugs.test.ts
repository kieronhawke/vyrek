import { describe, it, expect } from "vitest";
import { parseRankingSlug, buildRankingSlug } from "./slugs";

describe("parseRankingSlug", () => {
  it("splits a simple event and division", () => {
    expect(parseRankingSlug("s9-2026-london-hyrox-men")).toEqual({
      eventSlug: "s9-2026-london",
      division: "hyrox-men",
    });
  });

  it("handles a multi-word city", () => {
    expect(parseRankingSlug("s9-2026-new-delhi-hyrox-women")).toEqual({
      eventSlug: "s9-2026-new-delhi",
      division: "hyrox-women",
    });
  });

  it("prefers the longest matching division code", () => {
    // `hyrox-pro-doubles-men` also ends with `-hyrox-doubles-men`'s tail parts;
    // greedy-shortest matching would mis-split this.
    expect(parseRankingSlug("s8-2025-hong-kong-hyrox-pro-doubles-men")).toEqual({
      eventSlug: "s8-2025-hong-kong",
      division: "hyrox-pro-doubles-men",
    });
  });

  it("distinguishes doubles from pro doubles", () => {
    expect(parseRankingSlug("s9-2026-london-hyrox-doubles-men")?.division)
      .toBe("hyrox-doubles-men");
  });

  it("returns null for an unknown division", () => {
    expect(parseRankingSlug("s9-2026-london-hyrox-tug-of-war")).toBeNull();
  });

  it("returns null when there is no event half", () => {
    expect(parseRankingSlug("hyrox-men")).toBeNull();
  });

  it("round-trips with buildRankingSlug", () => {
    const slug = buildRankingSlug("s9-2026-cardiff", "hyrox-team-relay-mixed");
    expect(parseRankingSlug(slug)).toEqual({
      eventSlug: "s9-2026-cardiff",
      division: "hyrox-team-relay-mixed",
    });
  });
});
