import { NextResponse } from "next/server";
import { createInvite, inviteUrl, signingConfigured } from "@/lib/onboarding/token";
import { planByKey } from "@/lib/onboarding/model";
import { sendOnboardingInvite } from "@/lib/email/send";
import { onboardingInviteSms } from "@/lib/email/templates/onboarding-invite";
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
 * SMS IS NOT. No Twilio or ClickSend credential exists. The text is composed
 * and returned so Ben can paste it into his own phone, and the response says
 * plainly that nothing was transmitted.
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

  const emailResult = email
    ? await sendOnboardingInvite({
        to: email,
        firstName,
        link,
        kind,
        planName: plan?.name,
      })
    : { ok: false as const, reason: "NO_EMAIL_GIVEN" };

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
      attempted: false,
      ok: false,
      reason: "NO_SMS_PROVIDER",
      /** Composed so Ben can send it himself in the meantime. */
      text: phone ? onboardingInviteSms(firstName, link, kind) : null,
    },
  });
}
