/**
 * Worker trigger. Cron-secret protected: an open sync endpoint is a way for a
 * stranger to make us hammer the source from our own IP.
 *
 * Each run is independent, so a crashed run never stops the next one — the next
 * tick just resumes (brief §11).
 */
import { NextResponse } from "next/server";
import { assertCron, UnauthorisedError } from "@/lib/results/engine/ops/auth";
import { getSyncEngine, ingestionStatus } from "@/lib/results/engine";

export const runtime = "nodejs";
export const maxDuration = 300;

import { runReconcile } from "@/lib/results/engine/sync/reconcile";

export async function GET(request: Request) {
  try {
    const blocked = guard(request);
    if (blocked) return blocked;
    const result = await runReconcile(getSyncEngine(), { triggerSource: "cron" });
    return NextResponse.json(result);
  } catch (error) {
    return failed(error);
  }
}

function guard(request: Request) {
  assertCron(request);
  const status = ingestionStatus();
  if (!status.canIngest) {
    // Not an error: a stated, deliberate refusal. The console shows this
    // verbatim so "nothing is syncing" never reads as a mystery.
    return NextResponse.json({ skipped: true, reason: status.reason }, { status: 200 });
  }
  return null;
}

function failed(error: unknown) {
  if (error instanceof UnauthorisedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status: 500 },
  );
}

