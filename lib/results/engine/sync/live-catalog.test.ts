/**
 * LIVE CATALOGUE — really contacts results.hyrox.com.
 * Skipped unless HYROX_LIVE_SMOKE=1.
 *
 * Proves the piece that live arming depends on: that a real season index
 * becomes real events, with real dates, resolved to real UTC instants.
 * `maxEventsToPull: 0` keeps it to a single request.
 */

import { describe, expect, it } from "vitest";
import { MemoryResultsRepository } from "../memory-repo";
import { SyncEngine } from "./engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { runCatalogSync } from "./catalog";
import { shouldArmLive } from "./live";
import { localStartLabel } from "./live";

const suite = process.env.HYROX_LIVE_SMOKE === "1" ? describe : describe.skip;

suite("live catalogue", () => {
  it("turns the real season index into dated, armable events", async () => {
    const repo = new MemoryResultsRepository();
    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        // N+1 requests: one for the weekend names, one POST per weekend.
        budget: new OutboundBudget({ maxRequests: 60, windowMs: 60_000 }),
        maxAttempts: 2,
      }),
    );
    const engine = new SyncEngine({ repo, adapter: chain });

    const result = await runCatalogSync(engine, {
      seasonPaths: ["season-9"],
      maxEventsToPull: 0,
      triggerSource: "smoke",
    });

    const events = await repo.listEvents();
    const dated = events.filter((e) => e.startDatetime);

    console.log(
      `[live] ${result.eventsUpserted} events, ${result.divisionsUpserted} divisions, ` +
        `${dated.length} dated from the HYROX calendar, ${chain.requestCount()} request(s)`,
    );

    // 22 source weekend ids resolve to ~7 named race weekends, because one
    // weekend carries a source id per race day. Fewer events than ids is the
    // correct outcome, not a collapse — the collapse looked like ONE event.
    expect(events.length).toBeGreaterThan(3);
    expect(dated.length).toBeGreaterThan(0);

    // The bug that made this test necessary: 22 weekends collapsing onto one
    // slug. Distinct weekends must stay distinct cities.
    const cities = new Set(events.map((e) => e.city));
    expect(cities.size).toBeGreaterThan(5);
    console.log(`[live] distinct cities: ${[...cities].slice(0, 12).join(", ")}`);

    for (const e of dated.slice(0, 5)) {
      console.log(
        `[live]   ${e.slug.padEnd(28)} ${e.startDate} · ${localStartLabel(e)} local · ` +
          `${e.region || "—"} · offset ${e.tzOffsetMinutes}m`,
      );
      // A dated event must arm at its own start instant. This is the property
      // the whole timezone layer exists for.
      expect(shouldArmLive(e, new Date(e.startDatetime as string))).toBe(true);
      // And must not arm a fortnight earlier.
      const fortnightBefore = new Date(new Date(e.startDatetime as string).getTime() - 14 * 86_400_000);
      expect(shouldArmLive(e, fortnightBefore)).toBe(false);
    }
  }, 120_000);
});
