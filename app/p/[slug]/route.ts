import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SUB_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

/**
 * Partner attribution endpoint. Visiting vyrek.com/p/<slug>(?sub=campaign):
 *  - looks up the partner
 *  - logs a partner_clicks row (used for CTR + conversion funnel)
 *  - sets a 90-day vyrek_partner first-party cookie (httpOnly)
 *  - 302s to `to` (default /). Onsite-only.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const to = url.searchParams.get("to") || "/";
  const dest = to.startsWith("/") ? to : "/";

  const sub = (url.searchParams.get("sub") ?? "").trim();
  const subId = sub && SUB_RE.test(sub) ? sub.toLowerCase() : null;

  let partnerId: string | null = null;
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("partners")
      .select("id, suspended_at")
      .eq("partner_code", slug)
      .maybeSingle();
    if (data && !data.suspended_at) partnerId = data.id as string;

    if (partnerId) {
      await admin
        .from("partner_clicks")
        .insert({
          partner_id: partnerId,
          sub_id: subId,
          ip:
            req.headers.get("x-forwarded-for") ??
            req.headers.get("x-real-ip") ??
            null,
          user_agent: req.headers.get("user-agent") ?? null,
          referer: req.headers.get("referer") ?? null,
          country: req.headers.get("x-vercel-ip-country") ?? null,
        });
    }
  } catch (err) {
    // Click logging must never break the partner link.
    console.warn("[/p/<slug>] click log failed", err);
  }

  const res = NextResponse.redirect(new URL(dest, url.origin), 302);
  if (partnerId) {
    res.cookies.set("vyrek_partner", partnerId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    if (subId) {
      res.cookies.set("vyrek_partner_sub", subId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      });
    }
  }
  return res;
}
