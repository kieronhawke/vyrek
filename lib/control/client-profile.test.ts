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
    const seeded = seedProfiles(TODAY);
    expect(seeded.length).toBeLessThan(5);
    expect(seeded.some((p) => completeness(p) < 1)).toBe(true);
  });

  it("carries no real people", () => {
    // This repository is public.
    for (const p of seedProfiles(TODAY)) {
      if (p.email) expect(p.email).toMatch(/@example\.com$/);
      if (p.phone) expect(p.phone).toMatch(/^\+44 7700 900/); // Ofcom drama range
    }
  });

  it("never links an athlete to results by guessing", () => {
    // Two people genuinely share a name. Attaching the wrong race history to a
    // client is worse than showing none.
    expect(seedProfiles(TODAY).every((p) => p.hyroxSlug === null)).toBe(true);
  });
});
