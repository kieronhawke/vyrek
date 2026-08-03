/**
 * The contract tests. Brief §14's "every endpoint returns data satisfying the
 * `ResultsDataSource` shape the frontend expects".
 *
 * These matter more than they look. The frontend was built against a demo
 * source months before this engine existed; the whole promise of the interface
 * is that ingested data drops in without a component changing. That promise is
 * either tested or it is a hope.
 */

import { describe, expect, it } from "vitest";
import { ResultsService } from "./service";
import { toDivisionCode, toDivisionKey, allDivisionCodes, allDivisionKeys } from "./divisions";
import { makeHarness, syncOnce } from "../testing";
import { isCronAuthorised } from "../ops/auth";
import { buildConsoleModel, copyForFix, relative } from "../ops/console";
import type { ResultsDataSource } from "../../source";

async function seeded() {
  const h = await makeHarness();
  await syncOnce(h);
  return { h, service: new ResultsService(h.repo) as ResultsDataSource };
}

describe("division vocabulary", () => {
  it("round-trips every division in both directions", () => {
    for (const key of allDivisionKeys()) {
      const code = toDivisionCode(key);
      expect(code).not.toBeNull();
      expect(toDivisionKey(code!)).toBe(key);
    }
    expect(allDivisionCodes()).toHaveLength(allDivisionKeys().length);
  });

  it("returns null for an unmapped division rather than guessing", () => {
    expect(toDivisionCode("hyrox-underwater-basket-weaving")).toBeNull();
  });
});

describe("ResultsDataSource contract, served from our own store", () => {
  it("listEvents returns the frontend's EventSummary shape", async () => {
    const { service } = await seeded();
    const events = await service.listEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      slug: "s9-2026-manchester",
      city: "Manchester",
      season: "s9",
      year: 2026,
      status: "upcoming",
    });
  });

  it("getEvent returns divisions with leader and entrant counts", async () => {
    const { service } = await seeded();
    const event = await service.getEvent("s9-2026-manchester");
    expect(event).not.toBeNull();
    const division = event!.divisions.find((d) => d.divisionCode === "hyrox-men");
    expect(division).toBeTruthy();
    expect(division!.athleteCount).toBe(8);
    expect(division!.leaderAthleteName).toBe("Alaric Fenwick");
    // 01:02:41
    expect(division!.leaderTimeSeconds).toBe(3761);
  });

  it("getRanking paginates, derives the gap, and names the division", async () => {
    const { service } = await seeded();
    const page = await service.getRanking("s9-2026-manchester", "hyrox-men", { limit: 3 });
    expect(page).not.toBeNull();
    expect(page!.rows).toHaveLength(3);
    expect(page!.total).toBe(8);
    expect(page!.nextCursor).toBe("3");
    expect(page!.rows[0].gapToLeaderSeconds).toBe(0);
    // 01:04:07 minus 01:02:41.
    expect(page!.rows[1].gapToLeaderSeconds).toBe(86);
    expect(page!.division).toBe("hyrox-men");
  });

  it("getRanking filters by name and by age group", async () => {
    const { service } = await seeded();
    const byName = await service.getRanking("s9-2026-manchester", "hyrox-men", { q: "kilbride" });
    expect(byName!.rows).toHaveLength(1);
    expect(byName!.rows[0].athleteName).toBe("Eamon Kilbride");

    const byAge = await service.getRanking("s9-2026-manchester", "hyrox-men", {
      ageGroup: "30-34",
    });
    expect(byAge!.rows.length).toBeGreaterThan(0);
    expect(byAge!.rows.every((r) => r.ageGroup === "30-34")).toBe(true);
  });

  it("getResult returns a full race with runs, stations and division averages", async () => {
    const { h, service } = await seeded();
    const anyResult = [...h.repo.results.values()][0];
    const result = await service.getResult(anyResult.id);

    expect(result).not.toBeNull();
    expect(result!.runs).toHaveLength(8);
    expect(Object.keys(result!.stations)).toHaveLength(8);
    expect(result!.divisionAverage.runs).toHaveLength(8);
    expect(result!.fieldSize).toBe(8);
    expect(result!.eventCity).toBe("Manchester");
  });

  it("getAthlete unifies a race history", async () => {
    const { service } = await seeded();
    const athlete = await service.getAthlete("alaric-fenwick");
    expect(athlete).not.toBeNull();
    expect(athlete!.races).toHaveLength(1);
    expect(athlete!.pbSeconds).toBe(3761);
    expect(athlete!.divisionsRaced).toEqual(["hyrox-men"]);
  });

  it("searchAll finds athletes and events", async () => {
    const { service } = await seeded();
    const found = await service.searchAll("fenwick");
    expect(found.athletes[0].name).toBe("Alaric Fenwick");
    expect(found.athletes[0].raceCount).toBe(1);

    const byCity = await service.searchAll("manchester");
    expect(byCity.events[0].slug).toBe("s9-2026-manchester");
  });

  it("getRecords returns the fastest per division", async () => {
    const { service } = await seeded();
    const board = await service.getRecords();
    const record = board.entries.find((e) => e.divisionCode === "hyrox-men");
    expect(record?.athleteName).toBe("Alaric Fenwick");
    expect(record?.finishSeconds).toBe(3761);
  });

  it("getDivisionFinishTimes returns a sorted array, not row objects", async () => {
    const { service } = await seeded();
    const times = await service.getDivisionFinishTimes("s9-2026-manchester", "hyrox-men");
    expect(times).toHaveLength(8);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBe(3761);
  });

  it("returns null, not a throw, for things that do not exist", async () => {
    const { service } = await seeded();
    expect(await service.getEvent("s9-2026-atlantis")).toBeNull();
    expect(await service.getAthlete("nobody-at-all")).toBeNull();
    expect(await service.getResult("res_999999")).toBeNull();
    expect(await service.getRanking("s9-2026-atlantis", "hyrox-men")).toBeNull();
  });
});

describe("erasure holds at the data layer (§2)", () => {
  it("an anonymised athlete disappears from profiles, search and the board", async () => {
    const { h, service } = await seeded();
    const athlete = [...h.repo.athletes.values()].find((a) => a.name === "Alaric Fenwick")!;

    await h.repo.anonymiseAthlete(athlete.id);

    expect(await service.getAthlete("alaric-fenwick")).toBeNull();
    expect((await service.searchAll("fenwick")).athletes).toHaveLength(0);

    // But the row survives, so the field size and everyone else's rank are
    // still correct. That is the whole point of anonymising over deleting.
    const page = await service.getRanking("s9-2026-manchester", "hyrox-men");
    expect(page!.fieldSize).toBe(8);
    expect(page!.rows.find((r) => r.rank === 1)?.athleteName).toBe("Withdrawn athlete");
  });
});

describe("access control (§13, §14)", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://www.suthperformance.com/api/cron/results-catalog", { headers });

  it("rejects an unauthenticated trigger", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(isCronAuthorised(req({}))).toBe(false);
    expect(isCronAuthorised(req({ authorization: "Bearer wrong-value" }))).toBe(false);
  });

  it("accepts the configured secret", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(isCronAuthorised(req({ authorization: "Bearer s3cret-value" }))).toBe(true);
    expect(isCronAuthorised(req({ "x-cron-secret": "s3cret-value" }))).toBe(true);
  });

  it("treats a missing secret as closed, never as open", () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorised(req({ authorization: "Bearer anything" }))).toBe(false);
    expect(isCronAuthorised(req({}))).toBe(false);
  });
});

describe("operator console", () => {
  it("reports ingestion as amber with a stated reason, not red", async () => {
    const { h } = await seeded();
    const model = await buildConsoleModel(h.repo, new Date("2026-08-03T10:00:00.000Z"));

    const source = model.components.find((c) => c.key === "source")!;
    expect(source.health).toBe("amber");
    expect(source.detail).toMatch(/Disallow/);
    expect(model.ingestion.canIngest).toBe(false);
    expect(model.ingestion.reason).toMatch(/HYROX_SOURCE_ACCESS/);
  });

  it("copy-for-fix bundles everything needed to act on a quarantined row", async () => {
    const h = await makeHarness();
    const row = await h.repo.quarantine({
      sourceEventId: "LR3MS4JI1738",
      sourceDivisionId: "H_LR3MS4JI1738",
      sourceResultId: "H_LR3MS4JI1738:bib:1201",
      reason: "finish_time_out_of_range",
      detail: { failures: [{ reason: "finish_time_out_of_range" }] },
      rawPayload: { name: "Ivor Quennell", finishTime: "00:00:12" },
      ingestionRunId: null,
      reprocessedAt: null,
    });

    const block = copyForFix({ kind: "quarantine", row });
    expect(block).toContain("finish_time_out_of_range");
    expect(block).toContain("H_LR3MS4JI1738:bib:1201");
    expect(block).toContain("Ivor Quennell");
    expect(block).toContain("lib/results/engine/validate/validate.ts");
  });

  it("speaks in relative time", () => {
    const now = new Date("2026-08-03T10:00:00.000Z");
    expect(relative("2026-08-03T09:59:46.000Z", now)).toBe("14s ago");
    expect(relative("2026-08-03T09:30:00.000Z", now)).toBe("30m ago");
    expect(relative(null, now)).toBe("never");
  });
});
