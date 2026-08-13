import { NextResponse } from "next/server";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { saveOnboardingProfile } from "@/lib/onboarding/profile";
import { limiters, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SAVE WHAT THE CLIENT TOLD US.
 *
 * The onboarding flow POSTs the questionnaire here so it reaches the server
 * instead of dying in localStorage. Authorised by the same signed invite as
 * checkout — a valid invite is what proves this is a real client Ben set up.
 *
 * Best-effort by design: the flow does not block payment on it. Bodies can
 * carry a photo data URL, so the limit is generous but present.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: Request) {
  const ip = requestIp(request);
  const rl = await limiters.onboardingCheckout.limit(`profile:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: {
    token?: string;
    email?: string;
    answers?: unknown;
    photo?: string;
    healthConsent?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // The invite is the authorisation, same as checkout.
  const read = await resolveInvite(body.token ?? "");
  if (!read.ok) {
    return NextResponse.json({ error: "INVITE_INVALID" }, { status: 403 });
  }

  // Prefer the invite's email; fall back to the one the client typed.
  const bodyEmail = (body.email ?? "").trim().toLowerCase();
  const email =
    (read.invite.email || "").trim().toLowerCase() ||
    (EMAIL_RE.test(bodyEmail) ? bodyEmail : "");
  if (!email) {
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 422 });
  }

  const ok = await saveOnboardingProfile({
    email,
    name: read.invite.name,
    inviteToken: body.token ?? null,
    answers: body.answers,
    photoDataUrl: body.photo ?? null,
    healthConsent: body.healthConsent,
  });

  if (!ok) {
    // Not the client's problem and not worth failing their onboarding over,
    // but we want to know the table might be missing / unreachable.
    void import("@/lib/observability").then(({ reportError }) =>
      reportError(new Error("onboarding profile not saved"), {
        where: "onboarding/profile",
        email,
      }),
    );
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
