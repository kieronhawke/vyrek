import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Defence-in-depth gate for /admin/*. The (authed) layout already calls
 * assertAdmin() inside every admin page; this middleware adds belt to
 * the layout's braces. If anyone ever drops an admin page outside the
 * route group, this still keeps unsigned visitors out. Security audit
 * H-2.
 *
 * /admin/login is allowed through so visitors can actually sign in.
 * The email-allowlist check (ADMIN_EMAILS) stays in the layout's
 * assertAdmin() — middleware would need its own env access which
 * complicates edge-runtime behaviour for now.
 */

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  // Allow login itself.
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Defer to the page-level gate when Supabase env isn't configured.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  // Read the Supabase session via createServerClient. We don't fetch
  // user data here (saves a round trip); we only check the cookie is
  // present + valid-looking. The layout's assertAdmin() does the real
  // user + allowlist check.
  const res = NextResponse.next();
  try {
    const sb = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          for (const c of toSet) {
            res.cookies.set(c.name, c.value, c.options);
          }
        },
      },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      const login = new URL("/admin/login", req.url);
      return NextResponse.redirect(login);
    }
  } catch {
    // If the session check itself errors, let the page-level gate
    // handle it.
  }
  return res;
}
