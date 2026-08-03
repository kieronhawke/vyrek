import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * THE INVITE, CARRIED IN THE LINK.
 *
 * WHY THE LINK HOLDS THE DATA
 * ---------------------------
 * There is no database behind the admin. Ben creates an invite in his browser
 * and the athlete opens it on their phone, possibly days later, on the other
 * side of the country. Nothing shared exists between those two moments.
 *
 * So the invite travels inside the URL: who it is for, what kind it is, when
 * it expires — signed with HMAC-SHA256 so it cannot be edited. An athlete
 * cannot change their own name, cannot give themselves a different plan, and
 * cannot extend the expiry, because any change breaks the signature.
 *
 * This is a real mechanism, not a placeholder. When a database arrives the
 * token becomes an opaque id and this file shrinks; until then it is what
 * makes the link genuinely work rather than genuinely pretend to.
 *
 * WHAT IT IS NOT
 * Not a session and not authentication. It proves the link came from Ben. It
 * says nothing about who is holding the phone, which is why the flow still
 * asks them to set a password or sign in with Google before anything is
 * charged.
 */

export type InviteKind = "full" | "payment";

export type InvitePayload = {
  /** Who it is for. Shown to them, and pre-filled so they do not retype it. */
  name: string;
  email: string;
  phone: string;
  /** "full" walks the whole flow; "payment" goes straight to choosing a plan. */
  kind: InviteKind;
  /** Suggested plan, when Ben has already agreed one. */
  plan?: string;
  /** Issued at, epoch seconds. */
  iat: number;
  /** Expires at, epoch seconds. */
  exp: number;
};

/**
 * The signing secret.
 *
 * Falls back to a build-time constant only when nothing is configured, and
 * `signingConfigured()` reports that honestly so the admin can say "this link
 * is not secured" rather than implying it is.
 */
const FALLBACK = "suth-onboarding-unsigned-development-only";

function secret(): string {
  return (
    process.env.ONBOARDING_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    FALLBACK
  );
}

export function signingConfigured(): boolean {
  return secret() !== FALLBACK;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", secret()).update(body).digest());
}

/** How long an invite is good for. Long enough to forget, short enough to expire. */
export const INVITE_DAYS = 30;

export function createInvite(
  fields: Omit<InvitePayload, "iat" | "exp">,
  now = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  const payload: InvitePayload = {
    ...fields,
    iat,
    exp: iat + INVITE_DAYS * 86400,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export type InviteResult =
  | { ok: true; invite: InvitePayload }
  | { ok: false; reason: "malformed" | "tampered" | "expired" };

/**
 * Read a token back, or say precisely why not.
 *
 * The three failures are different things to a person holding a phone: a
 * mangled link (copied badly out of a text message), a tampered one, and one
 * that has simply run out. Collapsing them into "invalid link" leaves somebody
 * stuck with no idea whether to ask Ben for a new one.
 */
export function readInvite(token: string, now = Date.now()): InviteResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" };
  }

  const [body, signature] = parts;
  const expected = sign(body);
  // Compared in constant time. A byte-by-byte comparison leaks how much of a
  // forged signature was right, which is enough to build one.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "tampered" };
  }

  let invite: InvitePayload;
  try {
    invite = JSON.parse(unb64url(body).toString("utf8")) as InvitePayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (
    typeof invite?.email !== "string" ||
    typeof invite?.name !== "string" ||
    (invite.kind !== "full" && invite.kind !== "payment")
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (!invite.exp || invite.exp * 1000 < now) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, invite };
}

/** The link Ben sends. */
export function inviteUrl(token: string, base: string): string {
  return `${base.replace(/\/$/, "")}/onboarding/${token}`;
}
