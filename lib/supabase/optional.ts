import { supabaseServer } from "@/lib/supabase/server";

/**
 * "Is anyone signed in?" — safe to ask when Supabase is not configured.
 *
 * The sign-in pages call supabaseServer() to redirect an already-signed-in
 * visitor. With no publishable key, createServerClient throws and both /login
 * and /admin/login return a 500 — so the two pages whose entire job is to let
 * someone in are the two that are down, and the demo panel on them cannot be
 * seen at all.
 *
 * A missing credential is a "nobody is signed in" answer, not a crash. This
 * returns null in that case and lets the page render.
 */
export async function currentUserOrNull(): Promise<{
  id: string;
  email: string | null;
} | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    // Misconfigured or unreachable. Treat as signed out rather than 500 —
    // the visitor can still see the page and the demo entry.
    return null;
  }
}

/** Whether a real sign-in can work at all, for honest copy on the page. */
export function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
