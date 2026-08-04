import { describe, expect, it } from "vitest";
import {
  bmi,
  completeness,
  emptyProfile,
  membershipLength,
  missingFields,
  seedProfiles,
  sortNotes,
  type ClientNote,
} from "./client-profile";

const TODAY = "2026-08-03";

describe("completeness", () => {
  it("is zero for a new profile and one when the three basics are in", () => {
    const p = emptyProfile("x", TODAY);
    expect(completeness(p)).toBe(0);
    expect(missingFields(p)).toEqual(["email address", "phone number", "goal"]);

    const done = { ...p, email: "a@b.c", phone: "07700", goal: "Sub-1:20" };
    expect(completeness(done)).toBe(1);
    expect(missingFields(done)).toEqual([]);
  });

  it("does not count whitespace as filled in", () => {
    // A field holding a space is the same as an empty one for every purpose
    // that matters — an email cannot be sent to it.
    const p = { ...emptyProfile("x", TODAY), email: "   ", phone: "07700", goal: "g" };
    expect(missingFields(p)).toEqual(["email address"]);
  });
});

describe("membership length", () => {
  it("reads in the units a person would say", () => {
    expect(membershipLength("2026-07-20", TODAY)).toBe("less than a month");
    expect(membershipLength("2026-05-03", TODAY)).toBe("3 months");
    expect(membershipLength("2025-08-03", TODAY)).toBe("1 year");
    expect(membershipLength("2025-02-03", TODAY)).toBe("1 year, 6 months");
  });

  it("does not count a month that has not completed", () => {
    // Joined on the 20th, today is the 3rd: that is not a month yet.
    expect(membershipLength("2026-07-04", TODAY)).toBe("less than a month");
    expect(membershipLength("2026-07-03", TODAY)).toBe("1 month");
  });

  it("returns a dash rather than nonsense for missing or future dates", () => {
    expect(membershipLength("", TODAY)).toBe("—");
    expect(membershipLength("2027-01-01", TODAY)).toBe("—");
    expect(membershipLength("not a date", TODAY)).toBe("—");
  });
});

describe("bmi", () => {
  it("needs both halves, and never guesses one", () => {
    const p = emptyProfile("x", TODAY);
    expect(bmi(p)).toBeNull();
    expect(bmi({ ...p, heightCm: 178 })).toBeNull();
    expect(bmi({ ...p, weightKg: 76 })).toBeNull();
    expect(bmi({ ...p, heightCm: 178, weightKg: 76 })).toBe(24);
  });
});

describe("notes", () => {
  const notes: ClientNote[] = [
    { id: "a", date: "2026-01-01", body: "old", shared: false },
    { id: "b", date: "2026-07-26", body: "new", shared: true },
    { id: "c", date: "2026-03-15", body: "middle", shared: false },
  ];

  it("reads newest first", () => {
    expect(sortNotes(notes).map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate what it was given", () => {
    const before = notes.map((n) => n.id);
    sortNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(before);
  });
});

describe("seed", () => {
  it("leaves most profiles empty, because that is the real state", () => {
    // A console where every row is filled in looks finished and hides exactly
    // the state Ben will be in.
    //
    // The seed covers the whole roster now, so counting records no longer
    // measures this. What it was ever a proxy for is that most profiles are
    // still incomplete, which is what this asserts directly.
    const seeded = seedProfiles(TODAY);
    const incomplete = seeded.filter((p) => completeness(p) < 1);
    expect(incomplete.length).toBeGreaterThan(seeded.length / 2);
  });

  it("carries no real people other than Kieron himself", () => {
    /*
     * This repository is public, so a stranger's address or number must never
     * end up in the seed.
     *
     * Kieron asked for every demo record to point at his own inbox and handset
     * precisely so a send wired to this data by accident reaches him and nobody
     * else. That is the one real contact allowed here, and it is allowed by
     * name rather than by loosening the check — anything else still fails.
     */
    const ALLOWED_EMAIL = /^(kieronhawke@gmail\.com|.+@example\.com)$/;
    const ALLOWED_PHONE = /^(07398790378|\+44 7700 900\d{3})$/; // his, or Ofcom's drama range
    for (const p of seedProfiles(TODAY)) {
      if (p.email) expect(p.email).toMatch(ALLOWED_EMAIL);
      if (p.phone) expect(p.phone).toMatch(ALLOWED_PHONE);
    }
  });

  it("never links an athlete to results by guessing", () => {
    // Two people genuinely share a name. Attaching the wrong race history to a
    // client is worse than showing none.
    expect(seedProfiles(TODAY).every((p) => p.hyroxSlug === null)).toBe(true);
  });
});
