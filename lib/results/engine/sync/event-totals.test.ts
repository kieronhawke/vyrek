/**
 * The event's headline number.
 *
 * This was zero on all 223 events while 491,030 results sat behind them. The
 * catalogue writes `athleteCount: 0` because it runs before any results exist,
 * and nothing revised it afterwards — so the tiles, the city pages, the FAQ,
 * the race reports and the `SportsEvent` markup all advertised empty races.
 */

import { describe, expect, it } from "vitest";
import { makeHarness } from "../testing";
import { backfillEventTotals, eventAthleteTotal } from "./event-totals";

describe("rolling divisions up to their event", () => {
  it("sums the stored entrant counts", async () => {
    const h = await makeHarness({ event: { athleteCount: 0 } });
    await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men", displayName: "Open Men",
      entrantCount: 649, publishedEntrantCount: 649, sourceDivisionId: "H_X#men",
    });
    await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-women", displayName: "Open Women",
      entrantCount: 281, publishedEntrantCount: 281, sourceDivisionId: "H_X#women",
    });

    expect(await eventAthleteTotal(h.repo, h.event.id)).toBe(930);
  });

  it("repairs an event whose count was never written", async () => {
    const h = await makeHarness({ event: { athleteCount: 0 } });
    await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men", displayName: "Open Men",
      entrantCount: 100, publishedEntrantCount: 100, sourceDivisionId: "H_X#men",
    });

    const out = await backfillEventTotals(h.repo);
    expect(out.updated).toContain(h.event.slug);
    expect((await h.repo.getEventBySlug(h.event.slug))?.athleteCount).toBe(100);
  });

  it("is idempotent — a second pass changes nothing", async () => {
    // ⚠️ Derived, not incremented. A counter that adds on each sync drifts the
    // moment a sync runs twice, and every sync here is designed to be re-run.
    const h = await makeHarness({ event: { athleteCount: 0 } });
    await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men", displayName: "Open Men",
      entrantCount: 42, publishedEntrantCount: 42, sourceDivisionId: "H_X#men",
    });

    await backfillEventTotals(h.repo);
    const second = await backfillEventTotals(h.repo);
    expect(second.updated).toEqual([]);
    expect((await h.repo.getEventBySlug(h.event.slug))?.athleteCount).toBe(42);
  });

  it("leaves an event with no divisions at zero rather than failing", async () => {
    const h = await makeHarness({ event: { athleteCount: 0 } });
    expect(await eventAthleteTotal(h.repo, h.event.id)).toBe(0);
    expect((await backfillEventTotals(h.repo)).updated).toEqual([]);
  });

  it("follows the divisions down as well as up", async () => {
    // A division re-synced against a smaller field must not leave the event
    // claiming the larger one.
    const h = await makeHarness({ event: { athleteCount: 500 } });
    await h.repo.upsertDivision({
      eventId: h.event.id, divisionKey: "open-men", displayName: "Open Men",
      entrantCount: 120, publishedEntrantCount: 120, sourceDivisionId: "H_X#men",
    });

    await backfillEventTotals(h.repo);
    expect((await h.repo.getEventBySlug(h.event.slug))?.athleteCount).toBe(120);
  });
});
