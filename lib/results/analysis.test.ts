import { describe, it, expect } from "vitest";
import {
  analyseRoxzone, analysePacing, analyseStations, weakestStation,
  projectWhatIf, buildTargetPlan, flagImplausibleSplits, analyseBalance,
  type RaceSplits,
} from "./analysis";
import { STATION_IDS, type StationId } from "./model";
import { buildDistribution } from "./percentiles";

const evenStations = Object.fromEntries(
  STATION_IDS.map((id) => [id, 240]),
) as Record<StationId, number>;

const splits: RaceSplits = {
  runs: [200, 205, 210, 215, 220, 225, 230, 235],
  stations: evenStations,
  roxzoneSeconds: 300,
  finishSeconds: 200 + 205 + 210 + 215 + 220 + 225 + 230 + 235 + 240 * 8 + 300,
};

describe("analyseRoxzone", () => {
  it("calls a much faster transition sharp", () => {
    expect(analyseRoxzone(splits, 420).verdict).toBe("sharp");
  });
  it("calls a much slower transition leaking", () => {
    expect(analyseRoxzone(splits, 200).verdict).toBe("leaking");
  });
  it("treats a small difference as noise", () => {
    expect(analyseRoxzone(splits, 305).verdict).toBe("typical");
  });
  it("reports the share of the race spent in transition", () => {
    const r = analyseRoxzone(splits, 300);
    expect(r.shareOfRace).toBeGreaterThan(0);
    expect(r.shareOfRace).toBeLessThan(0.2);
  });
});

describe("analysePacing", () => {
  it("detects steady positive drift", () => {
    const p = analysePacing(splits.runs);
    expect(p.driftPerRun).toBeCloseTo(5, 1);
    expect(p.fastestRun.index).toBe(0);
    expect(p.slowestRun.index).toBe(7);
  });

  it("scores metronomic pacing at 100", () => {
    expect(analysePacing(Array(8).fill(210)).consistency).toBe(100);
  });

  it("scores a blow-up far lower than an even race", () => {
    const blowUp = analysePacing([200, 205, 215, 230, 260, 300, 340, 400]);
    const even = analysePacing(splits.runs);
    expect(blowUp.consistency).toBeLessThan(even.consistency);
    expect(blowUp.verdict).toBe("fading");
  });

  it("recognises a negative split", () => {
    expect(analysePacing([230, 228, 226, 224, 214, 212, 210, 208]).verdict).toBe("negative-split");
  });

  it("degrades safely on missing data", () => {
    expect(analysePacing([]).consistency).toBe(0);
    expect(analysePacing([200]).consistency).toBe(0);
  });
});

describe("analyseStations and weakestStation", () => {
  it("picks the weakest by percentile, not by raw seconds", () => {
    // Wall balls is slowest in absolute terms but bang on the division average;
    // sled push is quicker in seconds yet far worse relative to peers.
    const averages = { ...evenStations, "wall-balls": 400, "sled-push": 120 } as Record<StationId, number>;
    const mySplits: RaceSplits = {
      ...splits,
      stations: { ...evenStations, "wall-balls": 400, "sled-push": 240 } as Record<StationId, number>,
    };
    const standings = analyseStations(mySplits, averages);
    expect(weakestStation(standings)?.station).toBe("sled-push");
  });

  it("returns one standing per station", () => {
    expect(analyseStations(splits, evenStations)).toHaveLength(8);
  });
});

describe("projectWhatIf", () => {
  const fieldTimes = Array.from({ length: 100 }, (_, i) => 4000 + i * 20).sort((a, b) => a - b);

  it("moves the athlete up the field when a station improves", () => {
    const standings = analyseStations(splits, { ...evenStations, "row": 180 } as Record<StationId, number>);
    const row = standings.find((s) => s.station === "row")!;
    const result = projectWhatIf(splits, row, fieldTimes, 60);
    expect(result.secondsSaved).toBeGreaterThan(0);
    expect(result.projectedFinishSeconds).toBeLessThan(splits.finishSeconds);
    expect(result.ranksGained).toBeGreaterThanOrEqual(0);
  });

  it("claims no gain when the station is already better than target", () => {
    const standings = analyseStations(splits, { ...evenStations, "row": 400 } as Record<StationId, number>);
    const row = standings.find((s) => s.station === "row")!;
    const result = projectWhatIf(splits, row, fieldTimes, 60);
    expect(result.secondsSaved).toBe(0);
    expect(result.ranksGained).toBe(0);
  });

  it("uses the distribution when one is supplied", () => {
    const dist = buildDistribution(Array.from({ length: 200 }, (_, i) => 150 + i));
    const standings = analyseStations(splits, evenStations);
    const row = standings.find((s) => s.station === "row")!;
    const result = projectWhatIf(splits, row, fieldTimes, 60, 50, dist);
    expect(result.targetSeconds).toBeGreaterThan(0);
  });
});

describe("buildTargetPlan", () => {
  it("scales every segment to hit the goal", () => {
    const plan = buildTargetPlan(4500, splits);
    const total = plan.runs.reduce((s, v) => s + v, 0)
      + STATION_IDS.reduce((s, id) => s + plan.stations[id], 0)
      + plan.roxzoneSeconds;
    // Rounding to whole seconds across 17 segments, so allow a few seconds.
    expect(Math.abs(total - 4500)).toBeLessThan(20);
  });

  it("produces ascending checkpoints, two per station block", () => {
    const plan = buildTargetPlan(4500, splits);
    expect(plan.checkpoints).toHaveLength(16);
    for (let i = 1; i < plan.checkpoints.length; i++) {
      expect(plan.checkpoints[i].atSeconds).toBeGreaterThanOrEqual(plan.checkpoints[i - 1].atSeconds);
    }
  });

  it("ends the last checkpoint at roughly the goal time", () => {
    const plan = buildTargetPlan(4500, splits);
    expect(Math.abs(plan.checkpoints.at(-1)!.atSeconds - 4500)).toBeLessThan(200);
  });
});

describe("flagImplausibleSplits", () => {
  it("passes a clean race with no flags", () => {
    expect(flagImplausibleSplits(splits)).toHaveLength(0);
  });

  it("catches the 42-minute run the reference site renders as fact", () => {
    const bad = { ...splits, runs: [200, 2541, 210, 215, 220, 225, 230, 235] };
    const flags = flagImplausibleSplits(bad);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ segment: "Run 2", reason: "implausibly-slow" });
  });

  it("catches an impossibly fast run", () => {
    const bad = { ...splits, runs: [30, 205, 210, 215, 220, 225, 230, 235] };
    expect(flagImplausibleSplits(bad)[0].reason).toBe("implausibly-fast");
  });

  it("reports missing station data", () => {
    const bad = { ...splits, stations: { ...evenStations, row: 0 } as Record<StationId, number> };
    expect(flagImplausibleSplits(bad).some((f) => f.reason === "missing")).toBe(true);
  });
});

describe("analyseBalance", () => {
  it("classifies relative to the division, not in absolute terms", () => {
    const runHeavy = analyseBalance(splits, 0.5);
    const stationHeavy = analyseBalance(splits, 2.0);
    expect(runHeavy.profile).toBe("strength");
    expect(stationHeavy.profile).toBe("runner");
  });

  it("calls a division-average athlete balanced", () => {
    const b = analyseBalance(splits, splits.runs.reduce((s, v) => s + v, 0) / (240 * 8));
    expect(b.profile).toBe("balanced");
  });
});
