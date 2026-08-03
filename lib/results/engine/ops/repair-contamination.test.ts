/**
 * OPERATOR TOOL — prune divisions filled with another division's athletes.
 * Skipped unless `HYROX_REPAIR=1`.
 *
 *   HYROX_REPAIR=1 HYROX_SOURCE_ACCESS=authorised npx vitest run repair-contamination
 *   HYROX_REPAIR=1 HYROX_REPAIR_APPLY=1 HYROX_SOURCE_ACCESS=authorised npx vitest run repair-contamination
 *
 * The unfiltered fallback adapter sent no `search[sex]`, so it returned a whole
 * event and those rows were stored under whichever division had been asked for
 * — Barcelona 2023's women's board ranked Lee Tuck first. The adapter no longer
 * permits this, but the rows it already wrote stay: every upsert is keyed on
 * `source_result_id`, so a correct re-pull adds the right rows *beside* the
 * wrong ones instead of replacing them.
 *
 * Hence a prune, and a narrow one:
 *
 *   1. Find divisions holding an athlete who also appears in the opposite-sex
 *      division of the same event. That is impossible, and it is the only
 *      reliable signal — the stored `sex` column is stamped from the division,
 *      so it agrees with the contamination rather than exposing it.
 *   2. Re-fetch each through the fixed adapter.
 *   3. Delete only the stored rows the source no longer returns.
 *
 * ⚠️ Step 3 is the dangerous one. A short or failed fetch looks exactly like
 * "these rows should go", so a failed fetch skips the division entirely and
 * nothing is deleted where the fetch would remove more than nine tenths of what
 * is held. The engine never deletes, for precisely this reason; this is the
 * hand-run exception.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { resultsSupabase } from "../supabase-client";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { hasResultsSupabaseConfig } from "../supabase-client";

const enabled = process.env.HYROX_REPAIR === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;
const APPLY = process.env.HYROX_REPAIR_APPLY === "1";
const MAX_DELETE_FRACTION = 0.9;

suite("contamination repair", () => {
  it("prunes rows the source does not return for their division", async () => {
    const repo = new SupabaseResultsRepository();
    const db = resultsSupabase();
    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        budget: new OutboundBudget({ maxRequests: 30, windowMs: 60_000 }),
        maxAttempts: 3,
      }),
    );

    /** Athlete ids in one division, one column, paged. */
    const athleteIdsForDivision = async (divisionId: string): Promise<string[]> => {
      const out: string[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db
          .from("results_results")
          .select("athlete_id")
          .eq("division_id", divisionId)
          .range(from, from + 999);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as { athlete_id: string }[];
        out.push(...rows.map((r) => r.athlete_id));
        if (rows.length < 1000) return out;
      }
    };

    const [events, divisions] = await Promise.all([repo.listEvents(), repo.listAllDivisions()]);
    const eventById = new Map(events.map((e) => [e.id, e]));

    const byEvent = new Map<string, typeof divisions>();
    for (const d of divisions) {
      if (d.divisionKey.includes("mixed")) continue;
      byEvent.set(d.eventId, [...(byEvent.get(d.eventId) ?? []), d]);
    }

    let pruned = 0;
    let touched = 0;
    let skipped = 0;

    for (const [eventId, divs] of byEvent) {
      const men = divs.filter((d) => d.divisionKey.endsWith("-men"));
      const women = divs.filter((d) => d.divisionKey.endsWith("-women"));
      if (men.length === 0 || women.length === 0) continue;

      // ⚠️ Detection reads one column, not whole rows.
      //
      // The first version called `listResultsForDivision` per division to
      // collect athlete ids — every column of 515,370 rows, `splits` included,
      // to build a set of uuids. It had not finished after ten minutes.
      const athletesIn = async (list: typeof divs) => {
        const out = new Set<string>();
        for (const d of list) {
          for (const id of await athleteIdsForDivision(d.id)) out.add(id);
        }
        return out;
      };
      const [inMen, inWomen] = await Promise.all([athletesIn(men), athletesIn(women)]);
      if (![...inMen].some((id) => inWomen.has(id))) continue;

      const event = eventById.get(eventId);
      if (!event) continue;
      const seasonPath =
        event.sourceSeasonPath ?? `season-${/s(\d+)/.exec(event.season)?.[1] ?? "9"}`;

      for (const division of [...men, ...women]) {
        if (!division.sourceDivisionId) continue;
        const stored = await repo.listResultsForDivision(division.id);
        if (stored.length === 0) continue;

        let live: Set<string>;
        try {
          const page = await chain.fetchDivision(seasonPath, division.sourceDivisionId);
          live = new Set(page.rows.map((r) => r.sourceResultId));
        } catch (error) {
          console.log(
            `[repair] SKIP ${event.slug}/${division.divisionKey}: fetch failed — ` +
              `${(error as Error).message.slice(0, 70)}`,
          );
          skipped += 1;
          continue;
        }

        const stale = stored.filter((r) => !live.has(r.sourceResultId));
        if (stale.length === 0) continue;

        const fraction = stale.length / stored.length;
        if (fraction > MAX_DELETE_FRACTION) {
          console.log(
            `[repair] SKIP ${event.slug}/${division.divisionKey}: would remove ` +
              `${stale.length}/${stored.length} — too much to be a contamination`,
          );
          skipped += 1;
          continue;
        }

        console.log(
          `[repair] ${APPLY ? "PRUNE" : "would prune"} ${event.slug}/${division.divisionKey}: ` +
            `${stale.length} of ${stored.length} stored; source returns ${live.size}`,
        );

        if (APPLY) {
          for (let i = 0; i < stale.length; i += 100) {
            const ids = stale.slice(i, i + 100).map((r) => r.id);
            const { error } = await db.from("results_results").delete().in("id", ids);
            if (error) throw new Error(`delete failed: ${error.message}`);
          }
          await repo.upsertDivision({ ...division, lastSeenHash: null });
        }
        pruned += stale.length;
        touched += 1;
      }
    }

    console.log(
      `[repair] ${APPLY ? "pruned" : "would prune"} ${pruned} rows across ${touched} divisions; ` +
        `${skipped} skipped; ${chain.requestCount()} requests`,
    );
    expect(skipped).toBeGreaterThanOrEqual(0);
  }, 3_600_000);
});
