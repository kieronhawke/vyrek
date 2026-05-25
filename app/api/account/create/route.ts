import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { limiters, requestIp } from "@/lib/rate-limit";
import { readPartnerAttributionCookie } from "@/lib/partners/attribution-cookie";
import {
  determineProgramme,
  determineStartDate,
  determineRaceDate,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { logEvent } from "@/lib/admin/events";

/**
 * Account creation endpoint. V3 quiz Screen 15.
 *
 * Expects: { authUserId, email, marketingOptIn, quizState }
 * Where `authUserId` is the Supabase Auth user.id returned from
 * `supabase.auth.signUp()` in the browser.
 *
 * On success: customer row + quiz_responses row + abandoned_plans recovery
 * row created. Returns programme + start/race dates so the client can show
 * the plan reveal without re-derivation.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// IP velocity rate-limit: enforced via Upstash (limiters.accountCreateIp,
// 8 signups per IP per 24h). When UPSTASH env vars are unset (local dev)
// the limiter falls back to an in-process map per lib/rate-limit.ts.

function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

type Body = {
  authUserId?: string;
  email?: string;
  marketingOptIn?: boolean;
  quizState?: {
    uuid?: string;
    answers?: Partial<QuizAnswers> & { raceDate?: string | Date | null };
  };
};

function normaliseAnswers(
  raw: Partial<QuizAnswers> & { raceDate?: string | Date | null } | undefined,
): QuizAnswers {
  const a = raw ?? {};
  return {
    intent: Array.isArray(a.intent) ? a.intent: [],
    experience: a.experience,
    bestTime: a.bestTime,
    raceDate:
      typeof a.raceDate === "string"
        ? new Date(a.raceDate): a.raceDate instanceof Date
          ? a.raceDate: undefined,
    activity: a.activity,
    sex: a.sex,
    weight: typeof a.weight === "number" ? a.weight: undefined,
    weightUnit: a.weightUnit,
    days: a.days,
    sessionLength: a.sessionLength,
    location: a.location,
    equipment: Array.isArray(a.equipment) ? a.equipment: undefined,
    partner: a.partner,
    injuries: a.injuries,
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid-body" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const authUserId = (body.authUserId ?? "").trim();
  const marketingOptIn = !!body.marketingOptIn;
  const quizUuid = (body.quizState?.uuid ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, reason: "invalid-email" },
      { status: 400 },
    );
  }
  if (!UUID_RE.test(authUserId)) {
    return NextResponse.json(
      { ok: false, reason: "invalid-auth-user-id" },
      { status: 400 },
    );
  }

  // IP velocity rate-limit: 8 signups per source IP per 24 hours, enforced
  // cluster-wide via Upstash (falls back to in-process for local dev).
  // Blocks the trivial multi-account-from-one-IP referral abuse pattern.
  const ip = requestIp(req);
  const velocity = await limiters.accountCreateIp.limit(ip);
  if (!velocity.success) {
    const retryAfter = Math.max(
      60,
      Math.ceil(((velocity.reset ?? Date.now() + 3_600_000) - Date.now()) / 1000),
    );
    const hours = Math.max(1, Math.round(retryAfter / 3600));
    return NextResponse.json(
      {
        ok: false,
        reason: "rate-limited",
        retryAfterSeconds: retryAfter,
        message: `Too many signups from this network in the last 24 hours. Try again in about ${hours} hour${hours === 1 ? "" : "s"}, or email support@vyrek.com if this looks wrong.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  // SECURITY: verify the caller actually holds the Supabase session for
  // the authUserId they're claiming. Without this check, any signed-in
  // user could pass another user's UUID and either claim that user's
  // customer row (email match) or pre-empt their future signup. See
  // 2026-05-23 security audit C-3.
  const sessionClient = await supabaseServer();
  const {
    data: { user: sessionUser },
  } = await sessionClient.auth.getUser();
  if (!sessionUser || sessionUser.id !== authUserId) {
    return NextResponse.json(
      { ok: false, reason: "auth-user-id-mismatch" },
      { status: 401 },
    );
  }

  const answers = normaliseAnswers(body.quizState?.answers);
  const programme = determineProgramme(answers);
  const startDate = determineStartDate();
  const raceDate = determineRaceDate(startDate, answers.raceDate);

  try {
    const sb = supabaseAdmin();

    // 1. Upsert customer keyed by auth_user_id. If a row exists with the
    //    same email but no auth_user_id (legacy quiz-v2 customer), claim it.
    const referralCode = generateReferralCode();
    const customerId = quizUuid && UUID_RE.test(quizUuid)
      ? quizUuid: crypto.randomUUID();

    // Try to find an existing customer by email first (carry over from
    // previous email-gate-only entries).
    const { data: existing } = await sb.from("customers").select("id, referral_code").eq("email", email).maybeSingle();

    let resolvedCustomerId: string;
    if (existing?.id) {
      const { error: updateErr } = await sb.from("customers").update({
          auth_user_id: authUserId,
          marketing_opt_in: marketingOptIn,
          doubles_upgrade_interest: answers.partner === "solo-partner-later",
        }).eq("id", existing.id);
      if (updateErr) throw updateErr;
      resolvedCustomerId = existing.id;
    } else {
      const { error: insertErr } = await sb.from("customers").insert({
        id: customerId,
        email,
        auth_user_id: authUserId,
        referral_code: referralCode,
        marketing_opt_in: marketingOptIn,
        doubles_upgrade_interest: answers.partner === "solo-partner-later",
      });
      if (insertErr) throw insertErr;
      resolvedCustomerId = customerId;
    }

    // 2. Snapshot the quiz answers.
    const answersJson = {
      ...answers,
      raceDate: answers.raceDate?.toISOString() ?? null,
    };

    const { data: qr, error: qrErr } = await sb.from("quiz_responses").insert({
        customer_id: resolvedCustomerId,
        email,
        answers: answersJson,
        program: programme,
        path: "quiz-v3",
        sex: answers.sex ?? null,
        weight_kg: answers.weight ?? null,
        weight_unit: answers.weightUnit ?? null,
        programme,
        partner_mode: answers.partner ?? null,
      }).select("id").single();

    if (qrErr) throw qrErr;

    // 3. Queue the +1hr abandoned-plan reminder. Marked recovered_at once
    //    Stripe webhook checkout.session.completed fires.
    await sb.from("abandoned_plans").insert({
      email,
      quiz_uuid: resolvedCustomerId,
      customer_id: resolvedCustomerId,
      program: programme,
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    // 4. Partner attribution. Read the signed vyrek_partner cookie set by
    //    /p/<slug>, verify the HMAC + expiry, and create a pending referral.
    //    Self-referrals (where the partner's own email matches the referee's)
    //    are dropped silently. Pre-fix, the cookie was unsigned and anyone
    //    could stamp `vyrek_partner=<any uuid>` to force-attribute referrals.
    try {
      const cookieStore = await cookies();
      const rawCookie = cookieStore.get("vyrek_partner")?.value;
      const verified = readPartnerAttributionCookie(rawCookie);
      const partnerId = verified.ok ? verified.partnerId : null;
      const subId = cookieStore.get("vyrek_partner_sub")?.value ?? null;
      if (partnerId) {
        const { data: partner } = await sb
          .from("partners")
          .select("id, email, suspended_at")
          .eq("id", partnerId)
          .maybeSingle();
        if (partner && !partner.suspended_at) {
          const selfReferral =
            (partner.email ?? "").trim().toLowerCase() === email;
          if (!selfReferral) {
            await sb
              .from("partner_referrals")
              .insert({
                partner_id: partnerId,
                customer_id: resolvedCustomerId,
                status: "trial",
                sub_id: subId,
                attribution_ip:
                  req.headers.get("x-forwarded-for") ??
                  req.headers.get("x-real-ip") ??
                  null,
                attribution_user_agent:
                  req.headers.get("user-agent") ?? null,
              })
              .select("id")
              .maybeSingle();
            // unique (partner_id, customer_id) will silently no-op if the
            // same person comes back through the funnel.
          }
        }
      }
    } catch (err) {
      // Attribution failures must NEVER block signup.
      console.error("[/api/account/create] partner attribution failed", err);
    }

    await logEvent({
      actor: "system",
      action: "customer.signed_up",
      targetKind: "customer",
      targetId: resolvedCustomerId,
      metadata: { programme, email },
    });

    return NextResponse.json({
      ok: true,
      customerId: resolvedCustomerId,
      quizResponseId: qr?.id ?? null,
      programme,
      startDate: startDate.toISOString(),
      raceDate: raceDate.toISOString(),
    });
  } catch (err) {
    // Don't leak DB errors to the client; log server-side only. Return
    // 500 so the client can decide whether to retry; the auth user
    // already exists at this point so the funnel proceeds either way.
    console.error("[/api/account/create] failed", err);
    return NextResponse.json(
      { ok: false, reason: "persist-failed" },
      { status: 500 },
    );
  }
}
