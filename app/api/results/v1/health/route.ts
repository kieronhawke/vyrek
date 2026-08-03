/**
 * Public health of the results API.
 *
 * One request that answers "is this thing working, and if not, which part is
 * broken" — for the operator console, for an uptime monitor, and for us when
 * something looks wrong at three in the morning.
 *
 * Always returns 200 with a body. A health endpoint that 500s when the thing it
 * reports on is unhealthy tells you less than one that answers the question.
 */

import { NextResponse } from "next/server";
import {
  getResultsRepository,
  hasSupabaseConfig,
  ingestionStatus,
  resultsProjectRef,
  servingDegradation,
} from "@/lib/results/engine";
import { ATTRIBUTION, describeError } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const ingestion = ingestionStatus();

  let store: { reachable: boolean; events: number | null; error: string | null } = {
    reachable: false,
    events: null,
    error: null,
  };

  try {
    const events = await getResultsRepository().listEvents();
    store = { reachable: true, events: events.length, error: null };
  } catch (error) {
    store = {
      reachable: false,
      events: null,
      error: describeError(error),
    };
  }

  return NextResponse.json(
    {
      status: store.reachable ? "ok" : "degraded",
      dataMode: process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo",
      store: {
        kind: hasSupabaseConfig() ? "supabase" : "memory",
        project: resultsProjectRef(),
        ...store,
      },
      ingestion,
      // Which tier the serving layer is currently answering from, and why.
      serving: servingDegradation(),
      attribution: ATTRIBUTION,
      checkedInMs: Date.now() - started,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
