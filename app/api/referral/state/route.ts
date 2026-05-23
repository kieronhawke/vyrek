import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Returns the signed-in member's referral state: their code, how many people
 * they've referred, how many converted to paid, and earnings in pence.
 *
 * Returns 200 with `{ authenticated: false }` if there's no Supabase session,
 * the client treats this as "preview" and renders sample data. We deliberately
 * avoid a 401 here because the refer page eagerly fetches on mount and a 4xx
 * response gets logged in the browser console as a network error, which leaks
 * into Lighthouse / Sentry noise. The semantic is the same; the wire format
 * is just nicer.
 */

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  const admin = supabaseAdmin();

  const { data: customer, error: customerErr } = await admin.from("customers").select("id, referral_code").eq("auth_user_id", user.id).maybeSingle();

  if (customerErr || !customer || !customer.referral_code) {
    return NextResponse.json({
      authenticated: true,
      hasCustomerRecord: false,
    });
  }

  // Count referrals + payouts. Bounty is £20 per converted = 2000 pence.
  const { data: rows } = await admin.from("referrals").select("status").eq("referrer_customer_id", customer.id);

  const totalReferred = rows?.length ?? 0;
  const totalConverted = rows?.filter((r) => r.status === "converted").length ?? 0;
  const earningsPence = totalConverted * 2000;

  return NextResponse.json({
    code: customer.referral_code,
    totalReferred,
    totalConverted,
    earningsPence,
  });
}
