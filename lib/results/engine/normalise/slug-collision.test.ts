/**
 * The eleventh James Kelly must not inherit the tenth one's results.
 *
 * `findTakenSlugs` asks the database about a base slug and nine numbered
 * variants. The allocator used to count on to `-500`, so an eleventh person
 * sharing a name was handed `-11` — a slug nobody had checked for. It was
 * usually already taken, and because the athlete upsert declares
 * `ON CONFLICT (slug) DO UPDATE`, the new person overwrote the existing row and
 * silently took ownership of every result attached to it.
 *
 * It was not theoretical. In production, all 38 Latin-named athletes carrying
 * an impossible race count ended in `-11`: `jaafar-moumen-11` held 57 races,
 * `michael-melly-11` held 46. Non-Latin names were worse — they all folded to
 * the same empty base, so they exhausted the window on the first board and
 * 2,523 of them collapsed together, one row holding 212 results from 33 events.
 */

import { describe, expect, it } from "vitest";
import { athleteSlug, fingerprint, SLUG_WINDOW } from "./identity";

/** The allocator, as `normaliser.ts` builds it. */
function makeAllocator(taken: Iterable<string>) {
  const claimed = new Set(taken);
  return (name: string, identity: string) => {
    const base = athleteSlug(name);
    let slug = base;
    if (claimed.has(base)) {
      slug = `${base}-${fingerprint(identity)}`;
      for (let n = 2; n <= SLUG_WINDOW; n += 1) {
        if (!claimed.has(`${base}-${n}`)) {
          slug = `${base}-${n}`;
          break;
        }
      }
    }
    claimed.add(slug);
    return slug;
  };
}

/** What the database was actually asked about, and nothing more. */
function checkedWindow(name: string): string[] {
  const base = athleteSlug(name);
  return [base, ...Array.from({ length: SLUG_WINDOW - 1 }, (_, i) => `${base}-${i + 2}`)];
}

describe("slug allocation past the checked window", () => {
  it("never invents a numbered slug the database was not asked about", () => {
    // Ten James Kellys already stored: the whole window is used up.
    const stored = checkedWindow("James Kelly");
    const allocate = makeAllocator(stored);

    const eleventh = allocate("James Kelly", "SOURCE_ID_ELEVENTH");

    // The old allocator returned "james-kelly-11" here, which no query covered.
    expect(stored).not.toContain(eleventh);
    expect(eleventh).not.toMatch(/-\d+$/);
  });

  it("gives two different people two different slugs", () => {
    const allocate = makeAllocator(checkedWindow("James Kelly"));

    const one = allocate("James Kelly", "LR3MS4JI10FBA2");
    const two = allocate("James Kelly", "LR3MS4JI13526B");

    expect(one).not.toBe(two);
  });

  it("gives the same person the same slug on a re-ingest", () => {
    // Idempotence is the whole reason the suffix is derived rather than counted:
    // re-running a division must not create a second row for anybody.
    const first = makeAllocator(checkedWindow("James Kelly"))("James Kelly", "LR3MS4JI10FBA2");
    const second = makeAllocator(checkedWindow("James Kelly"))("James Kelly", "LR3MS4JI10FBA2");

    expect(second).toBe(first);
  });

  it("still uses the readable numbered slugs while they last", () => {
    // The fix must not make every duplicate ugly — only the ones past the window.
    const allocate = makeAllocator(["james-kelly"]);
    expect(allocate("James Kelly", "ANY")).toBe("james-kelly-2");
  });

  it("keeps a plain unused name unsuffixed", () => {
    expect(makeAllocator([])("Alaric Fenwick", "ANY")).toBe("alaric-fenwick");
  });
});

describe("names not written in the Latin alphabet", () => {
  it("does not fold a Chinese name to the empty string", () => {
    // This is what put 2,523 rows into one shared namespace: every one of these
    // slugged to "", so they queued up for "", "-2", "-3" … and collided.
    expect(athleteSlug("佳丽 万")).toBe("佳丽-万");
  });

  it("gives two different Chinese names two different slugs", () => {
    expect(athleteSlug("佳丽 万")).not.toBe(athleteSlug("琰 苏"));
  });

  it("handles Cyrillic, Greek and Korean the same way", () => {
    expect(athleteSlug("Пётр Иванов")).toBe("петр-иванов");
    expect(athleteSlug("Γιώργος Παπάς")).toBe("γιωργος-παπας");
    expect(athleteSlug("김민준")).toBe("김민준");
  });

  it("leaves Latin names exactly as they were", () => {
    // The stored archive is overwhelmingly Latin-named. Changing those slugs
    // would move live URLs for no gain.
    expect(athleteSlug("Ben Sutherland")).toBe("ben-sutherland");
    expect(athleteSlug("Marie-Claire O'Neill")).toBe("marie-claire-o-neill");
    expect(athleteSlug("Björn Müller")).toBe("bjorn-muller");
    expect(athleteSlug("José Núñez")).toBe("jose-nunez");
  });

  it("still produces something for a name that is only punctuation", () => {
    // Nothing sensible to return, but it must not throw — and the allocator's
    // fingerprint branch keeps these separable even when the base is empty.
    expect(athleteSlug("???")).toBe("");
    const allocate = makeAllocator([""]);
    expect(allocate("???", "ID_A")).not.toBe(allocate("???", "ID_B"));
  });
});
