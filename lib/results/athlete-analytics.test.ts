import { describe, it, expect } from "vitest";
import {
  powerScore, formTrend, stationProfile, headToHead, divisionBests, careerSummary,
  type ScoredRace,
} from "./athlete-analytics";
import type { AthleteRace } from "./source";

const race = (over: Partial<AthleteRace> = {}): AthleteRace => ({
  eventSlug: "s9-2026-london",
  eventCity: "London",
  season: "s9",
  year: 2026,
  date: "2026-05-16",
  division: "hyrox-men",
  divisionLabel: "HYROX Men",
  rank: 100,
  ageGroupRank: 10,
  finishSeconds: 5400,
  resultId: "r1",
  ...over,
});

describe("powerScore", () => {
  const strong: ScoredRace[] = Array.from({ length: 6 }, (_, i) => ({
    percentile: 95, fieldSize: 3000, ageDays: i * 60,
  }));

  it("scores an empty career at zero rather than throwing", () => {
    const result = powerScore([]);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it("ranks a strong career above a weak one", () => {
    const weak = strong.map((r) => ({ ...r, percentile: 30 }));
    expect(powerScore(strong).score).toBeGreaterThan(powerScore(weak).score);
  });

  it("rewards beating a deep field over a shallow one", () => {
    const shallow = strong.map((r) => ({ ...r, fieldSize: 20 }));
    expect(powerScore(strong).score).toBeGreaterThan(powerScore(shallow).score);
  });

  it("decays an old career against an equivalent recent one", () => {
    const stale = strong.map((r) => ({ ...r, ageDays: r.ageDays + 1460 }));
    expect(powerScore(stale).score).toBeLessThan(powerScore(strong).score);
  });

  it("does not let one great race outrank a body of great races", () => {
    const oneOff: ScoredRace[] = [{ percentile: 99, fieldSize: 3000, ageDays: 10 }];
    expect(powerScore(oneOff).score).toBeLessThan(powerScore(strong).score);
  });

  it("reports low confidence on a thin career", () => {
    const thin: ScoredRace[] = [{ percentile: 90, fieldSize: 2000, ageDays: 10 }];
    expect(powerScore(thin).confidence).toBeLessThan(powerScore(strong).confidence);
  });

  it("never exceeds its own ceiling", () => {
    const perfect: ScoredRace[] = Array.from({ length: 20 }, () => ({
      percentile: 100, fieldSize: 100_000, ageDays: 0,
    }));
    expect(powerScore(perfect).score).toBeLessThanOrEqual(1000);
  });
});

describe("formTrend", () => {
  it("calls a falling series improving", () => {
    expect(formTrend([5800, 5600, 5400, 5200]).direction).toBe("improving");
  });

  it("calls a rising series declining", () => {
    expect(formTrend([5200, 5400, 5600, 5800]).direction).toBe("declining");
  });

  it("calls small variation steady rather than reading noise as a trend", () => {
    expect(formTrend([5400, 5410, 5395, 5405]).direction).toBe("steady");
  });

  it("refuses to fit a slope to fewer than three races", () => {
    expect(formTrend([5400, 5200]).direction).toBe("unknown");
    expect(formTrend([]).direction).toBe("unknown");
  });

  it("projects the slope over a four-race season", () => {
    const trend = formTrend([5800, 5600, 5400, 5200]);
    expect(trend.secondsPerSeason).toBe(trend.secondsPerRace * 4);
  });
});

describe("stationProfile", () => {
  it("summarises each station and drops those never raced", () => {
    const profile = stationProfile({
      "wall-balls": [
        { seconds: 300, percentile: 40 },
        { seconds: 360, percentile: 20 },
      ],
      "row": [{ seconds: 260, percentile: 80 }],
    });
    expect(profile).toHaveLength(2);
    const wall = profile.find((p) => p.station === "wall-balls")!;
    expect(wall.bestSeconds).toBe(300);
    expect(wall.worstSeconds).toBe(360);
    expect(wall.averagePercentile).toBe(30);
  });

  it("scores a repeatable station as less volatile than a swingy one", () => {
    const steady = stationProfile({ row: [
      { seconds: 300, percentile: 50 }, { seconds: 302, percentile: 50 },
    ] })[0];
    const swingy = stationProfile({ row: [
      { seconds: 240, percentile: 50 }, { seconds: 420, percentile: 50 },
    ] })[0];
    expect(steady.volatility).toBeLessThan(swingy.volatility);
  });

  it("returns nothing when no splits exist at all", () => {
    expect(stationProfile({})).toEqual([]);
  });
});

describe("headToHead", () => {
  const a = [
    race({ eventSlug: "e1", finishSeconds: 5400, resultId: "a1" }),
    race({ eventSlug: "e2", finishSeconds: 5300, resultId: "a2", year: 2025 }),
    race({ eventSlug: "e3", finishSeconds: 5200, resultId: "a3" }),
  ];
  const b = [
    race({ eventSlug: "e1", finishSeconds: 5500, resultId: "b1" }),
    race({ eventSlug: "e2", finishSeconds: 5100, resultId: "b2", year: 2025 }),
  ];

  it("counts only the events both athletes raced", () => {
    const h2h = headToHead(a, b);
    expect(h2h.meetings).toBe(2);
    expect(h2h.wins).toBe(1);
    expect(h2h.losses).toBe(1);
  });

  it("does not count a shared event raced in different divisions", () => {
    const other = [race({ eventSlug: "e1", division: "hyrox-doubles-men", finishSeconds: 5000 })];
    expect(headToHead(a, other).meetings).toBe(0);
  });

  it("finds the closest meeting", () => {
    expect(headToHead(a, b).closest?.eventSlug).toBe("e1"); // 100s vs 200s
  });

  it("reports no meetings for two athletes who never met", () => {
    const h2h = headToHead(a, [race({ eventSlug: "zzz" })]);
    expect(h2h.meetings).toBe(0);
    expect(h2h.closest).toBeNull();
    expect(h2h.averageMarginSeconds).toBe(0);
  });

  it("ignores a DNF on either side rather than scoring it a win", () => {
    const dnf = [race({ eventSlug: "e1", finishSeconds: 0 })];
    expect(headToHead(a, dnf).meetings).toBe(0);
  });
});

describe("divisionBests", () => {
  it("keeps a separate best per division", () => {
    const bests = divisionBests([
      race({ division: "hyrox-men", finishSeconds: 5400, resultId: "m1" }),
      race({ division: "hyrox-men", finishSeconds: 5200, resultId: "m2" }),
      race({ division: "hyrox-doubles-men", divisionLabel: "HYROX Doubles Men", finishSeconds: 4600, resultId: "d1" }),
    ]);
    expect(bests).toHaveLength(2);
    expect(bests[0].seconds).toBe(4600); // fastest first
    expect(bests.find((b) => b.division === "hyrox-men")!.seconds).toBe(5200);
  });

  it("flags a PB that is also the most recent race", () => {
    const bests = divisionBests([
      race({ finishSeconds: 5400, date: "2025-01-01", resultId: "old" }),
      race({ finishSeconds: 5200, date: "2026-05-16", resultId: "new" }),
    ]);
    expect(bests[0].isCurrent).toBe(true);
  });

  it("excludes DNFs from being a personal best", () => {
    const bests = divisionBests([
      race({ finishSeconds: 0, resultId: "dnf" }),
      race({ finishSeconds: 5400, resultId: "ok" }),
    ]);
    expect(bests[0].seconds).toBe(5400);
  });
});

describe("careerSummary", () => {
  it("counts races, seasons, divisions and podiums", () => {
    const summary = careerSummary([
      race({ season: "s8", rank: 2 }),
      race({ season: "s9", rank: 40, division: "hyrox-doubles-men" }),
      race({ season: "s9", rank: 1 }),
    ]);
    expect(summary.races).toBe(3);
    expect(summary.seasons).toBe(2);
    expect(summary.divisions).toBe(2);
    expect(summary.podiums).toBe(2);
    expect(summary.bestRank).toBe(1);
  });

  it("reports no best rank when nothing was ranked", () => {
    expect(careerSummary([race({ rank: 0, finishSeconds: 0 })]).bestRank).toBeNull();
  });

  it("survives an empty career", () => {
    const summary = careerSummary([]);
    expect(summary.races).toBe(0);
    expect(summary.bestRank).toBeNull();
  });
});
