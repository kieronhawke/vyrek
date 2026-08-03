/**
 * Catalog sync — the hourly heartbeat of the whole system.
 *
 * It does two jobs. It keeps the event catalogue current, and it notices when
 * an event has finalised and pulls its full results. Everything else (live,
 * backfill, reconcile) is a variation on this.
 *
 * It is also the dead-man's-switch pinger. A sync that *errors* is visible in
 * the run log; a sync that silently stops running is not, and that is the
 * failure that goes unnoticed for a fortnight. So every successful run pings an
 * external monitor, and the alert fires when the ping does not arrive
 * (brief §10).
 */

import type { EngineEvent } from "../types";
import type { SyncEngine } from "./engine";
import {
  divisionDisplayName,
  divisionKeyFor,
  normaliseEventGroup,
  sexesForPrefix,
} from "../normalise/normaliser";
import { summariseShape, type SentinelVerdict } from "../validate/sentinel";
import { pingHeartbeat } from "../ops/heartbeat";
import { recomputeDistributionsForEvent } from "./distributions";
import { enrichEventMetadata } from "./event-metadata";

export type CatalogResult = {
  seasonsScanned: string[];
  eventsUpserted: number;
  divisionsUpserted: number;
  finalisedSynced: string[];
  rowsUpserted: number;
  rowsQuarantined: number;
  shapeAlert: SentinelVerdict;
};

export async function runCatalogSync(
  engine: SyncEngine,
  opts: {
    seasonPaths?: string[];
    now?: Date;
    triggerSource?: string;
    /** Cap on events whose full results get pulled in one run. */
    maxEventsToPull?: number;
  } = {},
): Promise<CatalogResult> {
  const seasonPaths = opts.seasonPaths ?? [process.env.HYROX_CURRENT_SEASON ?? "season-9"];
  const now = opts.now ?? new Date();
  const repo = engine.repo;
  const maxEvents = opts.maxEventsToPull ?? 3;

  return engine.withRun("catalog", opts.triggerSource ?? "cron", async (runId) => {
    const result: CatalogResult = {
      seasonsScanned: [],
      eventsUpserted: 0,
      divisionsUpserted: 0,
      finalisedSynced: [],
      rowsUpserted: 0,
      rowsQuarantined: 0,
      shapeAlert: { ok: true },
    };
    const shapes: SentinelVerdict[] = [];
    const unnamed: string[] = [];

    for (const seasonPath of seasonPaths) {
      const groups = await engine.adapter.listEventGroups(seasonPath);
      result.seasonsScanned.push(seasonPath);

      for (const group of groups) {
        // An unnamed weekend cannot be turned into an event: the label is where
        // the city and year come from, and without them every unnamed weekend
        // would collapse onto the same slug.
        if (!group.label.trim()) {
          unnamed.push(group.sourceEventId);
          continue;
        }
        const normalised = normaliseEventGroup(group);
        if (!normalised) continue;

        const existing = await repo.getEventBySourceId(group.sourceEventId);
        const event = await repo.upsertEvent({
          slug: normalised.slug,
          name: `HYROX ${normalised.city} ${normalised.year}`,
          city: normalised.city,
          country: existing?.country ?? "",
          countryIso: existing?.countryIso ?? "",
          region: existing?.region ?? "",
          season: normalised.season,
          year: normalised.year,
          venue: existing?.venue ?? null,
          // Status is owned by the live poller and the reconciler, not here:
          // the catalogue must never demote a live event back to upcoming.
          status: existing?.status ?? "upcoming",
          startDatetime: existing?.startDatetime ?? null,
          endDatetime: existing?.endDatetime ?? null,
          tzOffsetMinutes: existing?.tzOffsetMinutes ?? 0,
          startDate: existing?.startDate ?? null,
          endDate: existing?.endDate ?? null,
          athleteCount: existing?.athleteCount ?? 0,
          sourceEventId: group.sourceEventId,
          sourceSeasonPath: seasonPath,
          isDemo: false,
          lastSyncedAt: now.toISOString(),
        });
        result.eventsUpserted += 1;

        for (const ref of group.divisions) {
          // The source splits sex by query filter rather than by code, so one
          // code becomes several of our divisions. Which ones depends on the
          // format: team codes can be Mixed, individual ones cannot.
          for (const sex of sexesForPrefix(ref.divisionPrefix)) {
            await repo.upsertDivision({
              eventId: event.id,
              divisionKey: divisionKeyFor(ref.divisionPrefix, sex),
              displayName: divisionDisplayName(ref.divisionPrefix, sex),
              entrantCount: 0,
              publishedEntrantCount: null,
              sourceDivisionId: `${ref.sourceDivisionId}#${sex}`,
            });
            result.divisionsUpserted += 1;
          }
        }
      }
    }

    // Dates and place, joined from HYROX's own published calendar. No network,
    // so it is cheap enough to run every time rather than as its own job — and
    // it has to happen before arming, because an event with no start instant
    // can never self-arm.
    const enriched = await enrichEventMetadata(repo);

    // Pull full results for anything that has finalised since the last run.
    const finalised = (await repo.listEvents({ status: "final" }))
      .filter((e) => needsResultPull(e))
      .slice(0, maxEvents);

    for (const event of finalised) {
      try {
        const divisions = await repo.listDivisions(event.id);
        for (const division of divisions) {
          const outcome = await engine.syncDivision({
            seasonPath: event.sourceSeasonPath ?? seasonPaths[0],
            event,
            division,
            sourceDivisionId: division.sourceDivisionId ?? division.divisionKey,
            ingestionRunId: runId,
          });
          result.rowsUpserted += outcome.inserted + outcome.updated;
          result.rowsQuarantined += outcome.quarantined;
          shapes.push(outcome.shape);
        }
        await recomputeDistributionsForEvent(repo, event.id);
        result.finalisedSynced.push(event.slug);
      } catch (error) {
        await engine.freezeOnFailure(event, error);
      }
    }

    result.shapeAlert = summariseShape(shapes);
    if (!result.shapeAlert.ok) {
      await repo.raiseAlert({
        kind: "parser_shape",
        severity: "critical",
        message: result.shapeAlert.message,
        detail: result.shapeAlert.detail,
        sourceEventId: null,
        acknowledgedAt: null,
      });
    }

    if (unnamed.length > 0) {
      await repo.raiseAlert({
        kind: "parser_shape",
        severity: "warning",
        message:
          `${unnamed.length} race weekend(s) could not be attributed to a name, so no event ` +
          `was created for them. The weekend selector narrowing may have changed.`,
        detail: { weekendIds: unnamed.slice(0, 20) },
        sourceEventId: null,
        acknowledgedAt: null,
      });
    }

    // Only a *successful* run pings. A failed run must leave the monitor
    // silent, or the dead-man's switch is decorative.
    await pingHeartbeat("catalog");

    return {
      ...result,
      eventsTouched: result.eventsUpserted,
      rowsUpserted: result.rowsUpserted,
      rowsQuarantined: result.rowsQuarantined,
      detail: {
        seasonsScanned: result.seasonsScanned,
        finalisedSynced: result.finalisedSynced,
        datesEnriched: enriched.enriched.length,
        datesUnmatched: enriched.unmatched.length,
        unnamedWeekends: unnamed.length,
      },
    } as CatalogResult & Record<string, unknown>;
  });
}

/** Never synced, or last synced before the event had finished. */
function needsResultPull(event: EngineEvent): boolean {
  if (!event.lastSyncedAt) return true;
  if (!event.endDatetime) return false;
  return new Date(event.lastSyncedAt).getTime() < new Date(event.endDatetime).getTime();
}
