/**
 * Keeping the start list current for a race that has not happened.
 *
 * The bug this closes showed as "0 athletes" on the HYROX Chiba 2026 page two
 * days before the race, while the source held 1,635 entrants. These pin the
 * decisions that make it stay correct rather than merely be correct once.
 */

import { describe, expect, it, vi } from "vitest";
import { syncStartLists } from "./start-lists";
import type { SyncEngine } from "./engine";
import type { ResultsRepository } from "../repository";
import type { EngineDivision, EngineEvent } from "../types";

const NOW = new Date("2026-08-04T12:00:00Z");

function event(over: Partial<EngineEvent> = {}): EngineEvent {
  return {
    id: "e1",
    slug: "s9-2026-chiba",
    name: "HYROX Chiba 2026",
    city: "Chiba",
    season: "s9",
    year: 2026,
    status: "upcoming",
    startDate: "2026-08-06",
    sourceSeasonPath: "season-9",
    sourceEventId: "LR3MS4JI1739",
    ...over,
  } as EngineEvent;
}

function division(key: string, sourceDivisionId: string | null = `H_X#${key}`): EngineDivision {
  return { id: `d-${key}`, eventId: "e1", divisionKey: key, sourceDivisionId } as EngineDivision;
}

function harness(events: EngineEvent[], divisions: EngineDivision[], written = 10) {
  const calls: Array<Record<string, unknown>> = [];
  const engine = {
    syncDivision: vi.fn(async (opts: Record<string, unknown>) => {
      calls.push(opts);
      return { inserted: written, updated: 0 };
    }),
  } as unknown as SyncEngine;
  const repo = {
    listEvents: async () => events,
    listDivisions: async () => divisions,
  } as unknown as ResultsRepository;
  return { engine, repo, calls };
}

describe("which races get a start list pulled", () => {
  it("pulls a race happening in two days", async () => {
    const { engine, repo } = harness([event()], [division("men")]);

    const r = await syncStartLists(engine, { repo, now: NOW });

    expect(r.eventsChecked).toBe(1);
    expect(r.entrantsUpserted).toBe(10);
  });

  it("leaves finished events alone", async () => {
    // Re-pulling the archive's start lists would be a request per division
    // across 2,692 of them, for information nobody will ever look at.
    const { engine, repo, calls } = harness(
      [event({ status: "final", startDate: "2024-06-01" })],
      [division("men")],
    );

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls).toHaveLength(0);
  });

  it("leaves a race four months out alone", async () => {
    const { engine, repo, calls } = harness(
      [event({ startDate: "2026-12-02" })],
      [division("men")],
    );

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls).toHaveLength(0);
  });

  it("still pulls a race that started today", async () => {
    // The board flips from start list to results during race day; until it
    // does, this is the only thing keeping the page honest.
    const { engine, repo, calls } = harness(
      [event({ startDate: "2026-08-04" })],
      [division("men")],
    );

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls).toHaveLength(1);
  });

  it("pulls an upcoming race that has no date at all", async () => {
    // Most of the archive has no date — HYROX publishes upcoming races only —
    // so requiring one would exclude the events this exists for.
    const { engine, repo, calls } = harness(
      [event({ startDate: null })],
      [division("men")],
    );

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls).toHaveLength(1);
  });
});

describe("how it asks", () => {
  it("reads the start list, not the results board", async () => {
    const { engine, repo, calls } = harness([event()], [division("men")]);

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls[0].source).toBe("start-list");
  });

  it("writes even when the checkpoint hash is unchanged", async () => {
    // ⚠️ The hash it would be compared against was left by the *results* sync.
    // Honouring it freezes the list on the first pull and lets it go stale
    // through entry week, which is the only week it matters.
    const { engine, repo, calls } = harness([event()], [division("men")]);

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls[0].force).toBe(true);
  });

  it("skips a division the source gave us no id for", async () => {
    const { engine, repo, calls } = harness([event()], [division("men", null)]);

    await syncStartLists(engine, { repo, now: NOW });

    expect(calls).toHaveLength(0);
  });
});

describe("when part of it fails", () => {
  it("keeps going and reports what did not work", async () => {
    // Chiba's doubles and relay boards genuinely have no entries published.
    // One of those must not cost the 1,635 entrants on the singles boards.
    const calls: string[] = [];
    const engine = {
      syncDivision: vi.fn(async (opts: { division: EngineDivision }) => {
        calls.push(opts.division.divisionKey);
        if (opts.division.divisionKey === "doubles-men") throw new Error("no entries");
        return { inserted: 5, updated: 0 };
      }),
    } as unknown as SyncEngine;
    const repo = {
      listEvents: async () => [event()],
      listDivisions: async () => [division("men"), division("doubles-men"), division("women")],
    } as unknown as ResultsRepository;

    const r = await syncStartLists(engine, { repo, now: NOW });

    expect(calls).toEqual(["men", "doubles-men", "women"]);
    expect(r.entrantsUpserted).toBe(10);
    expect(r.failures).toEqual([
      { event: "s9-2026-chiba", division: "doubles-men", error: "no entries" },
    ]);
  });

  it("counts a division the source served empty without calling it a failure", async () => {
    const { engine, repo } = harness([event()], [division("doubles-men")], 0);

    const r = await syncStartLists(engine, { repo, now: NOW });

    expect(r.divisionsEmpty).toBe(1);
    expect(r.failures).toEqual([]);
  });
});

describe("stopping cleanly", () => {
  it("stops at the deadline rather than overrunning", async () => {
    const { engine, repo, calls } = harness(
      [event()],
      [division("men"), division("women"), division("doubles-men")],
    );

    await syncStartLists(engine, { repo, now: NOW, deadline: Date.now() - 1 });

    expect(calls).toHaveLength(0);
  });
});
