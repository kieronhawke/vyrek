import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Joining the Suth Club waiting list.
 *
 * One insert, then two confirmations: an email they can reply to and a
 * text if they gave a mobile. The insert is the only thing allowed to
 * fail the request — a comms hiccup must not tell somebody they are not
 * on a list they are on.
 */

export async function POST(req: Request) {
  let body: { name?: string; email?: string; phone?: string; goal?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  // Strip angle brackets so no markup is ever stored or echoed into the
  // confirmation email. React escapes on render anyway; this keeps the
  // stored record clean too.
  const name = (body.name ?? "").replace(/[<>]/g, "").trim().slice(0, 120);
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
  const phone = (body.phone ?? "").trim().slice(0, 30);
  const goal = (body.goal ?? "").trim().slice(0, 1000);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That email address does not look right." },
      { status: 400 },
    );
  }

  // Throttle before we touch the database or send anything. Per-IP stops a
  // flood; per-email stops someone signing a victim up to be emailed and
  // texted repeatedly from our domain.
  const ip = requestIp(req);
  const [byIp, byEmail] = await Promise.all([
    limiters.clubWaitlistIp.limit(`ip:${ip}`),
    limiters.clubWaitlistEmail.limit(`em:${email}`),
  ]);
  if (!byIp.success || !byEmail.success) {
    return NextResponse.json(
      { ok: false, error: "You're already on the list. We'll be in touch." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  try {
    const sb = supabaseAdmin();
    // Upsert on email: joining twice updates the details rather than
    // erroring at the one person keen enough to come back.
    const { error } = await sb
      .from("waitlist")
      .upsert(
        { email, name: name || null, phone: phone || null, goal: goal || null, source: "club" },
        { onConflict: "email" },
      );
    if (error) {
      console.error("[club-waitlist] insert failed", error.message);
      return NextResponse.json(
        { ok: false, error: "Couldn't save that just now. Try again in a moment." },
        { status: 500 },
      );
    }
  } catch (e) {
    console.error("[club-waitlist] insert threw", e);
    return NextResponse.json(
      { ok: false, error: "Couldn't save that just now. Try again in a moment." },
      { status: 500 },
    );
  }

  const firstName = name.split(/\s+/)[0] || "there";

  // Confirmations, best-effort from here on.
  try {
    const { send } = await import("@/lib/email/send");
    const { ClubWaitlistEmail } = await import("@/lib/email/templates/club-waitlist");
    await send({
      to: email,
      subject: "You're on the Suth Club waiting list",
      react: ClubWaitlistEmail({ firstName, goal: goal || null }),
      replyTo: process.env.BEN_EMAIL ?? "ben@suthperformance.com",
    });
  } catch (e) {
    console.error("[club-waitlist] email failed", e);
  }

  if (phone) {
    try {
      const { sendSms, smsConfigured } = await import("@/lib/sms/send");
      if (smsConfigured()) {
        await sendSms({
          to: phone,
          body: `Hi ${firstName}, it's Ben at Suth Performance. You're on the Suth Club waiting list - you'll be first to know when it opens. Reply here if you have any questions.`,
        });
      }
    } catch (e) {
      console.error("[club-waitlist] sms failed", e);
    }
  }

  try {
    const { logEvent } = await import("@/lib/admin/events");
    await logEvent({
      actor: "website",
      action: "customer.signed_up",
      targetKind: "customer",
      metadata: { event: "club_waitlist_joined", email, goal: goal || null },
    });
  } catch {
    /* The join still counts. */
  }

  return NextResponse.json({ ok: true });
}
