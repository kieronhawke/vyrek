/**
 * Splits backfill trigger.
 *
 * Runs often and takes a small slice each time. Splits are one request per
 * athlete, so this worker is the one most likely to eat the global budget —
 * keeping the slice small is what leaves room for live polling during a race.
 */
import { NextResponse } from "next/server";
import { assertCron, UnauthorisedError } from "@/lib/results/engine/ops/auth";
import { getSyncEngine, ingestionStatus } from "@/lib/results/engine";
import { runSplitsBackfill } from "@/lib/results/engine/sync/splits";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    assertCron(request);
    const status = ingestionStatus();
    if (!status.canIngest) {
      return NextResponse.json({ skipped: true, reason: status.reason }, { status: 200 });
    }
    const result = await runSplitsBackfill(getSyncEngine(), { triggerSource: "cron" });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorisedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
