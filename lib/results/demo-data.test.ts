/**
 * Integrity tests for the generated demo dataset.
 *
 * These assert the *statistical* claims the brief makes in §7 — believable
 * distributions, splits that sum, a field big enough to prove virtualisation —
 * rather than exact numbers, so they stay meaningful if the seed changes.
 *
 * The dataset is gitignored, so `pnpm test` regenerates it first (see the
 * `test` script in package.json). If it is genuinely missing these tests fail
 * loudly rather than skipping, because a silent skip would let a broken
 * generator ship.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildDistribution, percentileOf } from "./percentiles";
import { STATION_IDS } from "./model";

const DATA_DIR = join(process.cwd(), "data", "results-demo");
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA_DIR, f), "utf8")) as T;

type EventRow = {
  slug: string; status: string; season: string; city: string; totalAthletes: number;
  divisions: { divisionCode: string; athleteCount: number; leaderTimeSeconds?: number }[];
};

let events: EventRow[];
let athletes: { slug: string; name: string; isPlaceholder: boolean; races: unknown[] }[];

beforeAll(() => {
  expect(
    existsSync(join(DATA_DIR, "events.json")),
    "demo data missing — run `node scripts/generate-demo-data.ts`",
  ).toBe(true);
  events = read<EventRow[]>("events.json");
  athletes = read("athletes.json");
});

describe("event catalogue", () => {
  it("has the 14 events the brief asks for", () => {
    expect(events).toHaveLength(14);
  });

  it("has exactly one LIVE event and at least two UPCOMING", () => {
    expect(events.filter((e) => e.status === "live")).toHaveLength(1);
    expect(events.filter((e) => e.status === "upcoming").length).toBeGreaterThanOrEqual(2);
  });

  it("spans three seasons", () => {
    expect(new Set(events.map((e) => e.season)).size).toBe(3);
  });

  it("is UK-weighted, per our market priorities", () => {
    const uk = events.filter((e) => ["London", "Manchester", "Birmingham", "Glasgow", "Cardiff"].includes(e.city));
    expect(uk.length).toBeGreaterThanOrEqual(5);
  });

  it("gives every event a unique slug in s{season}-{year}-{city} form", () => {
    const slugs = events.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^s\d-\d{4}-[a-z-]+$/);
  });
});

describe("field sizes", () => {
  it("has at least one division over 3,000 rows, so virtualisation is genuinely exercised", () => {
    const biggest = Math.max(
      ...events.flatMap((e) => e.divisions.map((d) => d.athleteCount)),
    );
    expect(biggest).toBeGreaterThan(3000);
  });

  it("never fields an empty division", () => {
    for (const e of events) {
      for (const d of e.divisions) expect(d.athleteCount).toBeGreaterThan(0);
    }
  });
});

describe("race structure", () => {
  const sampleSlug = "s9-2026-london";
  let men: {
    finishSeconds: number; runs: number[]; stations: Record<string, number>;
    roxzoneSeconds: number; rank: number; athleteSlug: string; status: string;
  }[];

  beforeAll(() => {
    const shard = read<{ results: Record<string, typeof men> }>(`event-${sampleSlug}.json`);
    men = shard.results["hyrox-men"].filter((r) => r.status === "finished");
  });

  it("splits every race into 8 runs and 8 stations", () => {
    for (const r of men.slice(0, 200)) {
      expect(r.runs).toHaveLength(8);
      expect(Object.keys(r.stations).sort()).toEqual([...STATION_IDS].sort());
    }
  });

  it("makes the parts sum exactly to the finish time", () => {
    for (const r of men.slice(0, 500)) {
      const sum = r.runs.reduce((a, b) => a + b, 0)
        + STATION_IDS.reduce((a, id) => a + r.stations[id], 0)
        + r.roxzoneSeconds;
      expect(sum).toBe(r.finishSeconds);
    }
  });

  it("ranks strictly by finish time, ascending", () => {
    for (let i = 1; i < men.length; i++) {
      expect(men[i].finishSeconds).toBeGreaterThanOrEqual(men[i - 1].finishSeconds);
      expect(men[i].rank).toBe(i + 1);
    }
  });

  it("never enters the same athlete twice in one division", () => {
    const seen = new Set(men.map((r) => r.athleteSlug));
    expect(seen.size).toBe(men.length);
  });

  it("shows positive run drift on average — later runs are slower", () => {
    const firstRun = men.reduce((s, r) => s + r.runs[0], 0) / men.length;
    const lastRun = men.reduce((s, r) => s + r.runs[7], 0) / men.length;
    expect(lastRun).toBeGreaterThan(firstRun);
  });
});

describe("finish time distributions", () => {
  it("centres Open Men in the low 90 minutes, per the brief", () => {
    const shard = read<{ results: Record<string, { finishSeconds: number; status: string }[]> }>(
      "event-s9-2026-london.json",
    );
    const times = shard.results["hyrox-men"].filter((r) => r.status === "finished").map((r) => r.finishSeconds);
    const dist = buildDistribution(times);
    const medianMinutes = dist.breakpoints[50] / 60;
    expect(medianMinutes).toBeGreaterThan(85);
    expect(medianMinutes).toBeLessThan(100);
  });

  it("makes Pro Men faster than Open Men, and Doubles faster still", () => {
    const shard = read<{ results: Record<string, { finishSeconds: number; status: string }[]> }>(
      "event-s9-2026-london.json",
    );
    const median = (code: string) => {
      const t = shard.results[code].filter((r) => r.status === "finished").map((r) => r.finishSeconds);
      return buildDistribution(t).breakpoints[50];
    };
    expect(median("hyrox-pro-men")).toBeLessThan(median("hyrox-men"));
    expect(median("hyrox-doubles-men")).toBeLessThan(median("hyrox-pro-men"));
  });

  it("agrees with the percentile engine at the top of the field", () => {
    const shard = read<{ results: Record<string, { finishSeconds: number; status: string }[]> }>(
      "event-s9-2026-london.json",
    );
    const times = shard.results["hyrox-men"].filter((r) => r.status === "finished").map((r) => r.finishSeconds);
    const dist = buildDistribution(times);
    expect(percentileOf(dist, dist.min)).toBeGreaterThan(99);
    expect(percentileOf(dist, dist.max)).toBeLessThan(1);
  });

  it("produces some DNFs, but not many", () => {
    const shard = read<{ results: Record<string, { status: string }[]> }>("event-s9-2026-london.json");
    const rows = shard.results["hyrox-men"];
    const dnf = rows.filter((r) => r.status === "dnf").length;
    expect(dnf).toBeGreaterThan(0);
    expect(dnf / rows.length).toBeLessThan(0.05);
  });
});

describe("athletes", () => {
  it("profiles a 4,000-strong returning pool", () => {
    expect(athletes.length).toBe(4000);
  });

  it("gives a meaningful share of them multi-race histories", () => {
    const multi = athletes.filter((a) => a.races.length > 1);
    expect(multi.length).toBeGreaterThan(300);
  });

  it("flags both storyline Sutherlands as placeholders and no one else", () => {
    const flagged = athletes.filter((a) => a.isPlaceholder);
    expect(flagged.map((a) => a.name).sort()).toEqual(["Benjamin Sutherland", "Harry Sutherland"]);
  });

  it("gives every athlete a unique slug", () => {
    const slugs = athletes.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
