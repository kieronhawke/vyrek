import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Onboarding token helpers. Token = base64url(HMAC_SHA256(secret, appId)).
 * No DB column needed; the link sent in the approval email is a deterministic
 * function of the application id + a server secret. Anyone with the secret
 * can mint a token; nobody without it can.
 *
 * Secret comes from PARTNER_ONBOARDING_SECRET; falls back to
 * SUPABASE_SECRET_KEY so the link is always signable even before the user
 * sets a dedicated secret.
 */

function secret(): string {
  const s =
    process.env.PARTNER_ONBOARDING_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    "";
  if (!s) {
    throw new Error(
      "Missing PARTNER_ONBOARDING_SECRET (or SUPABASE_SECRET_KEY fallback)",
    );
  }
  return s;
}

function sign(applicationId: string): string {
  return createHmac("sha256", secret())
    .update(`partner-onboard:${applicationId}`)
    .digest("base64url");
}

export function mintOnboardingToken(applicationId: string): string {
  return `${applicationId}.${sign(applicationId)}`;
}

export function verifyOnboardingToken(
  token: string,
): { ok: true; applicationId: string } | { ok: false; reason: string } {
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing token" };
  }
  const idx = token.indexOf(".");
  if (idx <= 0) return { ok: false, reason: "malformed token" };
  const applicationId = token.slice(0, idx);
  const presented = token.slice(idx + 1);
  let expected: string;
  try {
    expected = sign(applicationId);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "secret missing",
    };
  }
  const a = Buffer.from(presented, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length) return { ok: false, reason: "bad signature" };
  if (!timingSafeEqual(a, b)) return { ok: false, reason: "bad signature" };
  return { ok: true, applicationId };
}
