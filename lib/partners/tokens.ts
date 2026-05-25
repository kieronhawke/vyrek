import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Onboarding token helpers.
 *
 * Token format: `${applicationId}.${expiresAt}.${HMAC(secret, "partner-onboard:" + appId + ":" + expiresAt)}`
 *
 * Pre-fix the token was HMAC(appId) with no expiry, so any leaked approval
 * email could be replayed forever. New tokens carry a 14-day expiry; old
 * tokens (no expiry segment) are rejected. Secret falls back to
 * SUPABASE_SECRET_KEY so the link is always signable.
 */

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14;

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

function sign(applicationId: string, expiresAt: number): string {
  return createHmac("sha256", secret())
    .update(`partner-onboard:${applicationId}:${expiresAt}`)
    .digest("base64url");
}

export function mintOnboardingToken(
  applicationId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${applicationId}.${expiresAt}.${sign(applicationId, expiresAt)}`;
}

export function verifyOnboardingToken(
  token: string,
): { ok: true; applicationId: string } | { ok: false; reason: string } {
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing token" };
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "malformed token" };
  }
  const [applicationId, expStr, presented] = parts;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt)) {
    return { ok: false, reason: "bad expiry" };
  }
  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }
  let expected: string;
  try {
    expected = sign(applicationId, expiresAt);
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
