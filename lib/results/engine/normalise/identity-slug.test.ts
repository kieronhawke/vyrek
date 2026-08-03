/**
 * What happens when the source corrects the spelling of a name.
 *
 * `results_athletes` has two unique keys — `slug`, and a partial unique index
 * on `source_athlete_id`. The batch upsert declares `ON CONFLICT (slug)`, so a
 * known athlete arriving under a *new* slug is an insert that violates the
 * other one, and Postgres fails the entire statement. A whole division of
 * Sports Direct HYROX London 2024 was lost to exactly that.
 */

import { describe, expect, it } from "vitest";
import { MemoryResultsRepository } from "../memory-repo";

const base = {
  name: "Alaric Fenwick",
  nationality: "GBR",
  gender: "M",
  claimedByUserId: null,
  isDemo: false,
  isAnonymised: false,
  identityConfidence: 1,
  needsIdentityReview: false,
};

describe("a renamed athlete keeps their slug", () => {
  it("updates the name and leaves the URL alone", async () => {
    const repo = new MemoryResultsRepository();
    await repo.upsertAthlete({ ...base, slug: "alaric-fenwick", sourceAthleteId: "LRAA1" });

    // Same person, new spelling, and therefore a slug the caller derived fresh.
    const after = await repo.upsertAthlete({
      ...base,
      name: "Alaric Fenwicke",
      slug: "alaric-fenwicke",
      sourceAthleteId: "LRAA1",
    });

    expect(after.slug).toBe("alaric-fenwick");
    expect(after.name).toBe("Alaric Fenwicke");
    expect(await repo.getAthleteBySlug("alaric-fenwick")).toBeTruthy();
  });

  it("still creates a genuinely new athlete", async () => {
    const repo = new MemoryResultsRepository();
    await repo.upsertAthlete({ ...base, slug: "alaric-fenwick", sourceAthleteId: "LRAA1" });
    const other = await repo.upsertAthlete({
      ...base, name: "Bram Oosterhuis", slug: "bram-oosterhuis", sourceAthleteId: "LRAA2",
    });
    expect(other.slug).toBe("bram-oosterhuis");
  });

  it("does not hold a slug still when there is no source id to match on", async () => {
    // Without a source id the slug is the only identity there is.
    const repo = new MemoryResultsRepository();
    await repo.upsertAthlete({ ...base, slug: "alaric-fenwick", sourceAthleteId: null });
    const renamed = await repo.upsertAthlete({
      ...base, name: "Someone Else", slug: "someone-else", sourceAthleteId: null,
    });
    expect(renamed.slug).toBe("someone-else");
  });
});
