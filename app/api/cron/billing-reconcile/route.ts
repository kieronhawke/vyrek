import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reconcileBilling } from "@/lib/billing/reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Reconciling a whole account's subscriptions + invoices can take a while.
export const maxDuration = 300;

/**
 * DAILY STRIPE ↔ DATABASE RECONCILIATION.
 *
 * Stripe retries a failing webhook for ~3 days and then gives up. Without a
 * backstop, a permanently-failed event leaves the subscriptions mirror and the
 * partner ledger silently out of step with Stripe. This re-derives both from
 * Stripe once a day. It is idempotent (status mirroring is a set-if-changed;
 * commission crediting is keyed on invoice id), so running it twice is safe and
 * a no-op when nothing has drifted.
 *
 * Auth is the shared CRON_SECRET, fail-closed like the other crons.
 */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
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

  try {
    const result = await reconcileBilling();
    if (result.errors > 0) {
      void import("@/lib/observability").then(({ reportError }) =>
        reportError(new Error(`billing reconcile had ${result.errors} errors`), {
          where: "cron/billing-reconcile",
          ...result,
        }),
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    void import("@/lib/observability").then(({ reportError }) =>
      reportError(e, { where: "cron/billing-reconcile" }),
    );
    return NextResponse.json(
      { ok: false, error: "reconcile failed" },
      { status: 500 },
    );
  }
}
