import { NextResponse } from "next/server";
import { clearPartnerSessionCookie } from "@/lib/partners/session";

export const runtime = "nodejs";

/**
 * Logout endpoint. Same-origin enforcement: SameSite=lax cookies allow
 * cross-site top-level form POSTs, so an attacker page can force-logout
 * a partner. We verify the Origin (or Referer) matches our own host
 * before clearing the cookie. Security audit H-3.
 */
function sameOrigin(req: Request): boolean {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === url.host;
    } catch {
      return false;
    }
  }
  // Fallback: check Referer if Origin missing (some legacy form posts).
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host === url.host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: "cross-origin request denied" },
      { status: 403 },
    );
  }
  const url = new URL(req.url);
  const res = NextResponse.redirect(
    new URL("/partners/dashboard", url.origin),
    303,
  );
  return clearPartnerSessionCookie(res);
}
