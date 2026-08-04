/**
 * OPERATOR TOOL — remove rows stored in a division they do not belong to.
 * Skipped unless `HYROX_REPAIR=1`. Report-only until `HYROX_REPAIR_APPLY=1`.
 *
 *   HYROX_REPAIR=1 HYROX_SOURCE_ACCESS=authorised npx vitest run repair-contamination
 *   HYROX_REPAIR=1 HYROX_REPAIR_APPLY=1 HYROX_SOURCE_ACCESS=authorised npx vitest run repair-contamination
 *
 * The unfiltered fallback adapter sent no `search[sex]`, so it returned a whole
 * event and those rows were stored under whichever division had been asked for
 * — Barcelona 2023's women's board ranked Lee Tuck first. The adapter no longer
 * permits it, but the rows it already wrote stay: every upsert is keyed on
 * `source_result_id`, so a correct re-pull adds the right rows *beside* the
 * wrong ones instead of replacing them.
 *
 * ⚠️ Deleting is the only irreversible thing this engine does, and the first
 * version of this tool had the criterion wrong. It removed every stored row the
 * source did not return on that fetch — which is also exactly what a short or
 * partial fetch looks like. On the dry run it offered to delete 194 of Mumbai's
 * 244 doubles women because the board happened to return 50 that minute. That
 * is not a repair, it is data loss with a progress bar.
 *
 * So a row is removed only when **both** are true:
 *
 *   1. its athlete appears in both the men's and the women's board of that
 *      event — impossible, and the actual fingerprint of the bug; and
 *   2. the source does not return it for this division, on a fetch that
 *      succeeded and returned something.
 *
 * Condition 1 is what bounds the damage. A short fetch can now only fail to
 * remove rows that should have gone — it can never remove rows that should have
 * stayed. Everything else in the division is left alone.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { resultsSupabase, hasResultsSupabaseConfig } from "../supabase-client";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";

const enabled = process.env.HYROX_REPAIR === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;
const APPLY = process.env.HYROX_REPAIR_APPLY === "1";
const MINUTES = Number(process.env.HYROX_REPAIR_MINUTES ?? 180);

suite("contamination repair", () => {
  it("removes rows that belong to another division", async () => {
    const repo = new SupabaseResultsRepository();
    const db = resultsSupabase();
    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        budget: new OutboundBudget({ maxRequests: 45, windowMs: 60_000 }),
        maxAttempts: 3,
      }),
    );
    const deadline = Date.now() + MINUTES * 60_000;

    // Detection in one call. Doing it a division at a time through the API ran
    // for 55 minutes without finishing; the function answers in about ten
    // seconds, because grouping is the database's job. See migration 0105.
    //
    // ⚠️ It returns a single JSONB row rather than a set. A set-returning
    // function is still subject to PostgREST's 1,000-row cap, silently — the
    // first run of this reported 1,000 contaminated pairs when there were
    // 6,387, and would have repaired a sixth of the damage while claiming to be
    // finished.
    const { data, error } = await db.rpc("results_contaminated_athletes");
    if (error) throw new Error(`detection failed: ${error.message}`);
    const pairs = (data ?? []) as [string, string][];

    const suspectByEvent = new Map<string, Set<string>>();
    for (const [eventId, athleteId] of pairs) {
      const set = suspectByEvent.get(eventId) ?? new Set<string>();
      set.add(athleteId);
      suspectByEvent.set(eventId, set);
    }
    console.log(
      `[repair] ${pairs.length} contaminated athlete-event pairs across ` +
        `${suspectByEvent.size} events · ${APPLY ? "APPLY" : "report only"}`,
    );

    const [events, divisions] = await Promise.all([repo.listEvents(), repo.listAllDivisions()]);
    const eventById = new Map(events.map((e) => [e.id, e]));
    const divisionsByEvent = new Map<string, typeof divisions>();
    for (const d of divisions) {
      divisionsByEvent.set(d.eventId, [...(divisionsByEvent.get(d.eventId) ?? []), d]);
    }

    let removed = 0;
    let touched = 0;
    let skipped = 0;

    for (const [eventId, suspects] of suspectByEvent) {
      if (Date.now() > deadline) {
        console.log("[repair] out of time");
        break;
      }
      const event = eventById.get(eventId);
      if (!event) continue;
      const seasonPath =
        event.sourceSeasonPath ?? `season-${/s(\d+)/.exec(event.season)?.[1] ?? "9"}`;

      for (const division of divisionsByEvent.get(eventId) ?? []) {
        if (!division.sourceDivisionId) continue;
        if (division.divisionKey.includes("mixed")) continue;

        const stored = await repo.listResultsForDivision(division.id);
        // Only rows whose athlete is provably in both boards are candidates.
        const candidates = stored.filter((r) => suspects.has(r.athleteId));
        if (candidates.length === 0) continue;

        let live: Set<string>;
        try {
          const page = await chain.fetchDivision(seasonPath, division.sourceDivisionId);
          live = new Set(page.rows.map((r) => r.sourceResultId));
        } catch (err) {
          console.log(
            `[repair] SKIP ${event.slug}/${division.divisionKey}: fetch failed — ` +
              `${(err as Error).message.slice(0, 60)}`,
          );
          skipped += 1;
          continue;
        }

        // A fetch that returned nothing tells us nothing.
        if (live.size === 0) {
          console.log(
            `[repair] SKIP ${event.slug}/${division.divisionKey}: source returned no rows`,
          );
          skipped += 1;
          continue;
        }

        const stale = candidates.filter((r) => !live.has(r.sourceResultId));
        if (stale.length === 0) continue;

        console.log(
          `[repair] ${APPLY ? "REMOVE" : "would remove"} ${event.slug}/${division.divisionKey}: ` +
            `${stale.length} of ${stored.length} stored ` +
            `(${candidates.length} suspect, source returns ${live.size})`,
        );

        if (APPLY) {
          for (let i = 0; i < stale.length; i += 100) {
            const ids = stale.slice(i, i + 100).map((r) => r.id);
            const { error: delError } = await db.from("results_results").delete().in("id", ids);
            if (delError) throw new Error(`delete failed: ${delError.message}`);
          }
          // Re-pull, so anything genuinely missing is fetched back.
          await repo.upsertDivision({ ...division, lastSeenHash: null });
        }
        removed += stale.length;
        touched += 1;
      }
    }

    console.log(
      `[repair] ${APPLY ? "removed" : "would remove"} ${removed} rows across ${touched} ` +
        `divisions; ${skipped} skipped; ${chain.requestCount()} requests`,
    );
    expect(removed).toBeGreaterThanOrEqual(0);
  }, MINUTES * 60_000 + 120_000);
});
