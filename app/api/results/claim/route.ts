/**
 * Claim your profile — the authorised route for a person to control their own
 * athlete page, attached to an already-ingested record (engine brief §2).
 *
 * Like erasure, this records intent rather than granting control immediately:
 * claiming an athlete page means gaining the ability to edit what the public
 * sees about a named person, so it needs verification first. What it does do is
 * attach the claim to the *existing ingested athlete id*, so the profile,
 * history and URL survive the claim instead of forking a second page.
 */

import { NextResponse } from "next/server";
import { getResultsRepository } from "@/lib/results/engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { athleteSlug?: string; email?: string; userId?: string }
    | null;

  if (!body?.athleteSlug || !body.email) {
    return NextResponse.json({ error: "athleteSlug and email are required" }, { status: 400 });
  }

  const repo = getResultsRepository();
  const athlete = await repo.getAthleteBySlug(body.athleteSlug);
  if (!athlete) return NextResponse.json({ ok: true, status: "received" });

  await repo.raiseAlert({
    kind: "identity_review",
    severity: "info",
    message: `Profile claim for ${athlete.slug} (${athlete.name}). Verify before granting.`,
    detail: {
      athleteId: athlete.id,
      athleteSlug: athlete.slug,
      contactEmail: body.email,
      proposedUserId: body.userId ?? null,
      action:
        "Verify the claimant owns this race history, then attach the user id with claimAthlete().",
    },
    sourceEventId: null,
    acknowledgedAt: null,
  });

  return NextResponse.json({ ok: true, status: "received", athleteId: athlete.id });
}
