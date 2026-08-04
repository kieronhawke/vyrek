/**
 * Grouping one person's races back together.
 *
 * The source issues a new athlete id at every event — `JGDMS4JI10FBA2` and
 * `JGDMS4JI13526B` are the same Ben Sutherland at two races — and a doubles
 * partner gets a fresh id per entry. Searching his name returned five profiles
 * of one and two races each instead of one career of nineteen.
 */

import { describe, expect, it } from "vitest";
import { dedupePeople, personKey, samePerson } from "./identity-group";
import type { EngineAthlete } from "../types";

const athlete = (over: Partial<EngineAthlete>): EngineAthlete =>
  ({
    id: "a", slug: "a", name: "Ben Sutherland", nationality: null, gender: null,
    sourceAthleteId: null, claimedByUserId: null, isDemo: false,
    isAnonymised: false, identityConfidence: 1, needsIdentityReview: false,
    ...over,
  }) as EngineAthlete;

describe("name keys", () => {
  it("folds case, accents and punctuation", () => {
    expect(personKey("Ben  O'Neill")).toBe(personKey("ben oneill"));
    expect(personKey("José García")).toBe(personKey("Jose Garcia"));
  });

  it("keeps genuinely different names apart", () => {
    expect(personKey("Ben Sutherland")).not.toBe(personKey("Bob Sutherland"));
  });
});

describe("who is the same person", () => {
  it("joins profiles that share a name", () => {
    const target = athlete({ id: "1", sourceAthleteId: "JGDMS4JI10FBA2" });
    const found = samePerson(target, [
      target,
      athlete({ id: "2", sourceAthleteId: "JGDMS4JI13526B" }),
      athlete({ id: "3", name: "Someone Else" }),
    ]);
    expect(found.map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("treats an unknown nationality as no evidence either way", () => {
    const target = athlete({ id: "1", nationality: "GBR" });
    const found = samePerson(target, [target, athlete({ id: "2", nationality: null })]);
    expect(found).toHaveLength(2);
  });

  it("⚠️ never joins two known and different nationalities", () => {
    // A British and an American Ben Sutherland are two people, and merging
    // their careers would put someone else's races on a stranger's profile.
    const target = athlete({ id: "1", nationality: "GBR" });
    const found = samePerson(target, [target, athlete({ id: "2", nationality: "USA" })]);
    expect(found.map((a) => a.id)).toEqual(["1"]);
  });

  it("leaves an anonymised profile out", () => {
    const target = athlete({ id: "1" });
    const found = samePerson(target, [target, athlete({ id: "2", isAnonymised: true })]);
    expect(found).toHaveLength(1);
  });
});

describe("collapsing a search result set", () => {
  const person = (name: string, countryIso: string, raceCount: number, slug = name) =>
    ({ slug, name, countryIso, raceCount });

  it("shows one entry per person with their total races", () => {
    const out = dedupePeople([
      person("Ben Sutherland", "", 2, "ben-6"),
      person("Ben Sutherland", "GBR", 6, "ben-11"),
      person("Ben Sutherland", "", 1, "ben-7"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].raceCount).toBe(9);
    // Links to the profile that already has the most history.
    expect(out[0].slug).toBe("ben-11");
  });

  it("keeps two nationalities apart", () => {
    const out = dedupePeople([
      person("Ben Sutherland", "GBR", 3, "gb"),
      person("Ben Sutherland", "USA", 2, "us"),
    ]);
    expect(out).toHaveLength(2);
  });

  it("orders by who has raced most", () => {
    const out = dedupePeople([
      person("Quiet One", "GBR", 1),
      person("Busy One", "GBR", 9),
    ]);
    expect(out[0].name).toBe("Busy One");
  });

  it("leaves distinct people alone", () => {
    const out = dedupePeople([
      person("Ben Sutherland", "GBR", 2),
      person("Rebecca Sutherland", "GBR", 1),
    ]);
    expect(out).toHaveLength(2);
  });
});
