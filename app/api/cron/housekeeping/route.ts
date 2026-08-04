import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireOldLeads } from "@/lib/leads/store";
import { expireOldInvites } from "@/lib/onboarding/invite-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * THE SWEEP THAT MAKES THE RETENTION PROMISE TRUE.
 *
 * Leads and invites both used to live in Redis, which expires rows itself.
 * Moving them to Postgres quietly dropped that: the ninety-day line on the
 * lead page and the expiry on an invite link became statements about what
 * the code intended rather than what it did. Data-minimisation promises
 * decay exactly like this — not by being abandoned, but by the mechanism
 * that enforced them being swapped out for one that doesn't.
 *
 * WHAT IT DELETES
 *
 *   leads    — the whole record ninety days after the enquiry. It holds a
 *              name, an email, a phone number and whatever they typed about
 *              their injuries, which is special-category data. The lead page
 *              says ninety days; this is what makes that so.
 *   invites  — anything past its own expiry. Belt and braces: `loadInvite`
 *              already refuses an expired row, so an unswept one is untidy
 *              rather than dangerous.
 *
 * Nothing here touches bookings. A consultation is a business record and
 * Ben may reasonably want last year's diary.
 *
 * IDEMPOTENT AND SAFE TO RUN TWICE. It deletes by age, so a second run in
 * the same minute finds nothing left to do.
 */

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // timingSafeEqual throws on a length mismatch, which is itself a signal,
  // so the lengths are compared first.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  if (!authorised(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const [leads, invites] = await Promise.all([
    expireOldLeads(90),
    expireOldInvites(),
  ]);

  // Logged as well as returned: a cron's response is seen by nobody, and a
  // sweep that silently stopped deleting is the failure worth noticing.
  console.info(
    `[housekeeping] expired ${leads} lead(s), ${invites} invite(s)`,
  );

  return NextResponse.json({ ok: true, leads, invites });
}
