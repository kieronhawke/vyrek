/**
 * Operator controls for the results engine.
 *
 * Every action here can move data or reach the source, so every one is behind
 * the admin session — `assertOperator()` throws before any branch runs. The
 * confirm step lives in the UI; the auth check lives here, because a UI
 * confirmation is not a security control (brief §13).
 */

import { NextResponse } from "next/server";
import { assertOperator } from "@/lib/results/engine/ops/auth";
import { getResultsRepository, getSyncEngine } from "@/lib/results/engine";
import {
  IntervalBelowFloorError,
  assertLiveInterval,
  runLiveTick,
} from "@/lib/results/engine/sync/live";
import { runCatalogSync } from "@/lib/results/engine/sync/catalog";
import { runBackfill } from "@/lib/results/engine/sync/backfill";
import { runReconcile } from "@/lib/results/engine/sync/reconcile";

export const runtime = "nodejs";
export const maxDuration = 300;

type Action =
  | { action: "force-sync"; eventSlug: string }
  | { action: "arm-live"; eventSlug: string }
  | { action: "disarm-live"; eventSlug: string }
  | { action: "set-interval"; seconds: number }
  | { action: "reprocess-quarantine"; id: string }
  | { action: "acknowledge-alert"; id: string }
  | { action: "anonymise-athlete"; athleteSlug: string }
  | { action: "run-job"; mode: "catalog" | "live" | "backfill" | "reconcile" };

export async function POST(request: Request) {
  try {
    await assertOperator();
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await request.json()) as Action;
  const repo = getResultsRepository();

  try {
    switch (body.action) {
      case "set-interval": {
        // Floored server-side. The console's slider stops at 15 seconds too,
        // but that is a courtesy — this is the control.
        const seconds = assertLiveInterval(Number(body.seconds));
        await repo.setSetting("live_interval_seconds", seconds, "operator");
        return NextResponse.json({ ok: true, liveIntervalSeconds: seconds });
      }

      case "arm-live":
      case "disarm-live": {
        const event = await repo.getEventBySlug(body.eventSlug);
        if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 404 });
        const sourceEventId = event.sourceEventId ?? event.slug;
        const state = await repo.getSyncState(sourceEventId);
        const arming = body.action === "arm-live";

        await repo.upsertSyncState({
          sourceEventId,
          eventId: event.id,
          lastSeenHash: state?.lastSeenHash ?? null,
          lastPolledAt: state?.lastPolledAt ?? null,
          lastSuccessAt: state?.lastSuccessAt ?? null,
          isLive: arming,
          liveArmedAt: arming ? new Date().toISOString() : (state?.liveArmedAt ?? null),
          liveIntervalSeconds: state?.liveIntervalSeconds ?? 20,
          consecutiveFailures: 0,
          updatesPaused: false,
          reconcileUntil: state?.reconcileUntil ?? null,
          reconcileAttempts: state?.reconcileAttempts ?? 0,
        });
        await repo.setEventStatus(event.id, arming ? "live" : "final");
        return NextResponse.json({ ok: true, isLive: arming });
      }

      case "force-sync": {
        const event = await repo.getEventBySlug(body.eventSlug);
        if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 404 });
        const engine = getSyncEngine();
        const divisions = await repo.listDivisions(event.id);
        let rows = 0;
        for (const division of divisions) {
          // force: past the content hash, because the operator is asking for a
          // refetch precisely when they suspect the hash is lying.
          const outcome = await engine.syncDivision({
            seasonPath: event.sourceSeasonPath ?? "season-9",
            event,
            division,
            sourceDivisionId: division.sourceDivisionId ?? division.divisionKey,
            force: true,
          });
          rows += outcome.inserted + outcome.updated;
        }
        return NextResponse.json({ ok: true, rowsUpserted: rows });
      }

      case "reprocess-quarantine": {
        await repo.markQuarantineReprocessed(body.id);
        return NextResponse.json({ ok: true });
      }

      case "acknowledge-alert": {
        await repo.acknowledgeAlert(body.id);
        return NextResponse.json({ ok: true });
      }

      case "anonymise-athlete": {
        // The erasure action, run by an operator after verifying the requester.
        // Anonymises rather than deletes: the result rows stay so ranks and
        // distributions remain correct, but nothing identifying survives and
        // the profile 404s.
        const athlete = await repo.getAthleteBySlug(body.athleteSlug);
        if (!athlete) return NextResponse.json({ error: "Unknown athlete" }, { status: 404 });
        await repo.anonymiseAthlete(athlete.id);
        return NextResponse.json({ ok: true, anonymised: athlete.id });
      }

      case "run-job": {
        const engine = getSyncEngine();
        const trigger = "operator";
        const result =
          body.mode === "catalog"
            ? await runCatalogSync(engine, { triggerSource: trigger })
            : body.mode === "live"
              ? await runLiveTick(engine, { triggerSource: trigger })
              : body.mode === "backfill"
                ? await runBackfill(engine, { triggerSource: trigger })
                : await runReconcile(engine, { triggerSource: trigger });
        return NextResponse.json({ ok: true, result });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof IntervalBelowFloorError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
