import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { subscriptionBilling } from "@/lib/billing/subscription-info";
import { sendChangeRequest } from "@/lib/email/send";
import { adminEmails } from "@/lib/admin/recipients";
import { logEvent } from "@/lib/admin/events";
import { limiters, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "REQUEST A CHANGE" — the human path.
 *
 * The Stripe portal covers cards, plan switches and cancelling; everything
 * else — "can we drop to fortnightly while I'm injured", "can I pause over
 * Christmas" — is a conversation with Ben. This lands it in his inbox with
 * the client's plan and rate attached, and in the admin activity feed so
 * it can't be lost to an archived email.
 */

type Body = { message?: string };

export async function POST(request: Request) {
  const rl = await limiters.feedback.limit(`chg:${requestIp(request)}`);
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  // Signed-in members only — this is authenticated by the session cookie,
  // not by anything in the body.
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  // Captured now: property narrowing on user.email is dropped inside the
  // best-effort .map() callback below, so hold the string in a const.
  const memberEmail = user.email;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const message = (body.message ?? "").trim().slice(0, 2000);
  if (message.length < 5) {
    return NextResponse.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  // Attach what they're on, so Ben doesn't have to look it up to reply.
  let planName: string | null = null;
  let rate: string | null = null;
  let customerId: string | null = null;
  try {
    const admin = supabaseAdmin();
    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    customerId = customer?.id ?? null;
    if (customerId) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub?.stripe_subscription_id && sub.status !== "canceled") {
        const billing = await subscriptionBilling(sub.stripe_subscription_id);
        planName = billing?.productName ?? null;
        rate = billing?.amountPence
          ? billing.amountPence % 100 === 0
            ? `£${billing.amountPence / 100}`
            : `£${(billing.amountPence / 100).toFixed(2)}`
          : null;
      }
    }
  } catch {
    /* The request still goes through with just the email. */
  }

  // To every admin (Kieron and Ben). The first send drives the response;
  // the rest are best-effort copies.
  const [primary, ...others] = adminEmails();
  const emailResult = await sendChangeRequest({
    to: primary ?? "kieron.hawke@gmail.com",
    replyTo: memberEmail,
    email: memberEmail,
    planName,
    rate,
    message,
  });
  void Promise.all(
    others.map((to) =>
      sendChangeRequest({ to, replyTo: memberEmail, email: memberEmail, planName, rate, message }).catch(
        (e) => console.error("[request-change] admin copy failed", e),
      ),
    ),
  );

  await logEvent({
    actor: user.email,
    action: "subscription.change_requested",
    targetKind: "customer",
    targetId: customerId ?? user.id,
    metadata: { message, planName, rate, emailed: emailResult.ok },
  });

  return NextResponse.json({ ok: true });
}
