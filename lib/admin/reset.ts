"use server";

import { assertAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/admin/events";

/**
 * RESET ALL TEST DATA — a fresh slate for testing.
 *
 * Pre-launch, everything in here is test data pointed at Kieron's own
 * inbox. This wipes the customer-facing and stats tables so every admin
 * surface and every number goes back to zero, and (best effort) deletes
 * the Stripe sandbox customers so the payments page empties too.
 *
 * KEPT ON PURPOSE: blog_posts (real content) and booking_availability
 * (Ben's diary hours). Only people/leads/plans/stats are cleared.
 *
 * Admin-gated. It runs with the service-role key, so the assertAdmin gate
 * is the whole of its security — do not expose it unauthenticated.
 */

// Deleted parent-last so foreign keys never block a child. supabase-js
// requires a filter on delete, so each row is matched by a timestamp column
// it always has (most are created_at; two tables differ, noted below).
const TABLES_CHILD_FIRST: Array<{ table: string; ts: string }> = [
  { table: "client_messages", ts: "created_at" },
  { table: "training_plans", ts: "created_at" },
  { table: "subscriptions", ts: "created_at" },
  { table: "quiz_responses", ts: "created_at" },
  { table: "abandoned_plans", ts: "created_at" },
  { table: "consultation_bookings", ts: "created_at" },
  { table: "consultation_leads", ts: "created_at" },
  { table: "onboarding_invites", ts: "created_at" },
  { table: "waitlist", ts: "created_at" },
  { table: "live_sessions", ts: "started_at" },
  { table: "admin_events", ts: "created_at" },
  { table: "stripe_events", ts: "received_at" },
  { table: "customers", ts: "created_at" },
];

export type ResetResult = {
  ok: boolean;
  cleared: Record<string, number | "error">;
  stripeCustomersDeleted: number;
  error?: string;
};

export async function resetTestData(): Promise<ResetResult> {
  const { user } = await assertAdmin();
  const sb = supabaseAdmin();
  const cleared: Record<string, number | "error"> = {};

  for (const { table, ts } of TABLES_CHILD_FIRST) {
    try {
      const { data, error } = await sb
        .from(table)
        .delete()
        .gte(ts, "2000-01-01")
        // Select the timestamp column (not "id" — stripe_events keys on
        // event_id) just to get a row count back from the delete.
        .select(ts);
      cleared[table] = error ? "error" : (data?.length ?? 0);
    } catch {
      cleared[table] = "error";
    }
  }

  // Stripe sandbox: delete every customer (cancels their subscriptions and
  // takes them off the payments page). Best effort — a Stripe hiccup must
  // not fail the DB wipe that already happened.
  let stripeCustomersDeleted = 0;
  try {
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    // Paginate through all customers.
    let startingAfter: string | undefined;
    for (let page = 0; page < 20; page++) {
      const list = await s.customers.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const c of list.data) {
        try {
          await s.customers.del(c.id);
          stripeCustomersDeleted++;
        } catch {
          /* one stubborn customer shouldn't stop the rest */
        }
      }
      if (!list.has_more) break;
      startingAfter = list.data[list.data.length - 1]?.id;
    }
  } catch (e) {
    console.error("[reset] stripe cleanup failed", e);
  }

  await logEvent({
    actor: user.email ?? "admin",
    action: "customer.signed_up",
    targetKind: "customer",
    metadata: { event: "test_data_reset", cleared, stripeCustomersDeleted },
  }).catch(() => {});

  return { ok: true, cleared, stripeCustomersDeleted };
}
