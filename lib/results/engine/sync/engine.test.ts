/**
 * Ingestion behaviour, end to end, against recorded fixtures.
 *
 * Each of these maps to a line in the data engine brief's §14 test list. They
 * run in milliseconds with no database and no network, which is the point: a
 * safety mechanism that is expensive to test stops being tested.
 */

import { describe, expect, it } from "vitest";
import {
  DIVISION_CODE,
  SEASON,
  defaultFixtures,
  fixture,
  makeHarness,
  syncOnce,
} from "../testing";
import { ReplayAdapter } from "../source/replay-adapter";
import { FailingAdapter } from "../source/replay-adapter";
import { FallbackChain } from "../source/adapter";
import { runLiveTick } from "./live";
import { runReconcile, isReconcileDue } from "./reconcile";
import { orderForBackfill, allSeasonPaths, runBackfill } from "./backfill";
import { recomputeDistributionsForEvent } from "./distributions";
import { channelForEvent, deliveryModeFor } from "./publisher";
import { runSplitsBackfill, idpFromSourceResultId, hasSplits } from "./splits";

describe("idempotency (§14)", () => {
  it("running the same sync twice creates no duplicates", async () => {
    const h = await makeHarness();

    const first = await syncOnce(h);
    expect(first.inserted).toBe(8);

    // Second run: the content hash matches, so nothing is even parsed again.
    const second = await syncOnce(h);
    expect(second.skippedUnchanged).toBe(true);
    expect(second.inserted).toBe(0);

    // And forcing past the hash still writes no duplicates.
    const forced = await syncOnce(h, { force: true });
    expect(forced.inserted).toBe(0);
    expect(forced.unchanged).toBe(8);
    expect(h.repo.results.size).toBe(8);
  });
});

describe("live diff and fan-out (§8, §14)", () => {
  it("writes only the rows that changed and publishes once", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows.html"), fixture("list-rows-2.html")] },
      }),
    });

    await syncOnce(h, { publish: true });
    h.publisher.reset();

    h.adapter.advance();
    const second = await syncOnce(h, { publish: true });

    // Snapshot 2 swaps the top two and corrects one time: three rows change,
    // five do not.
    expect(second.updated).toBe(3);
    expect(second.unchanged).toBe(5);
    expect(second.inserted).toBe(0);

    expect(h.publisher.published).toHaveLength(1);
    const update = h.publisher.published[0];
    expect(update.channel).toBe(channelForEvent(h.event.slug));
    // Only rank changes are announced; the corrected time alone is not a move.
    expect(update.update.changed.map((c) => c.rankOverall).sort()).toEqual([1, 2]);
  });

  it("one upstream fetch per interval regardless of audience size", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows.html"), fixture("list-rows-2.html")] },
      }),
      event: { status: "live" },
    });

    // Thirty thousand people watching changes nothing about what we fetch.
    h.publisher.setSubscribers(channelForEvent(h.event.slug), 30_000);

    const before = h.adapter.requestCount();
    await runLiveTick(h.engine, { now: new Date("2026-08-03T10:00:00.000Z") });
    const afterFirst = h.adapter.requestCount();
    expect(afterFirst - before).toBe(1);

    // A second tick inside the interval must not fetch again.
    await runLiveTick(h.engine, { now: new Date("2026-08-03T10:00:10.000Z") });
    expect(h.adapter.requestCount()).toBe(afterFirst);

    // Past the interval, exactly one more.
    await runLiveTick(h.engine, { now: new Date("2026-08-03T10:00:25.000Z") });
    expect(h.adapter.requestCount()).toBe(afterFirst + 1);
  });

  it("falls back to cached-API polling at the realtime ceiling", () => {
    expect(deliveryModeFor(10)).toBe("realtime");
    expect(deliveryModeFor(100_000)).toBe("polling");
  });
});

describe("fallback chain and source failure (§11, §14)", () => {
  it("falls through to the next method when the primary fails", async () => {
    const good = new ReplayAdapter(defaultFixtures());
    const chain = new FallbackChain([new FailingAdapter("primary"), good]);
    const h = await makeHarness({ adapter: chain as never });

    const outcome = await h.engine.syncDivision({
      seasonPath: SEASON,
      event: h.event,
      division: h.division,
      sourceDivisionId: DIVISION_CODE,
    });

    expect(outcome.inserted).toBe(8);
    expect(chain.lastAttempts.map((a) => a.ok)).toEqual([false, true]);
  });

  it("total failure writes nothing, freezes, and pauses live updates", async () => {
    const chain = new FallbackChain([
      new FailingAdapter("primary"),
      new FailingAdapter("secondary"),
    ]);
    const h = await makeHarness({ adapter: chain as never, event: { status: "live" } });
    await h.repo.upsertSyncState({
      sourceEventId: "LR3MS4JI1738",
      eventId: h.event.id,
      lastSeenHash: "last-good",
      lastPolledAt: null,
      lastSuccessAt: null,
      isLive: true,
      liveArmedAt: null,
      liveIntervalSeconds: 20,
      consecutiveFailures: 0,
      updatesPaused: false,
      reconcileUntil: null,
      reconcileAttempts: 0,
    });

    await expect(
      h.engine.syncDivision({
        seasonPath: SEASON,
        event: h.event,
        division: h.division,
        sourceDivisionId: DIVISION_CODE,
      }),
    ).rejects.toThrow(/Every source access method failed/);

    await h.engine.freezeOnFailure(h.event, new Error("all failed"));

    // Nothing written.
    expect(h.repo.results.size).toBe(0);
    // Last-good hash preserved: recovery is "just run it again".
    const state = await h.repo.getSyncState("LR3MS4JI1738");
    expect(state?.lastSeenHash).toBe("last-good");
    expect(state?.updatesPaused).toBe(true);
    // The board stops claiming to be current.
    expect((await h.repo.getEventBySlug(h.event.slug))?.status).toBe("updates_paused");
    expect(h.publisher.published.at(-1)?.update.updatesPaused).toBe(true);
    expect((await h.repo.listAlerts()).some((a) => a.kind === "source_unreachable")).toBe(true);
  });

  it("keeps serving stored data while the source is unreachable", async () => {
    const h = await makeHarness();
    await syncOnce(h);
    const stored = await h.repo.getRanking({
      eventSlug: h.event.slug,
      divisionKey: "open-men",
    });
    expect(stored.rows).toHaveLength(8);

    // Source dies. Reads are unaffected: they never touch it.
    const dead = new FallbackChain([new FailingAdapter("a"), new FailingAdapter("b")]);
    void dead;
    const after = await h.repo.getRanking({
      eventSlug: h.event.slug,
      divisionKey: "open-men",
    });
    expect(after.rows).toHaveLength(8);
  });
});

describe("validation and quarantine (§9, §14)", () => {
  it("quarantines implausible rows instead of writing them", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-implausible.html")] },
      }),
    });

    const outcome = await syncOnce(h);

    expect(outcome.inserted).toBe(0);
    expect(outcome.quarantined).toBe(2);
    expect(h.repo.results.size).toBe(0);

    const rows = await h.repo.listQuarantine();
    expect(rows.map((r) => r.reason)).toEqual([
      "finish_time_out_of_range",
      "finish_time_out_of_range",
    ]);
    // The raw payload is kept so the row can be reprocessed from the console.
    expect(rows[0].rawPayload).toBeTruthy();
  });
});

describe("parser-shape sentinel (§13, §14)", () => {
  it("raises a distinct alert rather than mass-quarantining", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-renamed.html")] },
      }),
    });

    const outcome = await syncOnce(h);

    expect(outcome.inserted).toBe(0);
    // The distinguishing behaviour: nothing was quarantined, because nothing
    // parsed. Silent mass-quarantine is exactly what this exists to prevent.
    expect(outcome.quarantined).toBe(0);

    const alerts = await h.repo.listAlerts();
    const shape = alerts.find((a) => a.kind === "parser_shape");
    expect(shape).toBeTruthy();
    expect(shape?.severity).toBe("critical");
    expect(shape?.message).toMatch(/[Pp]arser may be broken/);
  });
});

describe("completeness reconciliation (§13, §14)", () => {
  it("flags a division short of its published entrant count", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-short.html")] },
      }),
    });

    const outcome = await syncOnce(h);

    expect(outcome.inserted).toBe(3);
    expect(outcome.completenessMismatch).toEqual({ published: 8, stored: 3 });

    const alert = (await h.repo.listAlerts()).find((a) => a.kind === "completeness");
    expect(alert).toBeTruthy();
    expect(alert?.message).toMatch(/stored 3 rows against a published 8/);
  });
});

describe("post-race reconciliation (§11)", () => {
  it("re-checks a finalised event on a decaying schedule, then stops", async () => {
    const end = new Date("2026-08-01T18:00:00.000Z");
    const event = {
      status: "final" as const,
      startDatetime: "2026-08-01T09:00:00.000Z",
      endDatetime: end.toISOString(),
    };

    const h = await makeHarness({ event });
    const state = await h.repo.getSyncState("LR3MS4JI1738");

    const hoursAfter = (n: number) => new Date(end.getTime() + n * 3_600_000);
    const stored = await h.repo.getEventBySlug(h.event.slug);

    // Too soon.
    expect(isReconcileDue(stored!, state, hoursAfter(1))).toBe(false);
    // First window.
    expect(isReconcileDue(stored!, state, hoursAfter(7))).toBe(true);
    // Past the whole window, it stops for good.
    expect(isReconcileDue(stored!, state, hoursAfter(400))).toBe(false);
  });

  it("advances the schedule even when nothing changed", async () => {
    const h = await makeHarness({
      event: {
        status: "final",
        startDatetime: "2026-08-01T09:00:00.000Z",
        endDatetime: "2026-08-01T18:00:00.000Z",
      },
    });

    await runReconcile(h.engine, { now: new Date("2026-08-02T02:00:00.000Z") });
    const state = await h.repo.getSyncState("LR3MS4JI1738");
    expect(state?.reconcileAttempts).toBe(1);
  });
});

describe("backfill ordering (§5)", () => {
  it("puts UK first, then India and Hong Kong, then the rest", async () => {
    const base = {
      id: "",
      name: "",
      country: "",
      countryIso: "",
      season: "s9",
      year: 2026,
      status: "final" as const,
      tzOffsetMinutes: 0,
      athleteCount: 0,
      isDemo: false,
    };
    const events = [
      { ...base, id: "1", slug: "berlin", city: "Berlin", region: "Europe", startDate: "2026-05-01" },
      { ...base, id: "2", slug: "hk", city: "Hong Kong", region: "Asia", startDate: "2026-05-01" },
      { ...base, id: "3", slug: "london", city: "London", region: "UK", startDate: "2026-05-01" },
      { ...base, id: "4", slug: "mumbai", city: "Mumbai", region: "Asia", startDate: "2026-05-01" },
    ];

    expect(orderForBackfill(events).map((e) => e.slug)).toEqual([
      "london",
      "mumbai",
      "hk",
      "berlin",
    ]);
  });
});

describe("splits backfill (§4)", () => {
  it("fills splits from the detail view and validates them against the finish", async () => {
    const detail = fixture("detail-splits.html");
    const h = await makeHarness({
      fixtures: defaultFixtures({
        // Every athlete on the board resolves to the same detail fixture; only
        // the number filled matters here, not whose race it is.
        details: Object.fromEntries(
          ["LRAA0000001", "LRAA0000002", "LRAA0000003"].map((idp) => [idp, detail]),
        ),
      }),
    });

    await syncOnce(h);
    const before = [...h.repo.results.values()];
    expect(before.every((r) => !hasSplits(r))).toBe(true);

    const outcome = await runSplitsBackfill(h.engine, { limit: 3 });

    expect(outcome.filled).toBe(3);
    expect(outcome.quarantined).toBe(0);
    // Eight athletes on the board, three filled: the rest are still waiting.
    expect(outcome.remaining).toBe(5);

    const filled = [...h.repo.results.values()].filter(hasSplits);
    expect(filled).toHaveLength(3);
    expect(filled[0].splits.runs).toHaveLength(8);
    expect(filled[0].splits.stations).toHaveLength(8);
    expect(filled[0].splits.roxzoneMs).toBeGreaterThan(0);
  });

  it("takes the top of the board first, because that is what people open", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        details: { LRAA0000001: fixture("detail-splits.html") },
      }),
    });
    await syncOnce(h);

    const outcome = await runSplitsBackfill(h.engine, { limit: 1 });
    expect(outcome.filled).toBe(1);

    const filled = [...h.repo.results.values()].find(hasSplits);
    expect(filled?.rankOverall).toBe(1);
  });

  it("does not retry a row it has already quarantined", async () => {
    // The detail fixture's splits cannot reconcile with this board's finish
    // times, so every row quarantines — which is the case that matters.
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-implausible.html")] },
        details: { LRAA0000101: fixture("detail-splits.html") },
      }),
    });
    await syncOnce(h);

    // Both rows quarantine at the list stage, so nothing is left to fetch.
    const first = await runSplitsBackfill(h.engine, { limit: 5 });
    expect(first.attempted).toBe(0);

    // And a row quarantined at the splits stage is not offered again: without
    // this it is re-fetched and re-quarantined on every run, for ever.
    const h2 = await makeHarness({
      fixtures: defaultFixtures({
        details: { LRAA0000001: fixture("detail-splits.html") },
      }),
    });
    await syncOnce(h2);
    await h2.repo.quarantine({
      sourceEventId: null,
      sourceDivisionId: null,
      sourceResultId: `${DIVISION_CODE}:LRAA0000001`,
      reason: "segment_out_of_range",
      detail: { stage: "splits" },
      rawPayload: null,
      ingestionRunId: null,
      reprocessedAt: null,
    });

    const after = await runSplitsBackfill(h2.engine, { limit: 5 });
    const attemptedIds = [...h2.repo.results.values()].filter(hasSplits);
    expect(attemptedIds.every((r) => r.sourceResultId !== `${DIVISION_CODE}:LRAA0000001`)).toBe(
      true,
    );
    expect(after.filled).toBeLessThanOrEqual(5);
  });

  it("recovers the source id from the stored result id", () => {
    expect(idpFromSourceResultId("H_LR3MS4JI163A#men:LRAA0000001")).toBe("LRAA0000001");
  });
});

describe("athlete identity does not multiply (§13)", () => {
  /**
   * The failure this pins down, measured on real data: 1,006 orphaned athlete
   * profiles and one person with eleven of them. A partner on a doubles row had
   * no source id, so every appearance created a fresh profile with an
   * incremented slug — and did it again on the next sync, for ever.
   */
  it("re-syncing a doubles board creates no new athletes", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-doubles.html")] },
      }),
    });

    await syncOnce(h);
    const first = h.repo.athletes.size;
    expect(first).toBe(4); // two teams, two people each

    // Three more syncs. The count must not move by one.
    await syncOnce(h, { force: true });
    await syncOnce(h, { force: true });
    await syncOnce(h, { force: true });
    expect(h.repo.athletes.size).toBe(first);
  });

  it("gives every person in a team a stable id derived from the entry", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-doubles.html")] },
      }),
    });
    await syncOnce(h);

    const ids = [...h.repo.athletes.values()].map((a) => a.sourceAthleteId).sort();
    // Position-qualified, so the two people on one entry are distinguishable
    // and neither is confused with the entry itself.
    expect(ids).toEqual([
      "LRAA0000301#p0", "LRAA0000301#p1",
      "LRAA0000302#p0", "LRAA0000302#p1",
    ]);
    expect(new Set(ids).size).toBe(4);
  });

  it("re-syncing an individual board creates no new athletes either", async () => {
    const h = await makeHarness();
    await syncOnce(h);
    const first = h.repo.athletes.size;
    expect(first).toBe(8);

    await syncOnce(h, { force: true });
    await syncOnce(h, { force: true });
    expect(h.repo.athletes.size).toBe(first);
  });

  it("leaves no athlete without a race attached", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-doubles.html")] },
      }),
    });
    await syncOnce(h);

    // Every profile must be reachable from a result, as its athlete or as a
    // partner. An orphan is a profile nobody can ever find.
    const results = [...h.repo.results.values()];
    for (const athlete of h.repo.athletes.values()) {
      const attached = results.some(
        (r) => r.athleteId === athlete.id || r.partnerAthleteIds.includes(athlete.id),
      );
      expect(attached, `${athlete.slug} has no race`).toBe(true);
    }
  });
});

describe("historical seasons (§5)", () => {
  it("walks every season, newest first", () => {
    const seasons = allSeasonPaths();
    expect(seasons[0]).toBe("season-9");
    expect(seasons).toContain("season-1");
    expect(seasons).toHaveLength(9);
  });

  it("catalogues one season per run and remembers which", async () => {
    const index = fixture("season-index.html");
    const h = await makeHarness({
      fixtures: defaultFixtures({
        seasonIndex: { "season-9": index, "season-8": index },
      }),
    });

    const first = await runBackfill(h.engine, { maxEvents: 0 });
    expect(first.seasonCatalogued).toBe("season-9");

    // The cursor advances, so the next run takes the next season rather than
    // re-catalogueing the same one for ever.
    const second = await runBackfill(h.engine, { maxEvents: 0 });
    expect(second.seasonCatalogued).toBe("season-8");

    const done = await h.repo.getSetting<string[]>("backfill_seasons_done");
    expect(done).toEqual(["season-9", "season-8"]);
  });

  it("leaves a season uncursored when it fails, so the next run retries it", async () => {
    // Only season-9 has a fixture here, so season-8 throws. The failure must
    // not stop the run or mark the season done.
    const h = await makeHarness();
    expect((await runBackfill(h.engine, { maxEvents: 0 })).seasonCatalogued).toBe("season-9");
    expect((await runBackfill(h.engine, { maxEvents: 0 })).seasonCatalogued).toBeNull();
    expect(await h.repo.getSetting<string[]>("backfill_seasons_done")).toEqual(["season-9"]);
  });

  it("can be told to pull results without deepening the catalogue", async () => {
    const h = await makeHarness();
    const outcome = await runBackfill(h.engine, { maxEvents: 0, catalogueSeasons: false });
    expect(outcome.seasonCatalogued).toBeNull();
  });
});

describe("station distributions (§6)", () => {
  it("computes percentiles from stored results only after a sync", async () => {
    const h = await makeHarness();
    await syncOnce(h);

    // The list fixtures carry no splits, so only the finish distribution is
    // computable — and it must not invent the rest.
    const { written } = await recomputeDistributionsForEvent(h.repo, h.event.id);
    expect(written).toBe(1);

    const finish = await h.repo.getStationDistribution({
      scope: "event",
      eventId: h.event.id,
      divisionKey: "open-men",
      stationKey: "finish",
    });
    expect(finish?.sampleCount).toBe(8);
    expect(finish?.medianMs).toBeGreaterThan(0);
    expect(finish?.percentiles.p50).toBeGreaterThan(0);
  });
});
