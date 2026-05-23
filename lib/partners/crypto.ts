import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Symmetric AES-GCM for bank-detail columns (sort code, account number,
 * account name). Stored as `iv:ciphertext:tag` all base64url.
 *
 * Key is derived from PARTNER_PII_SECRET via scrypt; fall back to
 * SUPABASE_SECRET_KEY (which is already considered server-only) so we
 * don't crash without a dedicated secret.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function keyMaterial(): string {
  // SECURITY: require a dedicated PII secret. Sharing the Supabase
  // service-role key defeats encryption-at-rest separation — anyone
  // with that key (a leaked .env, a future log, a Vercel team
  // member) would be able to decrypt every bank detail. Security
  // audit C-4. Fallback only kept for dev / preview environments
  // where bank data is mock; in production this throws.
  const dedicated = process.env.PARTNER_PII_SECRET?.trim();
  if (dedicated) return dedicated;
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  if (isProd) {
    throw new Error(
      "PARTNER_PII_SECRET must be set in production and distinct from SUPABASE_SECRET_KEY",
    );
  }
  const fallback = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!fallback) {
    throw new Error("PARTNER_PII_SECRET (or SUPABASE_SECRET_KEY dev fallback) missing");
  }
  return fallback;
}

function derivedKey(): Buffer {
  const km = keyMaterial();
  // Salt is intentionally static so the same secret derives the same
  // key — we don't store per-row keys; we store per-row IVs.
  return scryptSync(km, "vyrek:partners:v1", 32);
}

export function encryptPii(plain: string): string {
  const key = derivedKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    ct.toString("base64url"),
    tag.toString("base64url"),
  ].join(":");
}

export function decryptPii(blob: string): string {
  const parts = blob.split(":");
  if (parts.length !== 3) throw new Error("malformed pii blob");
  const [ivB, ctB, tagB] = parts;
  const key = derivedKey();
  const decipher = createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivB, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB, "base64url")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

/**
 * Last-4-only preview for displaying bank details in UI without
 * decrypting (e.g. showing "•••• 1234" in the partner dashboard).
 * Stored as plaintext on a separate column so we don't decrypt on
 * every list render.
 */
export function lastFour(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}
