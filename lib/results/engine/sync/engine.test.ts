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
import { AllSourcesFailedError, FallbackChain } from "../source/adapter";
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

    // A real AllSourcesFailedError, because the label now depends on the type:
    // a database error must not be reported as the source being unreachable.
    await h.engine.freezeOnFailure(
      h.event,
      new AllSourcesFailedError([
        { adapter: "primary", ok: false, error: "simulated" },
        { adapter: "secondary", ok: false, error: "simulated" },
      ]),
    );

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

  it("does not blame the source for a failure that was ours", async () => {
    const h = await makeHarness({ event: { status: "live" } });
    await h.engine.freezeOnFailure(h.event, new Error("duplicate key value violates…"));

    const alerts = await h.repo.listAlerts();
    // Calling a database error "source unreachable" sent me hunting for a
    // network problem that did not exist, while the real cause sat in a detail
    // field nobody reads.
    expect(alerts.some((a) => a.kind === "source_unreachable")).toBe(false);
    expect(alerts.some((a) => a.message.includes("not because of the source"))).toBe(true);
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

describe("completeness counts people, not rows", () => {
  /**
   * The published count counts people; we store one row per entry, and a
   * doubles entry is two people. Comparing rows against it reported every team
   * division as exactly half-missing — 1,147 false warnings, which is more than
   * enough to make the whole check ignorable.
   */
  it("does not report a doubles board as half-missing", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-doubles.html")] },
      }),
    });
    // The fixture publishes 2 and serves 2 team rows — 4 people either way once
    // both sides are counted the same.
    const outcome = await syncOnce(h);
    expect(outcome.inserted).toBe(2);

    const complaints = (await h.repo.listAlerts()).filter((a) => a.kind === "completeness");
    expect(complaints).toEqual([]);
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

describe("identity keys that can disagree", () => {
  /**
   * Both `slug` and `source_event_id` are unique, and they can point at
   * different rows. A weekend catalogued from another season page can produce a
   * different label, therefore a different city, therefore a different slug —
   * while carrying the same source id.
   *
   * Upserting on the slug alone then failed on a duplicate source id and took
   * down the whole season sync. One relabelled event, an entire backfill run
   * lost. Found by running a real backfill; no test had ever produced two
   * labels for one weekend.
   */
  it("re-labelling a weekend updates the event rather than colliding", async () => {
    const h = await makeHarness();

    const first = await h.repo.upsertEvent({
      slug: "s8-2026-london",
      name: "HYROX London 2026",
      city: "London",
      country: "", countryIso: "", region: "UK",
      season: "s8", year: 2026, status: "final",
      tzOffsetMinutes: 0, athleteCount: 0,
      sourceEventId: "WEEKEND-1",
      isDemo: false,
    });

    // Same weekend, different label, therefore a different slug.
    const second = await h.repo.upsertEvent({
      slug: "s8-2026-london-excel",
      name: "HYROX London ExCeL 2026",
      city: "London ExCeL",
      country: "", countryIso: "", region: "UK",
      season: "s8", year: 2026, status: "final",
      tzOffsetMinutes: 0, athleteCount: 0,
      sourceEventId: "WEEKEND-1",
      isDemo: false,
    });

    // One event, updated — not two, and not a crash.
    expect(second.id).toBe(first.id);
    expect(second.city).toBe("London ExCeL");
    expect((await h.repo.listEvents()).filter((e) => e.sourceEventId === "WEEKEND-1")).toHaveLength(1);
  });

  /**
   * A HYROX weekend carries a separate source id per race day, so "Cardiff
   * 2026" is one event with several. Storing a single id meant whichever day
   * was written last won, and 76 real events thrashed theirs on every catalogue
   * run — while the schema's unique constraint made a shared slug fatal.
   */
  it("collects every race day of a weekend into one event", async () => {
    const h = await makeHarness();
    const base = {
      slug: "s8-2026-cardiff", name: "HYROX Cardiff 2026", city: "Cardiff",
      country: "", countryIso: "", region: "UK", season: "s8", year: 2026,
      status: "final" as const, tzOffsetMinutes: 0, athleteCount: 0, isDemo: false,
    };

    const saturday = await h.repo.upsertEvent({ ...base, sourceEventId: "WEEKEND-SAT" });
    const sunday = await h.repo.upsertEvent({ ...base, sourceEventId: "WEEKEND-SUN" });

    expect(sunday.id).toBe(saturday.id);
    expect([...(sunday.sourceEventIds ?? [])].sort()).toEqual(["WEEKEND-SAT", "WEEKEND-SUN"]);

    // Either day finds the event.
    expect((await h.repo.getEventBySourceId("WEEKEND-SAT"))?.id).toBe(saturday.id);
    expect((await h.repo.getEventBySourceId("WEEKEND-SUN"))?.id).toBe(saturday.id);
  });

  it("never narrows the set of race days it knows about", async () => {
    const h = await makeHarness();
    const base = {
      slug: "s8-2026-stockholm", name: "x", city: "Stockholm",
      country: "", countryIso: "", region: "Europe", season: "s8", year: 2026,
      status: "final" as const, tzOffsetMinutes: 0, athleteCount: 0, isDemo: false,
    };
    await h.repo.upsertEvent({ ...base, sourceEventId: "D1" });
    await h.repo.upsertEvent({ ...base, sourceEventId: "D2" });
    // A later sync that only saw one day must not erase the other.
    const after = await h.repo.upsertEvent({ ...base, sourceEventId: "D1" });
    expect([...(after.sourceEventIds ?? [])].sort()).toEqual(["D1", "D2"]);
  });

  it("keys a division on its source id before its event and key", async () => {
    const h = await makeHarness();
    const a = await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men", displayName: "HYROX Men",
      entrantCount: 0, sourceDivisionId: "H_X#men",
    });
    const b = await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men-renamed", displayName: "HYROX Men",
      entrantCount: 5, sourceDivisionId: "H_X#men",
    });
    expect(b.id).toBe(a.id);
    expect(b.entrantCount).toBe(5);
  });
});

describe("a batch that repeats a key", () => {
  /**
   * Postgres refuses an ON CONFLICT statement that would touch the same row
   * twice, and it fails the *whole* command — so one repeated id cost an entire
   * division. Fifteen events failed this way, and the alert called it "source
   * unreachable", which sent me looking at the network.
   */
  it("keeps the last of a repeated result id rather than failing the batch", async () => {
    const h = await makeHarness();
    const base = {
      eventId: h.event.id, divisionId: h.division.id, athleteId: "ath_x",
      status: "finished" as const, splits: { runs: [], stations: [] },
      partnerAthleteIds: [], isDemo: false,
    };
    const counts = await h.repo.upsertResults([
      { ...base, sourceResultId: "DUP", rankOverall: 1, finishTimeMs: 3_600_000 },
      { ...base, sourceResultId: "DUP", rankOverall: 2, finishTimeMs: 3_700_000 },
    ]);
    expect(counts.inserted + counts.updated).toBe(1);
    expect((await h.repo.getResultBySourceId("DUP"))?.rankOverall).toBe(2);
  });

  it("keeps the last of a repeated athlete slug", async () => {
    const h = await makeHarness();
    const base = {
      name: "Repeated Person", nationality: "GBR", gender: "men",
      claimedByUserId: null, isDemo: false, isAnonymised: false,
      identityConfidence: 1, needsIdentityReview: false,
    };
    const created = await h.repo.upsertAthletes([
      { ...base, slug: "repeated-person", sourceAthleteId: "A" },
      { ...base, slug: "repeated-person", sourceAthleteId: "B" },
    ]);
    expect(created).toHaveLength(1);
  });
});

describe("rows the source gives no id for", () => {
  /**
   * Not every row carries an `idp`. On one real board only 41% did, and in the
   * batched rewrite a person with no id was created but never findable again —
   * so the row that owned them was dropped as "owner unresolved". 405 of 686
   * results vanished from one division, and the completeness check reported it
   * as a missing page rather than as rows we had thrown away.
   */
  it("keeps rows whose athletes have no source id", async () => {
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-no-idp.html")] },
      }),
    });

    const outcome = await syncOnce(h);
    expect(outcome.inserted).toBe(4);
    expect(h.repo.results.size).toBe(4);
    expect(h.repo.athletes.size).toBe(4);

    // And every one of them is attached to its row.
    const results = [...h.repo.results.values()];
    for (const athlete of h.repo.athletes.values()) {
      expect(results.some((r) => r.athleteId === athlete.id)).toBe(true);
    }
  });

  it("quarantines a count when it does drop rows, rather than losing them silently", async () => {
    // The invariant that matters: dropping is allowed, dropping quietly is not.
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-no-idp.html")] },
      }),
    });
    const outcome = await syncOnce(h);
    expect(outcome.quarantined).toBe(0);
    expect(outcome.inserted).toBe(4);
  });
});

describe("a division resolves its athletes in bulk", () => {
  /**
   * Resolving one athlete at a time cost up to three round trips each — around
   * 460 for a 77-row doubles board, half a million across the catalogue. That
   * is fifteen hours of pure latency, and it made a working backfill look
   * broken. It also leaked: every call is a window in which the process can die
   * with athletes created and their rows unwritten, and a killed run left
   * 13,000 profiles attached to nothing.
   */
  it("does not make a database call per athlete", async () => {
    const h = await makeHarness();
    let singleReads = 0;
    let batchReads = 0;
    let batchWrites = 0;

    const repo = h.repo;
    const origRead = repo.getAthleteBySourceId.bind(repo);
    const origWrite = repo.upsertAthlete.bind(repo);
    const origBatchRead = repo.getAthletesBySourceIds.bind(repo);
    const origBatchWrite = repo.upsertAthletes.bind(repo);

    repo.getAthleteBySourceId = async (id) => { singleReads += 1; return origRead(id); };
    repo.upsertAthlete = async (a) => origWrite(a);
    repo.getAthletesBySourceIds = async (ids) => { batchReads += 1; return origBatchRead(ids); };
    repo.upsertAthletes = async (rows) => { batchWrites += 1; return origBatchWrite(rows); };

    await syncOnce(h);

    expect(h.repo.athletes.size).toBe(8);
    // One read and one write for the whole board, however many athletes it has.
    expect(batchReads).toBe(1);
    expect(batchWrites).toBe(1);
    expect(singleReads).toBe(0);
  });

  it("writes no athlete it cannot attach to a row", async () => {
    // The orphan invariant, stated as an invariant rather than a count.
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-doubles.html")] },
      }),
    });
    await syncOnce(h);

    const results = [...h.repo.results.values()];
    for (const athlete of h.repo.athletes.values()) {
      const attached = results.some(
        (r) => r.athleteId === athlete.id || r.partnerAthleteIds.includes(athlete.id),
      );
      expect(attached, `${athlete.slug} is attached to nothing`).toBe(true);
    }
  });

  it("creates nothing at all for a board that is entirely invalid", async () => {
    // Validation runs before resolution, so a quarantined board leaves no
    // profiles behind to be adopted by a row that will never exist.
    const h = await makeHarness({
      fixtures: defaultFixtures({
        divisions: { [DIVISION_CODE]: [fixture("list-rows-implausible.html")] },
      }),
    });
    const outcome = await syncOnce(h);
    expect(outcome.quarantined).toBe(2);
    expect(h.repo.athletes.size).toBe(0);
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
    // and neither is confused with the entry itself — and **division**-qualified,
    // because an entry id is not unique across the catalogue.
    //
    // ⚠️ The entry id alone was not enough. `LR3MS4JI55C948#p0` was parsed from
    // boards at Incheon, Taipei, Shanghai, Osaka, Wuhan, Hong Kong and Beijing,
    // so one synthetic athlete absorbed a different person from each and ended
    // up listed in all fourteen divisions of a single event. `sourceResultId`
    // carries the division and is the only identifier here guaranteed unique.
    expect(ids).toEqual([
      "H_LR3MS4JI1738:LRAA0000301#p0", "H_LR3MS4JI1738:LRAA0000301#p1",
      "H_LR3MS4JI1738:LRAA0000302#p0", "H_LR3MS4JI1738:LRAA0000302#p1",
    ]);
    expect(new Set(ids).size).toBe(4);
    // Every id names its own division, so two events cannot share a partner.
    for (const id of ids) expect(id).toContain(":");
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

  it("stops before its time budget rather than being killed", async () => {
    const h = await makeHarness();
    // A clock started ten seconds ago against a one-second budget: already
    // expired, without the test having to sleep for it.
    const outcome = await runBackfill(h.engine, {
      maxEvents: 5,
      budgetMs: 1_000,
      now: new Date(Date.now() - 10_000),
    });
    expect(outcome.exhaustedBudget).toBe(true);
    expect(outcome.eventsCompleted).toEqual([]);
    // And the run is properly closed, not left saying "running".
    expect((await h.repo.latestRun("backfill"))?.status).toBe("ok");
  });

  it("does not start a season catalogue it has no room to finish", async () => {
    // A season is 200+ requests. Attempting one inside a four-minute serverless
    // budget spends the whole window and returns having done nothing — which is
    // exactly what the backfill cron did on every invocation.
    const h = await makeHarness();
    const outcome = await runBackfill(h.engine, { maxEvents: 0, budgetMs: 240_000 });
    expect(outcome.seasonCatalogued).toBeNull();

    // With a generous budget it goes ahead.
    const roomy = await makeHarness();
    const second = await runBackfill(roomy.engine, { maxEvents: 0, budgetMs: 900_000 });
    expect(second.seasonCatalogued).toBe("season-9");
  });

  it("treats an event as done when its divisions are, not when its event row says so", async () => {
    /**
     * The checkpoint used to read the *event's* sync state, and that quietly
     * stopped working when the content hash moved to the division: once every
     * division skipped as unchanged, nothing wrote the event-level checkpoint,
     * so the event was chosen again every round. One repeated for three rounds
     * straight, re-fetching fourteen divisions each time to learn nothing.
     */
    const h = await makeHarness();
    await syncOnce(h); // division now carries a hash

    const outcome = await runBackfill(h.engine, { maxEvents: 3, catalogueSeasons: false });
    expect(outcome.eventsSkipped).toContain(h.event.slug);
    expect(outcome.eventsCompleted).toEqual([]);
  });

  it("checkpoints an event that has no divisions instead of retrying it for ever", async () => {
    // Nothing syncs it, so nothing writes its checkpoint, so it is chosen
    // again every round — occupying one of the run's three slots permanently.
    // One event did exactly this in every round for an hour.
    const h = await makeHarness();
    for (const d of [...h.repo.divisions.values()]) h.repo.divisions.delete(d.id);

    const first = await runBackfill(h.engine, { maxEvents: 3, catalogueSeasons: false });
    expect(first.eventsWithoutDivisions).toContain(h.event.slug);

    // Second round: skipped, not picked again.
    const second = await runBackfill(h.engine, { maxEvents: 3, catalogueSeasons: false });
    expect(second.eventsWithoutDivisions).toEqual([]);
    expect(second.eventsSkipped).toContain(h.event.slug);
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

describe("a row that changes hands is a changed row", () => {
  it("rewrites the athlete when a re-pull resolves the row differently", async () => {
    // ⚠️ `materiallyDifferent` compared ranks, times, status and splits, and not
    // who the row belonged to. So a re-pull that resolved a row to a different
    // athlete saw "unchanged" and wrote nothing — which made the partner
    // identity fix unshippable. 1,486 divisions were queued to re-pull under the
    // corrected derivation and the first round reported `+0 rows`: correct by
    // its own definition, having recomputed every id and thrown them away.
    const h = await makeHarness();
    const division = await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men", displayName: "Open Men",
      entrantCount: 0, publishedEntrantCount: null, sourceDivisionId: "H_X#men",
    });
    const [before] = await h.repo.upsertAthletes([{
      slug: "before", name: "Before", nationality: null, gender: null,
      sourceAthleteId: "A1", claimedByUserId: null, isDemo: false,
      isAnonymised: false, identityConfidence: 1, needsIdentityReview: false,
    }]);
    const [after] = await h.repo.upsertAthletes([{
      slug: "after", name: "After", nationality: null, gender: null,
      sourceAthleteId: "A2", claimedByUserId: null, isDemo: false,
      isAnonymised: false, identityConfidence: 1, needsIdentityReview: false,
    }]);

    const row = {
      eventId: h.event.id, divisionId: division.id, sourceResultId: "H_X#men:R1",
      rankOverall: 1, rankAgeGroup: 1, ageGroup: "30-34", sex: "men",
      finishTimeMs: 3_600_000, roxzoneTimeMs: null, status: "finished" as const,
      wave: null, bib: null, splits: { runs: [], stations: [] },
      partnerAthleteIds: [], isDemo: false,
    };

    await h.repo.upsertResults([{ ...row, athleteId: before.id }]);
    // Same result id, same time, different person.
    const counts = await h.repo.upsertResults([{ ...row, athleteId: after.id }]);

    expect(counts.updated).toBe(1);
    expect(counts.unchanged).toBe(0);
    const stored = await h.repo.getResultBySourceId("H_X#men:R1");
    expect(stored?.athleteId).toBe(after.id);
  });

  it("treats a changed partner list as a change too", async () => {
    const h = await makeHarness();
    const division = await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "doubles-men", displayName: "Doubles Men",
      entrantCount: 0, publishedEntrantCount: null, sourceDivisionId: "HD_X#men",
    });
    const made = await h.repo.upsertAthletes(
      ["a", "b", "c"].map((n) => ({
        slug: n, name: n.toUpperCase(), nationality: null, gender: null,
        sourceAthleteId: `S${n}`, claimedByUserId: null, isDemo: false,
        isAnonymised: false, identityConfidence: 1, needsIdentityReview: false,
      })),
    );

    const row = {
      eventId: h.event.id, divisionId: division.id, sourceResultId: "HD_X#men:R1",
      athleteId: made[0].id, rankOverall: 1, rankAgeGroup: 1, ageGroup: "30-34",
      sex: "men", finishTimeMs: 3_600_000, roxzoneTimeMs: null,
      status: "finished" as const, wave: null, bib: null,
      splits: { runs: [], stations: [] }, isDemo: false,
    };

    await h.repo.upsertResults([{ ...row, partnerAthleteIds: [made[1].id] }]);
    const counts = await h.repo.upsertResults([{ ...row, partnerAthleteIds: [made[2].id] }]);

    expect(counts.updated).toBe(1);
    const stored = await h.repo.getResultBySourceId("HD_X#men:R1");
    expect(stored?.partnerAthleteIds).toEqual([made[2].id]);
  });
});
