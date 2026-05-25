import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/admin/events";

/**
 * Cancellation feedback capture.
 *
 * Stripe redirects to /plan?cancelled=true; the inline prompt POSTs the
 * user's reason here. We:
 *  - validate + trim
 *  - write to admin_events as `subscription.cancelled` with metadata
 *    (the event log table doesn't have a dedicated cancellation_reasons
 *    table; admin can query the metadata column directly)
 *  - return 200 even on internal failure so the client never blocks
 */

const ALLOWED_REASONS = new Set([
  "Want to think it over",
  "Pricing concern",
  "Worried about commitment",
  "Comparing alternatives",
  "Trial too short",
  "Other",
]);

export async function POST(req: Request) {
  // Rate limit so this can't be hammered to fill admin_events. 20/h/IP.
  const ip = requestIp(req);
  const r = await limiters.feedback.limit(ip);
  if (!r.success) {
    // Return 200 — feedback drops are non-fatal; the client must not error.
    return NextResponse.json({ ok: true, rateLimited: true });
  }

  let body: { reason?: string | null; note?: string | null; page?: string };
  try {
    body = (await req.json()) as {
      reason?: string | null;
      note?: string | null;
      page?: string;
    };
  } catch {
    return NextResponse.json({ ok: true });
  }

  const reason =
    typeof body.reason === "string" && ALLOWED_REASONS.has(body.reason)
      ? body.reason
      : null;
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 280) : null;
  // Cap `page` length and type so a 1 MB string can't be smuggled into
  // admin_events.metadata. Security audit H-9.
  const page =
    typeof body.page === "string" ? body.page.slice(0, 256) : null;

  if (!reason && !note) {
    return NextResponse.json({ ok: true });
  }

  // Pull the customer email out of the Supabase session if there is one,
  // so the admin event ties to the right person where possible. We do
  // NOT require auth here — the response is intentionally lossy if the
  // user is unauthenticated, because the feedback is still useful in
  // aggregate.
  let customerId: string | null = null;
  try {
    const sb = supabaseAdmin();
    // No session lookup possible from the admin client; instead the
    // client-side caller could include an email in body but we
    // intentionally omit that to keep this endpoint anonymous and avoid
    // building a feedback-vs-PII linkage.
    void sb;
  } catch {
    /* fine */
  }

  await logEvent({
    actor: "client",
    action: "subscription.cancelled",
    targetKind: customerId ? "customer" : undefined,
    targetId: customerId ?? undefined,
    metadata: {
      source: "stripe-checkout-return",
      reason,
      note,
      page,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
