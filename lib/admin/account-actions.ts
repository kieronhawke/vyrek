"use server";

import { assertAdmin, isAdminEmail } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Customer login accounts, managed through the Supabase Auth admin API.
 *
 * These run with the service-role key, so the assertAdmin gate is the whole
 * of their security. Each returns a plain { ok, error } so the client can
 * show a clear inline message without throwing.
 *
 * "Disabled" is Supabase's ban with a 100-year duration: the account still
 * exists and its data is untouched, it simply cannot sign in. "Enable" clears
 * the ban. No account is ever deleted from here.
 */

const DISABLE_DURATION = "876000h"; // ~100 years — a permanent ban until lifted.

type ActionResult = { ok: boolean; error?: string };

export async function setAccountDisabled(
  userId: string,
  disabled: boolean,
): Promise<ActionResult> {
  const { user } = await assertAdmin();

  if (!userId) return { ok: false, error: "Missing account id." };

  // Never let the admin console lock an admin out. Admin access *is* the
  // Supabase session, so banning an allowlisted login (or your own) is a
  // one-click, dashboard-only-recoverable lockout. Disabling an admin is
  // simply not this tool's job — admins are managed via ADMIN_EMAILS.
  if (disabled) {
    if (userId === user.id) {
      return { ok: false, error: "You can't disable your own admin login." };
    }
    const { data: target } = await supabaseAdmin().auth.admin.getUserById(
      userId,
    );
    if (isAdminEmail(target?.user?.email)) {
      return {
        ok: false,
        error:
          "That's an admin login. Remove it from ADMIN_EMAILS to revoke admin access — it can't be disabled here.",
      };
    }
  }

  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, {
    ban_duration: disabled ? DISABLE_DURATION : "none",
  });

  if (error) {
    return {
      ok: false,
      error: disabled
        ? "Couldn't disable that account. Try again in a moment."
        : "Couldn't re-enable that account. Try again in a moment.",
    };
  }

  return { ok: true };
}

export async function createAccount(
  email: string,
  password: string,
): Promise<ActionResult> {
  await assertAdmin();

  const cleanEmail = email.trim().toLowerCase();
  // Deliberately loose: one @, something on each side, a dot in the domain.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  if (!emailOk) {
    return { ok: false, error: "That doesn't look like a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const { error } = await supabaseAdmin().auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, error: "That email is already registered." };
    }
    if (msg.includes("password")) {
      return { ok: false, error: "That password was rejected. Try a stronger one." };
    }
    return { ok: false, error: "Couldn't create the account. Try again in a moment." };
  }

  return { ok: true };
}
