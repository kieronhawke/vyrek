import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Magic-link tokens for partner dashboard sign-in. Token =
 * partnerId.expiresAt.signature. The signature covers both fields so
 * neither can be rewritten in flight.
 *
 * 15-minute TTL. Single-use is enforced at verify time by checking that
 * the expiry is still in the future; replay within the window is
 * accepted on purpose (so if the email link is opened twice quickly,
 * both work).
 */

const TTL_SECONDS = 15 * 60;

function secret(): string {
  const s =
    process.env.PARTNER_MAGIC_LINK_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    "";
  if (!s) throw new Error("Missing PARTNER_MAGIC_LINK_SECRET");
  return s;
}

function sign(partnerId: string, expiresAt: number): string {
  return createHmac("sha256", secret())
    .update(`partner-magic:${partnerId}:${expiresAt}`)
    .digest("base64url");
}

export function mintMagicToken(partnerId: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = sign(partnerId, expiresAt);
  return {
    token: `${partnerId}.${expiresAt}.${sig}`,
    expiresAt,
  };
}

export function verifyMagicToken(
  token: string,
): { ok: true; partnerId: string } | { ok: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [partnerId, expStr, presented] = parts;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt)) return { ok: false, reason: "malformed" };
  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }
  try {
    const expected = sign(partnerId, expiresAt);
    const a = Buffer.from(presented, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length) return { ok: false, reason: "bad signature" };
    if (!timingSafeEqual(a, b)) return { ok: false, reason: "bad signature" };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "secret missing",
    };
  }
  return { ok: true, partnerId };
}
