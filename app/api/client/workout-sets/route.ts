import { NextResponse } from "next/server";

/**
 * Workout set sync — docs/build-pack/spec/11 §6, HARD-RULES §2.
 *
 * Idempotent by `client_generated_id`: the same set delivered three times
 * produces one row. spec/15 puts a unique index on that column, so the
 * database is the final arbiter rather than this handler's bookkeeping.
 *
 * Returns the ids it accepted so the device can reconcile rather than assume
 * — which is what covers a request landing while its response is lost.
 *
 * NOT YET PERSISTING. Supabase is paused, so this validates and acknowledges
 * without writing. That is safe for the device (its queue only clears on an
 * acknowledgement it can then reconcile) but it means sets are not durable
 * server-side yet. Wiring the insert is a Phase A task once the database is
 * up; the contract will not change.
 */

type IncomingSet = {
  clientGeneratedId?: string;
  workoutLogId?: string;
  exerciseId?: string;
  setNumber?: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let body: { sets?: IncomingSet[] };
  try {
    body = (await req.json()) as { sets?: IncomingSet[] };
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const sets = Array.isArray(body.sets) ? body.sets : [];
  if (sets.length === 0) {
    return NextResponse.json({ acceptedIds: [] });
  }
  // A single session should never post thousands; a cap keeps a runaway
  // client from becoming a denial of service.
  if (sets.length > 500) {
    return NextResponse.json({ error: "too-many-sets" }, { status: 413 });
  }

  const acceptedIds: string[] = [];
  const rejected: string[] = [];

  for (const s of sets) {
    if (
      typeof s.clientGeneratedId === "string" &&
      UUID_RE.test(s.clientGeneratedId) &&
      typeof s.workoutLogId === "string" &&
      typeof s.exerciseId === "string" &&
      typeof s.setNumber === "number"
    ) {
      acceptedIds.push(s.clientGeneratedId);
    } else if (typeof s.clientGeneratedId === "string") {
      rejected.push(s.clientGeneratedId);
    }
  }

  // TODO(Phase A): insert into workout_sets, on conflict (client_generated_id)
  // do nothing. The unique index in spec/15 makes that the idempotency point.

  return NextResponse.json({ acceptedIds, rejected });
}
