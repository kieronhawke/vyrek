import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Admin auth gate. Email-allowlist model: anyone signed in via Supabase
 * Auth whose email is listed in the ADMIN_EMAILS env var is considered
 * an admin. Phase 1; replace with a roles table when a second admin
 * joins.
 *
 *   ADMIN_EMAILS=kieron.hawke@googlemail.com,another@vyrek.com
 *
 * Use from admin layouts/pages/route handlers:
 *
 *   const { user } = await assertAdmin();
 *   // user.email is guaranteed to be in the allowlist
 */

export const ADMIN_LOGIN_PATH = "/admin/login";

export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/**
 * For Server Components and Server Actions inside /admin/**. Redirects to
 * /admin/login if not signed in; redirects to / with a flash if signed in
 * but not in the allowlist (covered by middleware too, but defence in
 * depth).
 */
export async function assertAdmin() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect(ADMIN_LOGIN_PATH);
  if (!isAdminEmail(user.email)) redirect("/");

  return { user, sb };
}

/**
 * Soft check that doesn't redirect. Useful for conditionally rendering
 * UI inside the admin shell (e.g. enabling/disabling a button).
 */
export async function getCurrentAdmin() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
}
