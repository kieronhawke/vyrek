import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signs and verifies the `vyrek_partner` attribution cookie.
 *
 * Format: `${partnerId}.${expiresAt}.${hmac(secret, "partner-attr:" + partnerId + ":" + expiresAt)}`
 *
 * Pre-fix, this cookie was the raw partner UUID with no signature,
 * which let any visitor stamp `vyrek_partner=<any-uuid>` and have any
 * partner attributed for their own signup. The 90-day TTL also lived
 * only in the Set-Cookie maxAge — an exfiltrated cookie could be
 * replayed indefinitely. Both fixed here.
 */

const TTL_SECONDS = 60 * 60 * 24 * 90;

function secret(): string {
  const s =
    process.env.PARTNER_ATTRIBUTION_SECRET ??
    process.env.PARTNER_SESSION_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    "";
  if (!s) {
    throw new Error(
      "Missing PARTNER_ATTRIBUTION_SECRET / PARTNER_SESSION_SECRET / SUPABASE_SECRET_KEY",
    );
  }
  return s;
}

function sign(partnerId: string, expiresAt: number): string {
  return createHmac("sha256", secret())
    .update(`partner-attr:${partnerId}:${expiresAt}`)
    .digest("base64url");
}

export function mintPartnerAttributionCookie(partnerId: string): {
  value: string;
  maxAgeSeconds: number;
} {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return {
    value: `${partnerId}.${expiresAt}.${sign(partnerId, expiresAt)}`,
    maxAgeSeconds: TTL_SECONDS,
  };
}

export function readPartnerAttributionCookie(
  raw: string | undefined | null,
): { ok: true; partnerId: string } | { ok: false } {
  if (!raw) return { ok: false };
  const parts = raw.split(".");
  if (parts.length !== 3) return { ok: false };
  const [partnerId, expStr, presented] = parts;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return { ok: false };
  }
  // Cheap UUID-shape check so we never feed garbage into Postgres.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(partnerId)) {
    return { ok: false };
  }
  try {
    const expected = sign(partnerId, expiresAt);
    const a = Buffer.from(presented, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length) return { ok: false };
    if (!timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, partnerId };
}
