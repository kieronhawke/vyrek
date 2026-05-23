import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SESSION_ID_RE = /^[a-z0-9-]{6,64}$/i;
const MAX_PATH_LEN = 256;

/**
 * Heartbeat ping for live-presence. Called from every public page on
 * mount + every 30s while the tab is visible. Idempotent upsert.
 *
 * No auth required — anonymous visitors are tracked too. If the
 * visitor is signed in via Supabase Auth, we attach their email so the
 * admin can see who's where.
 *
 * Body: { sid, path }
 */
type Body = { sid?: string; path?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const sid = (body.sid ?? "").trim();
  const path = (body.path ?? "").slice(0, MAX_PATH_LEN);
  if (!SESSION_ID_RE.test(sid) || !path.startsWith("/")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Try to attach a customer email if the visitor is signed in.
  let customerEmail: string | null = null;
  let customerId: string | null = null;
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user?.email) {
      customerEmail = user.email;
      // Best-effort: find their customers row
      const admin = supabaseAdmin();
      const { data: c } = await admin
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      customerId = c?.id ?? null;
    }
  } catch {
    // RLS or missing auth — fall through anonymous.
  }

  try {
    const admin = supabaseAdmin();
    const now = new Date().toISOString();
    await admin.from("live_sessions").upsert(
      {
        id: sid,
        path,
        country: req.headers.get("x-vercel-ip-country"),
        user_agent: req.headers.get("user-agent"),
        referrer: req.headers.get("referer"),
        customer_id: customerId,
        customer_email: customerEmail,
        started_at: now, // ignored on conflict (only inserted on first ping)
        last_seen: now,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
  } catch (err) {
    // Presence must NEVER block the page; swallow.
    console.warn("[presence/ping] insert failed", err);
  }
  return NextResponse.json({ ok: true });
}

/**
 * Client tells us they're leaving (visibilitychange to hidden + beacon).
 * Best-effort delete so the count drops immediately. The 60s expiry
 * handles the case where this never fires (browser killed, network died).
 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const sid = url.searchParams.get("sid") ?? "";
  if (!SESSION_ID_RE.test(sid)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const admin = supabaseAdmin();
    await admin.from("live_sessions").delete().eq("id", sid);
  } catch {}
  return NextResponse.json({ ok: true });
}
