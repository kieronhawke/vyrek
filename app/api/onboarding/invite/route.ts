import { NextResponse } from "next/server";
import { createInvite, inviteUrl, signingConfigured } from "@/lib/onboarding/token";
import { planByKey } from "@/lib/onboarding/model";
import { sendOnboardingInvite } from "@/lib/email/send";
import { onboardingInviteSms } from "@/lib/email/templates/onboarding-invite";
import { sendSms, smsConfigured } from "@/lib/sms/send";
import { siteUrl } from "@/lib/site-url";

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
};

export async function POST(request: Request) {
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
  const token = createInvite({ name, email, phone, kind, plan: plan?.key });
  const link = inviteUrl(token, siteUrl());
  const firstName = name.split(/\s+/)[0];

  const smsText = phone ? onboardingInviteSms(firstName, link, kind) : null;

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

  return NextResponse.json({
    link,
    /** False when the link is signed with the development fallback secret. */
    secured: signingConfigured(),
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
