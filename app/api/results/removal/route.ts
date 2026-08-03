/**
 * Erasure requests (UK GDPR Article 17).
 *
 * Deliberately **not** an endpoint that erases. Anyone can POST a name, and
 * acting on an unverified request would let a stranger wipe someone's race
 * history — which is itself a data protection failure, just a different one.
 *
 * So this records the request and surfaces it to an operator, who verifies the
 * person and triggers the anonymisation. That path replaces identifying fields
 * with a token and keeps the row, so rankings and distributions stay correct
 * while the person leaves the record (engine brief §2).
 */

import { NextResponse } from "next/server";
import { getResultsRepository } from "@/lib/results/engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { athleteSlug?: string; email?: string; note?: string }
    | null;

  if (!body?.athleteSlug || !body.email) {
    return NextResponse.json(
      { error: "athleteSlug and email are required" },
      { status: 400 },
    );
  }

  const repo = getResultsRepository();
  const athlete = await repo.getAthleteBySlug(body.athleteSlug);
  if (!athlete) {
    // Same response either way: confirming which slugs exist would leak whose
    // profiles are in the database.
    return NextResponse.json({ ok: true, status: "received" });
  }

  await repo.raiseAlert({
    kind: "identity_review",
    severity: "info",
    message: `Erasure request for ${athlete.slug}. Verify the requester before anonymising.`,
    detail: {
      athleteId: athlete.id,
      athleteSlug: athlete.slug,
      contactEmail: body.email,
      note: body.note ?? null,
      action: "Verify identity, then run the anonymise action in the results engine console.",
    },
    sourceEventId: null,
    acknowledgedAt: null,
  });

  return NextResponse.json({ ok: true, status: "received" });
}
