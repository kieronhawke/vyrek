import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Partner dashboard session cookie. Bearer-style: an HMAC over the
 * partner id stamped on a cookie; verified server-side on every render.
 * Magic-link sign-in mints the same cookie value, so the same code path
 * handles "just onboarded" and "returning visitor".
 *
 * 30-day TTL. Rotation handled by re-signing on each magic-link visit.
 */

const COOKIE = "vyrek_partner_session";
const TTL_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const s =
    process.env.PARTNER_SESSION_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    "";
  if (!s) throw new Error("Missing PARTNER_SESSION_SECRET / SUPABASE_SECRET_KEY");
  return s;
}

function sign(partnerId: string): string {
  return createHmac("sha256", secret())
    .update(`partner-session:${partnerId}`)
    .digest("base64url");
}

export function mintPartnerSessionCookieValue(partnerId: string): string {
  return `${partnerId}.${sign(partnerId)}`;
}

export function parsePartnerSessionCookieValue(
  raw: string,
): { ok: true; partnerId: string } | { ok: false } {
  const idx = raw.indexOf(".");
  if (idx <= 0) return { ok: false };
  const partnerId = raw.slice(0, idx);
  const presented = raw.slice(idx + 1);
  try {
    const expected = sign(partnerId);
    const a = Buffer.from(presented, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length) return { ok: false };
    if (!timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, partnerId };
}

export function setPartnerSessionCookie(
  res: NextResponse,
  partnerId: string,
): NextResponse {
  res.cookies.set(COOKIE, mintPartnerSessionCookieValue(partnerId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return res;
}

export function clearPartnerSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

/** Server-component / Server-action helper. */
export async function readPartnerSession(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const parsed = parsePartnerSessionCookieValue(raw);
  return parsed.ok ? parsed.partnerId : null;
}
