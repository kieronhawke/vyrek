import { describe, it, expect } from "vitest";
import { buildSegments, benchmarkSplits, buildPotentialBands } from "./race-report";
import {
  analyseStations,
  strongestStation,
  weakestStation,
  type StationStanding,
} from "./analysis";
import { STATION_IDS, type StationId } from "./model";

/**
 * WHAT HAPPENS WHEN THE DATA IS WRONG, MISSING, OR IMPOSSIBLE.
 *
 * Race results are published by event organisers and are not clean. Splits go
 * missing, timing mats fail, penalties land on some feeds and not others, and
 * occasionally a number is simply nonsense. Every one of those arrives here.
 *
 * The rule these tests enforce is one rule: **absence must never render as
 * excellence.** It is the specific way this codebase failed. Splits arrived as
 * `stations[station] ?? 0`, and zero is not a neutral default for a duration —
 * it is the fastest possible value. So a station nobody recorded was scored
 * 3:40 faster than the division average, banded "Excellent", drawn at the 100th
 * percentile, and reported to the athlete as their strongest station.
 *
 * That is worse than showing nothing. A gap is obviously a gap; a fabricated
 * personal best is indistinguishable from a real one, and the reader has no way
 * to catch it.
 */

const full = (v: number): Record<StationId, number> =>
  Object.fromEntries(STATION_IDS.map((s) => [s, v])) as Record<StationId, number>;

const RUNS = [240, 240, 240, 240, 240, 240, 240, 240];
const AVG_RUNS = [250, 250, 250, 250, 250, 250, 250, 250];

function segmentsWith(stations: Record<string, number>, roxzone = 300) {
  return buildSegments(
    RUNS,
    stations as Record<StationId, number>,
    roxzone,
    AVG_RUNS,
    full(220),
    320,
  );
}

describe("a station the organiser never published", () => {
  it("is flagged as missing rather than timed at zero", () => {
    const stations: Record<string, number> = { ...full(200) };
    delete stations["ski-erg"];

    const ski = segmentsWith(stations).find((s) => s.key === "ski-erg")!;
    expect(ski.missing).toBe(true);
  });

  it("does not become the athlete's strongest station", () => {
    /*
     * The original failure, end to end. `percentileOf(dist, 0)` returns the
     * 100th percentile, so the missing station won `strongestStation` outright
     * and the report told the athlete they were world-class at an exercise it
     * had no time for.
     */
    const stations: Record<string, number> = { ...full(200) };
    delete stations["ski-erg"];

    const standings = analyseStations(
      { runs: RUNS, stations: stations as Record<StationId, number>, roxzoneSeconds: 300 } as never,
      full(220),
    );

    expect(standings.find((s) => s.station === "ski-erg")!.missing).toBe(true);
    expect(strongestStation(standings)!.station).not.toBe("ski-erg");
    expect(weakestStation(standings)!.station).not.toBe("ski-erg");
  });

  it("sits at the middle of the radar, not at full reach", () => {
    // 50 is the honest placeholder for "no information": it moves the shape
    // neither in nor out. 100 pushed the spoke to the rim.
    const stations: Record<string, number> = { ...full(200) };
    delete stations["ski-erg"];
    const standings = analyseStations(
      { runs: RUNS, stations: stations as Record<StationId, number>, roxzoneSeconds: 300 } as never,
      full(220),
    );
    expect(standings.find((s) => s.station === "ski-erg")!.percentile).toBe(50);
  });

  it("does not claim you beat the winner on a split you do not have", () => {
    const stations: Record<string, number> = { ...full(200) };
    delete stations["ski-erg"];

    const marks = benchmarkSplits(
      segmentsWith(stations),
      Object.fromEntries(STATION_IDS.map((s) => [s, 180])),
      Object.fromEntries(STATION_IDS.map((s) => [s, 190])),
    );

    const ski = marks.find((m) => m.label === "SkiErg")!;
    // Previously 0 − 190 = −190: "three minutes faster than the winner".
    expect(ski.deltaToWinner).toBe(0);
    expect(ski.deltaToFastest).toBe(0);
  });

  it("is excluded from the banded chart entirely", () => {
    const stations = { ...full(200) } as Record<string, number>;
    delete stations["ski-erg"];
    const bands = buildPotentialBands(
      stations as Record<StationId, number>,
      Object.fromEntries(
        STATION_IDS.map((s) => [s, { samples: [180, 200, 220, 240], station: s }]),
      ) as never,
      60,
    );
    expect(bands.some((b) => b.station === "ski-erg")).toBe(false);
  });
});

describe("splits that are present but not usable", () => {
  it("treats an explicit zero as missing, not as an instant station", () => {
    // Feeds emit 0 for "not recorded" far more often than they omit the key.
    const seg = segmentsWith({ ...full(200), "ski-erg": 0 }).find((s) => s.key === "ski-erg")!;
    expect(seg.missing).toBe(true);
  });

  it("treats a negative split as missing", () => {
    // A negative duration is impossible; it means a clock ran backwards or a
    // subtraction was done against a mat that never fired.
    const seg = segmentsWith({ ...full(200), row: -45 }).find((s) => s.key === "row")!;
    expect(seg.missing).toBe(true);
    expect(seg.seconds).toBe(0);
  });

  it("treats NaN as missing rather than propagating it through every total", () => {
    /*
     * One NaN in a split makes every downstream sum NaN, and a report full of
     * "NaN" is how a data problem becomes a visibly broken page. Contained here.
     */
    const seg = segmentsWith({ ...full(200), row: Number.NaN }).find((s) => s.key === "row")!;
    expect(seg.missing).toBe(true);
    expect(Number.isFinite(seg.seconds)).toBe(true);
  });

  it("keeps a slow-but-real split as a real split", () => {
    // The guard must not swallow genuine bad days — an eight-minute wall ball
    // is miserable and completely real.
    const seg = segmentsWith({ ...full(200), "wall-balls": 480 }).find((s) => s.key === "wall-balls")!;
    expect(seg.missing).toBeFalsy();
    expect(seg.seconds).toBe(480);
  });
});

describe("a race with nothing published at all", () => {
  it("reports no strongest or weakest station rather than picking one", () => {
    // Every station missing must yield null, not an arbitrary winner of a
    // comparison between eight identical placeholders.
    const standings = analyseStations(
      { runs: RUNS, stations: {} as Record<StationId, number>, roxzoneSeconds: 0 } as never,
      full(220),
    );
    expect(standings.every((s) => s.missing)).toBe(true);
    expect(strongestStation(standings)).toBeNull();
    expect(weakestStation(standings)).toBeNull();
  });

  it("still returns a segment per station so the layout does not collapse", () => {
    const segs = segmentsWith({});
    // Eight runs, eight stations, one roxzone.
    expect(segs.length).toBe(17);
    expect(segs.filter((s) => s.kind === "station").every((s) => s.missing)).toBe(true);
  });
});

describe("missing runs and roxzone", () => {
  it("flags a missing run without shifting the ones after it", () => {
    const segs = buildSegments(
      [240, 0, 240, 240, 240, 240, 240, 240],
      full(200), 300, AVG_RUNS, full(220), 320,
    );
    expect(segs.find((s) => s.key === "run-2")!.missing).toBe(true);
    // Run 3 must still be run 3 — a compacted array would silently relabel
    // every subsequent run and quietly corrupt the pacing story.
    expect(segs.find((s) => s.key === "run-3")!.seconds).toBe(240);
    expect(segs.find((s) => s.key === "run-3")!.missing).toBeFalsy();
  });

  it("flags an unpublished roxzone", () => {
    expect(segmentsWith(full(200), 0).find((s) => s.key === "roxzone")!.missing).toBe(true);
  });
});

describe("the invariant, stated once", () => {
  it("never lets absent data outrank real data", () => {
    /*
     * The single assertion this whole file exists for. Eight stations, one of
     * them unpublished, everything else mediocre: the missing one must not win.
     */
    const stations: Record<string, number> = { ...full(300) };
    delete stations["farmers-carry"];

    const standings: StationStanding[] = analyseStations(
      { runs: RUNS, stations: stations as Record<StationId, number>, roxzoneSeconds: 300 } as never,
      full(220),
    );

    const best = strongestStation(standings)!;
    expect(best.missing).toBeFalsy();
    expect(best.station).not.toBe("farmers-carry");
  });
});
