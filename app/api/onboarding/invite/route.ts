import { NextResponse } from "next/server";
import { render } from "@react-email/components";
import {
  createInvite,
  inviteUrl,
  inviteUrlForSms,
  signingConfigured,
  validAmountPence,
  INVITE_DAYS,
  type InviteKind,
} from "@/lib/onboarding/token";
import {
  inviteStoreDurable,
  newInviteId,
  storeInvite,
} from "@/lib/onboarding/invite-store";
import { parsePrice, planByKey } from "@/lib/onboarding/model";
import {
  parseStartDate,
  startDateBlocker,
  startDateISO,
  todayDay,
} from "@/lib/onboarding/start-date";
import {
  parseDueToday,
  paymentSchedule,
  scheduleLines,
  scheduleRows,
  scheduleSms,
} from "@/lib/onboarding/schedule";
import { sendOnboardingInvite } from "@/lib/email/send";
import {
  OnboardingInviteEmail,
  onboardingInviteSms,
  onboardingInviteSubject,
} from "@/lib/email/templates/onboarding-invite";
import {
  isReservedTestNumber,
  sendSms,
  smsConfigured,
  toE164,
} from "@/lib/sms/send";
import { isGsm7, segments } from "@/lib/sms/messages";
import { siteUrl } from "@/lib/site-url";
import { supabaseServer } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { limiters, requestIp } from "@/lib/rate-limit";

/**
 * CREATE AN INVITE AND SEND IT — OR SHOW EXACTLY WHAT WOULD BE SENT.
 *
 * Returns the link either way. Ben can always copy it and send it himself —
 * a delivery failure must never leave him with no way to onboard somebody,
 * which is exactly what an endpoint that only reports "sent" or "failed"
 * would do.
 *
 * `preview: true` RUNS EVERYTHING EXCEPT THE SIDE EFFECTS. The same
 * validation, the same schedule, the same email and text — rendered and
 * returned, nothing stored and nothing sent. That is the review step: Ben
 * sees the message the client will get, word for word, before he presses
 * send. Two calls to one route rather than two routes, so the preview cannot
 * drift from the send.
 *
 * EMAIL IS REAL. Resend is configured and this genuinely sends. The response
 * says which sender was used and the admin surfaces it. Reporting "sent" for
 * a message that will never arrive is worse than reporting nothing.
 *
 * SMS IS ALSO REAL. It goes through the "Suth Performance" Messaging
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
   * What they owe today, as Ben typed it — "100", "£100". Blank for nothing.
   * A month in arrears, a block before the card existed. Parsed here for the
   * same reason the rate is.
   */
  dueToday?: string;
  /**
   * The day the first monthly payment should be taken, as "2026-09-01".
   *
   * Omitted or today means the monthly cycle starts at checkout. A future
   * date defers the first monthly collection to that morning and anchors
   * every month after it.
   */
  startDate?: string;
  /** Validate and render, send nothing, store nothing. */
  preview?: boolean;
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
  /* Checked here, not discovered as "NOT_A_PHONE_NUMBER" after the email has
     already gone. Ben reviews the number on the screen before anything is
     sent, so a typo is his to fix while the form is still in front of him. */
  const phoneE164 = phone ? toE164(phone) : null;
  if (phone && !phoneE164) {
    return NextResponse.json({ error: "PHONE_INVALID" }, { status: 400 });
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
   * WHAT THEY OWE TODAY.
   *
   * Only ever alongside an agreed rate: a balance is part of an arrangement
   * with one person, and a published tier has no such thing. Refused rather
   * than dropped for the same reason the rate is — a balance that vanished
   * between the form and the link is £100 Ben never collects and never
   * knows he did not.
   */
  let dueTodayPence = 0;
  const dueRaw = (body.dueToday ?? "").trim();
  if (dueRaw) {
    const parsed = parseDueToday(dueRaw);
    if (parsed === null) {
      return NextResponse.json({ error: "DUE_TODAY_INVALID" }, { status: 400 });
    }
    if (parsed > 0 && !amountPence) {
      return NextResponse.json({ error: "DUE_TODAY_NEEDS_RATE" }, { status: 400 });
    }
    dueTodayPence = parsed;
  }

  /*
   * WHEN THE FIRST MONTHLY PAYMENT COMES OUT.
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

  /* THE WORDS, BUILT ONCE FROM THE NUMBERS THE CHECKOUT WILL CHARGE.
     The email, the text, the review panel and the client's screens all read
     the same schedule; none of them assembles its own sentence. */
  const schedule = amountPence
    ? paymentSchedule({ amountPence, dueTodayPence, startDay })
    : null;
  const lines = schedule ? scheduleLines(schedule) : null;
  const payLine = lines ? `${lines.today} ${lines.monthly}` : null;
  const payRows = schedule ? scheduleRows(schedule) : null;
  const smsSchedule = schedule ? scheduleSms(schedule) : null;
  const firstName = name.split(/\s+/)[0];
  const subject = onboardingInviteSubject(firstName, kind);
  const sandbox = (process.env.RESEND_FROM ?? "").includes("resend.dev");

  /*
   * THE REVIEW STEP.
   *
   * Everything above has run, so a bad rate, a bad date or a bad number is
   * refused here — and nothing below runs. The link in the preview is a
   * sample of the right shape and length; the real one is minted on send.
   * The email is rendered to HTML and plain text so the admin can show the
   * actual message rather than a description of it.
   */
  if (body.preview) {
    const sampleId = newInviteId();
    const link = inviteUrl(sampleId, siteUrl());
    const smsText = phone
      ? onboardingInviteSms(firstName, inviteUrlForSms(sampleId, siteUrl()), kind, smsSchedule)
      : null;
    const element = OnboardingInviteEmail({ firstName, link, kind, payLine, payRows });
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);
    return NextResponse.json({
      preview: true,
      to: { name, firstName, email: email || null, phone: phoneE164 },
      agreedPence: amountPence ?? null,
      dueTodayPence,
      startsOn: startDay ? startDateISO(startDay) : null,
      schedule: schedule
        ? { ...schedule, lines, rows: payRows, sms: smsSchedule }
        : null,
      link,
      shortLink: inviteStoreDurable(),
      secured: signingConfigured(),
      email: {
        attempted: Boolean(email),
        configured: Boolean(process.env.RESEND_API_KEY),
        from: process.env.RESEND_FROM ?? null,
        sandbox,
        subject,
        html,
        text,
      },
      sms: {
        attempted: Boolean(phone),
        configured: smsConfigured(),
        sentAs: process.env.TWILIO_ALPHA_SENDER ?? "number",
        text: smsText,
        segments: smsText ? segments(smsText) : 0,
        gsm: smsText ? isGsm7(smsText) : true,
        /* Ofcom's reserved drama range: the transport refuses it, so say so
           now rather than reporting a failed text after the email went. */
        reserved: phoneE164 ? isReservedTestNumber(phoneE164) : false,
      },
    });
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
    ...(dueTodayPence ? { dueTodayPence } : {}),
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

  // The text gets the bare-domain link; the email keeps the full one so it
  // renders as a proper anchor.
  const smsText = phone
    ? onboardingInviteSms(firstName, inviteUrlForSms(key, siteUrl()), kind, smsSchedule)
    : null;

  // Both at once. Sequentially, a slow email delays the text for no reason,
  // and neither is allowed to fail the other.
  const [emailResult, smsResult] = await Promise.all([
    email
      ? sendOnboardingInvite({
          to: email,
          firstName,
          link,
          kind,
          payLine,
          payRows,
        })
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
    /** The stored id, so the admin can cancel this link. Null on the fallback. */
    inviteId: short && stored.ok ? stored.id : null,
    /** How many characters Ben is actually sending. */
    linkLength: link.length,
    /** True when the short form was used; false means the long signed token. */
    shortLink: short,
    /** False when the link is signed with the development fallback secret. */
    secured: signingConfigured(),
    /** Echoed back so the admin can show what was actually agreed, in pence. */
    agreedPence: amountPence ?? null,
    dueTodayPence,
    /** The first monthly payment date the link will actually charge on, or null for today. */
    startsOn: startDay ? startDateISO(startDay) : null,
    schedule: schedule ? { ...schedule, lines, rows: payRows, sms: smsSchedule } : null,
    email: {
      attempted: Boolean(email),
      ok: emailResult.ok,
      reason: emailResult.ok ? null : emailResult.reason,
      subject,
      /** Resend's sandbox sender only delivers to the account owner. */
      sandbox,
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
