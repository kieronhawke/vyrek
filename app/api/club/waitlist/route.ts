import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";
import { looksLikePhone } from "@/lib/validation/phone";

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
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    goal?: string;
    /** Honeypot — real users never fill this. */
    company?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  // Honeypot: a bot fills the hidden field. Answer with a plain success so it
  // learns nothing, and do nothing else.
  if ((body.company ?? "").trim()) {
    return NextResponse.json({ ok: true });
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
  if (phone && !looksLikePhone(phone)) {
    return NextResponse.json(
      { ok: false, error: "That mobile number does not look right." },
      { status: 400 },
    );
  }

  // Throttle before we touch the database or send anything. The two caps
  // guard against DIFFERENT things and must be handled differently — the old
  // code lumped them together and told a rate-limited stranger they were
  // "already on the list" (false, and their signup was dropped).
  const ip = requestIp(req);
  const [byIp, byEmail] = await Promise.all([
    limiters.clubWaitlistIp.limit(`ip:${ip}`),
    limiters.clubWaitlistEmail.limit(`em:${email}`),
  ]);

  // Per-EMAIL cap: this address has joined several times recently. They ARE
  // on the list — the upsert would be a no-op — so this is genuinely "already
  // in", and we answer with success rather than an error.
  if (!byEmail.success) {
    return NextResponse.json({ ok: true, already: true });
  }

  // Per-IP cap: many sign-ups from one network. On shared mobile/office IPs
  // this can be several real people, so we never claim they're on the list
  // (they aren't saved) — we hand them a real way in instead.
  if (!byIp.success) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "We're getting a lot of sign-ups from your network right now. Email hello@suthperformance.com and Ben will add you by hand.",
      },
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
        // One segment: ASCII only (no em dash — that forces UCS-2 and 70-char
        // segments) and short enough to hold even a long first name.
        await sendSms({
          to: phone,
          body: `Hi ${firstName}, it's Ben. You're on the Suth Club waiting list - you'll be first to know when it opens. Reply here with any questions.`,
        });
      }
    } catch (e) {
      console.error("[club-waitlist] sms failed", e);
    }
  }

  // Tell the admins — a waitlist join was previously invisible except in the
  // activity feed, unlike every other lead type. Best-effort, both channels.
  try {
    const [{ adminEmails, adminMobiles }, { send }, { AdminAlertEmail }, { siteUrl }, sms] =
      await Promise.all([
        import("@/lib/admin/recipients"),
        import("@/lib/email/send"),
        import("@/lib/email/templates/admin-alert"),
        import("@/lib/site-url"),
        import("@/lib/sms/send"),
      ]);
    const who = name || email;
    const adminUrl = `${siteUrl()}/admin/waitlist`;
    const detail = `${who} joined the Suth Club waiting list.${
      goal ? ` Goal: ${goal}.` : ""
    }${phone ? ` Mobile: ${phone}.` : ""} Email: ${email}.`;
    await Promise.all([
      ...adminEmails().map((to) =>
        send({
          to,
          subject: `Club waitlist: ${who}`,
          react: AdminAlertEmail({
            eyebrow: "Suth Club waiting list",
            heading: who,
            body: detail,
            adminUrl,
            stripeUrl: null,
          }),
        }).catch((e) => console.error("[club-waitlist] admin email failed", e)),
      ),
      ...(sms.smsConfigured()
        ? adminMobiles().map((to) =>
            sms
              .sendSms({
                to,
                body: `Club waitlist: ${who}. ${email}`,
                sender: "brand",
              })
              .catch((e) => console.error("[club-waitlist] admin sms failed", e)),
          )
        : []),
    ]);
  } catch (e) {
    console.error("[club-waitlist] admin notify failed", e);
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
