import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only endpoint returning sessions active in the last 60 seconds.
 * Polled by the /admin/live client every 5s.
 */
export async function GET() {
  // Auth gate: same pattern as the admin server actions.
  await assertAdmin();

  try {
    const sb = supabaseAdmin();
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data, error } = await sb
      .from("live_sessions")
      .select("*")
      .gte("last_seen", cutoff)
      .order("last_seen", { ascending: false })
      .limit(500);
    if (error) {
      return NextResponse.json(
        { ok: false, reason: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, sessions: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
