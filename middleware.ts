import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge auth gate for /admin/* and /app/*. The per-page server
 * components (assertAdmin / assertMember) own the canonical check
 * (user existence, email allowlist for admin, customer lookup for
 * members). This middleware adds defence-in-depth at the edge so:
 *
 *   - Unauthenticated /admin/* visits never reach the layout — they
 *     bounce to /admin/login immediately.
 *   - Unauthenticated /app/* visits bounce to /login?next=<path>.
 *
 * The login pages themselves are allowed through.
 */

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Always allow the login surfaces themselves.
  if (path === "/admin/login" || path === "/login") {
    return NextResponse.next();
  }

  // Defer to the page-level gate when Supabase env isn't configured
  // (local dev without env, edge bundle missing keys, etc.).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

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
      if (path.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      const login = new URL("/login", req.url);
      login.searchParams.set("next", path);
      return NextResponse.redirect(login);
    }
  } catch {
    // If the session check itself errors, let the page-level gate
    // handle it rather than redirecting on a server hiccup.
  }
  return res;
}
