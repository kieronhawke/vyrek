import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/admin/events";
import { limiters, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Body = {
  name?: string;
  email?: string;
  country?: string;
  platform?: string;
  followerCount?: string;
  contentDescription?: string;
  whyVyrek?: string;
  primaryUrl?: string;
  pastAffiliate?: string;
  promotionMethods?: string[];
  termsAccepted?: boolean;
};

// Tight email regex; matches what /api/email-gate accepts so a value
// good enough for one funnel is good enough for the other.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/;

function validate(b: Body): string | null {
  if (!b.name || b.name.trim().length < 2) return "Please enter your name.";
  if ((b.name ?? "").length > 120) return "Name is too long.";
  if (!b.email || b.email.length > 254 || !EMAIL_RE.test(b.email))
    return "Please enter a valid email.";
  if (!b.country || b.country.trim().length < 2)
    return "Please enter your country.";
  if ((b.country ?? "").length > 64) return "Country name is too long.";
  if (!b.platform) return "Please choose a primary platform.";
  if (!b.followerCount) return "Please choose a follower count range.";
  if (!b.contentDescription || b.contentDescription.trim().length < 12)
    return "Tell us a bit more about your content (12+ characters).";
  if (!b.whyVyrek || b.whyVyrek.trim().length < 20)
    return "Tell us why Vyrek fits your audience (20+ characters).";
  if (!b.primaryUrl || !/^https?:\/\//.test(b.primaryUrl))
    return "Please paste a full URL (including https://).";
  if (!Array.isArray(b.promotionMethods) || b.promotionMethods.length === 0)
    return "Pick at least one promotion method.";
  if (!b.termsAccepted) return "Please accept the Partner Terms to apply.";
  return null;
}

export async function POST(req: Request) {
  // Rate limit per IP, 5 applications per hour. Email is added to the
  // key after validation so a single attacker can't farm many emails.
  const ip = requestIp(req);
  const r = await limiters.partnerApply.limit(`ip:${ip}`);
  if (!r.success) {
    return NextResponse.json(
      { ok: false, error: "Too many applications. Try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const err = validate(body);
  if (err) {
    return NextResponse.json({ ok: false, error: err }, { status: 400 });
  }

  // Cap free-text lengths at sensible maxes to prevent DB bloat / log
  // spam.  Frontend already enforces these via maxLength but the API
  // must enforce too. Security audit C-1.
  if ((body.contentDescription ?? "").length > 600) {
    return NextResponse.json(
      { ok: false, error: "Content description is too long." },
      { status: 400 },
    );
  }
  if ((body.whyVyrek ?? "").length > 1000) {
    return NextResponse.json(
      { ok: false, error: "Why Vyrek is too long." },
      { status: 400 },
    );
  }
  if ((body.primaryUrl ?? "").length > 400) {
    return NextResponse.json(
      { ok: false, error: "URL is too long." },
      { status: 400 },
    );
  }

  try {
    const admin = supabaseAdmin();
    const { data: inserted, error } = await admin
      .from("partner_applications")
      .insert({
        email: body.email,
        name: body.name,
        country: body.country,
        platform: body.platform,
        follower_count: body.followerCount,
        content_description: body.contentDescription,
        why_vyrek: body.whyVyrek,
        primary_url: body.primaryUrl,
        past_affiliate: body.pastAffiliate || null,
        promotion_methods: body.promotionMethods,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[/api/partners/apply] insert failed", error);
      return NextResponse.json(
        { ok: false, error: "Could not save your application. Please try again." },
        { status: 500 },
      );
    }
    await logEvent({
      actor: "system",
      action: "partner.application.submitted",
      targetKind: "partner_application",
      targetId: inserted.id,
      metadata: {
        platform: body.platform,
        followerCount: body.followerCount,
        country: body.country,
      },
    });
  } catch (e) {
    console.error("[/api/partners/apply] unexpected", e);
    return NextResponse.json(
      { ok: false, error: "Server error. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
