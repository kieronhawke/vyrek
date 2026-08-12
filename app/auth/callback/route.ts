import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * THE DOOR THE SIGN-IN LINKS OPEN.
 *
 * Every emailed link — the account-ready magic link after checkout, a
 * sign-in link requested from /login, a password recovery — lands here to
 * be exchanged for a session cookie, then bounces to `next`.
 *
 * This route did not exist before: activation emails carried Supabase's
 * hosted action_link which redirected to /app, middleware saw no cookie
 * and bounced to a password login — and invite-onboarded customers have
 * no password, deliberately. Every one of them was stranded.
 *
 * Two shapes are accepted:
 *   ?token_hash=...&type=magiclink|recovery|email  → verifyOtp
 *   ?code=...                                      → exchangeCodeForSession
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app/today";
  return raw;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // Cookies must be written onto the SAME response that redirects, or the
  // browser never receives the session.
  const success = NextResponse.redirect(new URL(next, url.origin));
  const sb = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        for (const c of toSet) {
          success.cookies.set(c.name, c.value, c.options);
        }
      },
    },
  });

  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return success;
    console.error("[auth/callback] verifyOtp failed", error.message);
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return success;
    console.error("[auth/callback] code exchange failed", error.message);
  }

  // Expired or already-used link: land on login with a flag the form can
  // read to offer a fresh sign-in link rather than a dead end.
  const fallback = new URL("/login", url.origin);
  fallback.searchParams.set("next", next);
  fallback.searchParams.set("link", "expired");
  return NextResponse.redirect(fallback);
}
