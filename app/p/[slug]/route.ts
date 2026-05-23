import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Partner attribution endpoint. Visiting vyrek.com/p/<slug> looks up the
 * partner, sets a 90-day first-party cookie carrying the partner id, and
 * 302s the visitor to the landing page (or to ?to= if provided).
 *
 * The cookie is read at account creation and at first paid invoice to
 * attribute the customer to the partner. No third-party trackers; the
 * cookie is httpOnly so the client never touches it.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const to = url.searchParams.get("to") || "/";

  // Defensive: never let `to` be an offsite URL.
  const dest = to.startsWith("/") ? to : "/";

  let partnerId: string | null = null;
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("partners")
      .select("id, suspended_at")
      .eq("partner_code", slug)
      .maybeSingle();

    if (data && !data.suspended_at) {
      partnerId = data.id as string;
    }
  } catch (err) {
    // Database lookups failing should not break a partner link; just fall
    // through with no attribution rather than 500-ing on the visitor.
    console.warn("[/p/<slug>] partner lookup failed", err);
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
  }

  return res;
}
