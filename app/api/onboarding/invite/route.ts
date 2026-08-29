import { NextResponse } from "next/server";
import {
  createInvite,
  inviteUrl,
  inviteUrlForSms,
  signingConfigured,
  validAmountPence,
  INVITE_DAYS,
  type InviteKind,
} from "@/lib/onboarding/token";
import { storeInvite } from "@/lib/onboarding/invite-store";
import { parsePrice, planByKey } from "@/lib/onboarding/model";
import {
  parseStartDate,
  startDateBlocker,
  startDateISO,
  todayDay,
} from "@/lib/onboarding/start-date";
import { sendOnboardingInvite } from "@/lib/email/send";
import { onboardingInviteSms } from "@/lib/email/templates/onboarding-invite";
import { sendSms, smsConfigured } from "@/lib/sms/send";
import { siteUrl } from "@/lib/site-url";
import { supabaseServer } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { limiters, requestIp } from "@/lib/rate-limit";

/**
 * CREATE AN INVITE AND SEND IT.
 *
 * Returns the link either way. Ben can always copy it and send it himself —
 * a delivery failure must never leave him with no way to onboard somebody,
 * which is exactly what an endpoint that only reports "sent" or "failed"
 * would do.
 *
 * EMAIL IS REAL. Resend is configured and this genuinely sends. The from
 * address is still Resend's shared sandbox sender, which only delivers to the
 * account owner's own address until a domain is verified — so the response
 * says which sender was used and the admin surfaces it. Reporting "sent" for
 * a message that will never arrive is worse than reporting nothing.
 *
 * SMS IS ALSO REAL NOW. It goes through the "Suth Performance" Messaging
 * Service. The text is still returned either way, so a delivery failure never
 * leaves Ben without a way to reach somebody.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  kind?: "full" | "payment";
  plan?: string;
  /**
   * The monthly rate Ben agreed with this client, in pence. Existing
   * clients are on different grandfathered rates; this is how each one's
   * link charges THEIR price. Carried on the signed invite, so the client
   * cannot edit it.
   */
  amountPence?: number;
  /** "beginner" keeps racing language out of their onboarding. */
  rail?: string;
  /** When the invite came from an enquiry row, stamp it as invited. */
  leadId?: string;
  /**
   * A monthly price agreed with this person, as Ben typed it — "150", "£150".
   * Parsed here rather than on the client, because the client is not where a
   * money value gets to be decided.
   */
  agreedPrice?: string;
  /**
   * The day the first payment should be taken, as "2026-09-01".
   *
   * Omitted or today means charge at checkout. A future date defers the first
   * collection to that morning and anchors every month after it.
   */
  startDate?: string;
};

export async function POST(request: Request) {
  // Admin-only. This endpoint sends email and SMS in Suth's name; before
  // this gate, anyone on the internet could POST here and spam arbitrary
  // addresses with real invites.
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Belt and braces even for an authed admin: a runaway client-side loop
  // should not be able to burn SMS credit.
  const rl = await limiters.adminInvite.limit(`invite:${requestIp(request)}`);
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const kind = body.kind === "payment" ? "payment" : "full";

  if (!name) {
    return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
  }
  // One of the two, because an invite nobody can receive is not an invite.
  if (!email && !phone) {
    return NextResponse.json({ error: "CONTACT_REQUIRED" }, { status: 400 });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "EMAIL_INVALID" }, { status: 400 });
  }

  const plan = planByKey(body.plan);

  /*
   * THE RATE, HOWEVER BEN TYPED IT.
   *
   * Two spellings reach here because two admin surfaces grew apart: a parsed
   * `amountPence` from the older form, and `agreedPrice` as raw text ("150",
   * "£150", "1,500") from the newer one. Both land in the same field.
   *
   * Refused rather than ignored when it will not read. Silently dropping the
   * rate sends a link charging the PUBLIC price to somebody Ben told £150 on
   * the phone, and he finds out when they ring back — which is the worst
   * failure this endpoint has.
   */
  let amountPence: number | undefined;
  if (body.amountPence !== undefined && body.amountPence !== null) {
    if (!validAmountPence(body.amountPence)) {
      return NextResponse.json({ error: "AMOUNT_INVALID" }, { status: 400 });
    }
    amountPence = Number(body.amountPence);
  }
  const agreedRaw = (body.agreedPrice ?? "").trim();
  if (agreedRaw) {
    const parsed = parsePrice(agreedRaw);
    if (parsed === null) {
      return NextResponse.json({ error: "PRICE_INVALID" }, { status: 400 });
    }
    amountPence = parsed;
  }

  /*
   * WHEN THE FIRST PAYMENT COMES OUT.
   *
   * Checked HERE, while Ben is looking at the form, and not at checkout.
   * Stripe will not anchor a monthly billing cycle more than about a month
   * ahead, and the place to discover that is on his screen — not weeks later,
   * silently, on the one screen where a client is trying to hand over a card.
   */
  let startDay: number | undefined;
  const startRaw = (body.startDate ?? "").trim();
  if (startRaw) {
    const parsed = parseStartDate(startRaw);
    if (parsed === null) {
      return NextResponse.json({ error: "START_DATE_INVALID" }, { status: 400 });
    }
    const blocked = startDateBlocker(parsed);
    if (blocked) {
      return NextResponse.json(
        { error: "START_DATE_OUT_OF_RANGE", detail: blocked },
        { status: 400 },
      );
    }
    /* Today is not a deferral — it is the default. Left off the invite so an
       ordinary link stays exactly the length it was, and so checkout takes the
       "charge now" path by the absence of a date rather than by comparing one. */
    if (parsed > todayDay()) startDay = parsed;
  }

  /*
   * Short link first, signed token as the fallback.
   *
   * The signed token carries the whole invite in the URL and comes out at 225
   * characters. That wraps four times in a text message, looks like phishing,
   * and costs Ben extra SMS segments on every invite he sends. Storing the
   * payload and sending a ten-character id instead gives a 44-character link.
   *
   * When there is nowhere to store it — no store configured, or unreachable —
   * the token is still a working invite, and a long link beats no link. The
   * response says which form was used so the admin can report it rather than
   * quietly shipping the long one for ever.
   */
  // Only "beginner" is meaningful; anything else is the default athlete
  // route and is left off so the link stays as short as it was.
  const rail = body.rail === "beginner" ? ("beginner" as const) : undefined;
  const fields = {
    name,
    email,
    phone,
    kind: kind as InviteKind,
    /* ⚠️ NO PLAN IS FORCED ONTO AN AGREED RATE.
       This used to read `plan: amountPence ? (plan?.key ?? "coaching-121") : …`
       so that a bespoke rate "had a plan to describe what it buys". What it
       actually bought was a client being shown the words "1:1 Coaching" and
       that package's five feature bullets under a number Ben had agreed for
       something else entirely — and the same package name on their Stripe
       receipt for ever after. An agreed rate describes itself. */
    plan: amountPence ? undefined : plan?.key,
    ...(amountPence ? { amountPence } : {}),
    ...(startDay ? { startDay } : {}),
    ...(rail ? { rail } : {}),
  };
  const stored = await storeInvite({
    ...fields,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + INVITE_DAYS * 86400,
  });

  const short = stored.ok && stored.durable;
  // One value feeds both URL builders: the short id when we have somewhere to
  // store it, otherwise the signed token.
  const key = short && stored.ok ? stored.id : createInvite(fields);
  const link = inviteUrl(key, siteUrl());
  const firstName = name.split(/\s+/)[0];

  // The text gets the bare-domain link; the email keeps the full one so it
  // renders as a proper anchor.
  const smsText = phone
    ? onboardingInviteSms(firstName, inviteUrlForSms(key, siteUrl()), kind)
    : null;

  // Both at once. Sequentially, a slow email delays the text for no reason,
  // and neither is allowed to fail the other.
  const [emailResult, smsResult] = await Promise.all([
    email
      ? sendOnboardingInvite({ to: email, firstName, link, kind, planName: plan?.name })
      : Promise.resolve({ ok: false as const, reason: "NO_EMAIL_GIVEN" }),
    phone && smsText
      ? sendSms({
          to: phone,
          body: smsText,
          // From "SUTH": this carries a link and asks nothing, so a sender
          // nobody can reply to costs nothing and looks like a company
          // rather than an unknown mobile number.
          sender: "brand",
        })
      : Promise.resolve({ ok: false as const, reason: "NO_PHONE_GIVEN" }),
  ]);

  // Stamp the lead as invited so the enquiries list shows it after a
  // refresh. markInvited never throws; a stamp failure never fails an
  // invite that has already gone out.
  if (body.leadId) {
    const { markInvited } = await import("@/lib/leads/store");
    await markInvited(String(body.leadId));
  }

  return NextResponse.json({
    link,
    /** How many characters Ben is actually sending. */
    linkLength: link.length,
    /** True when the short form was used; false means the long signed token. */
    shortLink: short,
    /** False when the link is signed with the development fallback secret. */
    secured: signingConfigured(),
    /** Echoed back so the admin can show what was actually agreed, in pence. */
    agreedPence: amountPence ?? null,
    /** The first-payment date the link will actually charge on, or null for today. */
    startsOn: startDay ? startDateISO(startDay) : null,
    email: {
      attempted: Boolean(email),
      ok: emailResult.ok,
      reason: emailResult.ok ? null : emailResult.reason,
      /** Resend's sandbox sender only delivers to the account owner. */
      sandbox: (process.env.RESEND_FROM ?? "").includes("resend.dev"),
    },
    sms: {
      attempted: Boolean(phone),
      ok: smsResult.ok,
      reason: smsResult.ok ? null : smsResult.reason,
      configured: smsConfigured(),
      sentAs: smsResult.ok ? smsResult.sentAs : null,
      /** Returned either way, so a failure never leaves Ben without a route. */
      text: smsText,
    },
  });
}
