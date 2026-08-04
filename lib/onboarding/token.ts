import { createHmac, timingSafeEqual } from "node:crypto";
import { CUSTOM_MAX_PENCE, CUSTOM_MIN_PENCE } from "./model";

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
  /**
   * A monthly price agreed with this person, in pence.
   *
   * THIS IS WHY THE TOKEN IS SIGNED. Everything else in here is a
   * convenience — a name to greet them with, which step to start on. This is
   * money. An athlete who could edit it would set their own price, so it
   * travels inside the signed body and any change to it breaks the
   * signature and the link stops resolving. Checkout reads the amount from
   * the verified invite and never from the request that asked for it.
   */
  customPence?: number;
  /** What Ben calls the agreed plan on their screen. */
  customName?: string;
  /**
   * Which route they came in on, so onboarding can ask the right questions.
   *
   * One character in the link, and it fixes a real hole: somebody who came
   * down the "getting fit" rail — a quiz that deliberately never says HYROX
   * — was then sent a setup link whose first real question was "My first
   * HYROX / A few races in / Experienced". All that care, undone at the
   * moment they actually become a client.
   */
  rail?: "beginner" | "athlete";
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

/**
 * THE TOKEN IS IN A TEXT MESSAGE, SO ITS LENGTH IS MONEY.
 *
 * The first live invite went out as THREE segments and cost 12.7p, because a
 * readable JSON payload plus a full-length signature is 215 characters before
 * the domain is even added. Worse, lib/sms/send.ts refuses anything over three
 * segments — so a client with a longer name than Kieron's would have received
 * no text at all, silently, and nobody would have known why.
 *
 * Two changes, both safe:
 *
 * 1. SINGLE-LETTER KEYS. `{"name":…,"email":…}` becomes `{"n":…,"e":…}`. No
 *    information is lost; it is a wire format, not something a human reads.
 *
 * 2. A 128-BIT SIGNATURE instead of 256. Truncating an HMAC is explicitly
 *    sanctioned (RFC 2104 §5, NIST SP 800-107), and 128 bits is far beyond
 *    forgeable for a link that expires in thirty days. It saves 22 characters.
 *
 * Together with a shorter path and tighter copy that is two segments rather
 * than three — a third off every invite Ben ever sends.
 *
 * OLD TOKENS STILL WORK. `readInvite` accepts both the long and short field
 * names and both signature lengths, so links already sent do not break.
 */
const SIG_BYTES = 16;

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
  return b64url(createHmac("sha256", secret()).update(body).digest().subarray(0, SIG_BYTES));
}

/** The pre-shortening signature, so links already sent still verify. */
function signLegacy(body: string): string {
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
  /**
   * ONLY WHAT THE LINK ACTUALLY NEEDS.
   *
   * The email and phone were in here so the first screen could pre-fill them,
   * and together they were 85 of the token's 170 characters — half the length
   * of a text message, spent on two fields the athlete is perfectly capable of
   * typing and arguably ought to confirm anyway. They come out.
   *
   * The name stays but only the first: "Kieron" is what the screen greets
   * them with, and their surname adds nothing but characters.
   *
   * The expiry is in DAYS since epoch rather than seconds — five digits
   * instead of ten, for a link that lives thirty days and has never needed
   * second precision. `iat` goes entirely; nothing reads it.
   */
  const compact = {
    n: payload.name.trim().split(/\s+/)[0],
    k: payload.kind === "payment" ? "p" : "f",
    ...(payload.plan ? { l: payload.plan } : {}),
    // Only ever "b": athlete is the default, so spending a character to say
    // so would make every racing link longer for nothing.
    ...(payload.rail === "beginner" ? { r: "b" } : {}),
    /* Only present when Ben agreed a price, so every ordinary invite stays
       exactly the length it was — these links go out by SMS and characters
       are money. */
    ...(payload.customPence ? { c: payload.customPence } : {}),
    ...(payload.customPence && payload.customName
      ? { cn: payload.customName.slice(0, 40) }
      : {}),
    x: Math.floor(payload.exp / 86400),
  };
  const body = b64url(JSON.stringify(compact));
  return `${body}.${sign(body)}`;
}

/**
 * An agreed price, or nothing.
 *
 * Bounded rather than merely parsed. A signature proves nobody edited the
 * number in transit; it does not prove the number was sensible when Ben
 * typed it, and a token minted with a stray extra digit would otherwise
 * present somebody with a £15,000 monthly plan.
 */
function readPence(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  /* The same bounds the admin form enforces, imported rather than repeated —
     two copies of a money limit drift, and the half that drifts is whichever
     one nobody remembered was there. */
  if (n < CUSTOM_MIN_PENCE || n > CUSTOM_MAX_PENCE) return null;
  return n;
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
  // Compared in constant time. A byte-by-byte comparison leaks how much of a
  // forged signature was right, which is enough to build one.
  const matches = (expected: string) => {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  // Both lengths accepted, so links sent before the token was shortened do
  // not suddenly stop working in somebody's messages.
  if (!matches(sign(body)) && !matches(signLegacy(body))) {
    return { ok: false, reason: "tampered" };
  }

  let invite: InvitePayload;
  try {
    const raw = JSON.parse(unb64url(body).toString("utf8")) as Record<string, unknown>;

    // `k` is "f"/"p" now and was "full"/"payment" before; both are read so
    // links already in somebody's messages keep working.
    const k = String(raw.k ?? raw.kind ?? "");
    const kind: InviteKind = k === "p" || k === "payment" ? "payment" : "full";

    // The expiry is in days now and was in seconds. Anything below a million
    // is a day count — seconds passed that mark in 1970.
    const rawExp = Number(raw.x ?? raw.exp ?? 0);
    const exp = rawExp > 0 && rawExp < 1_000_000 ? rawExp * 86400 : rawExp;

    invite = {
      name: String(raw.n ?? raw.name ?? ""),
      // No longer carried in the link. Ben has them; the athlete confirms
      // their own email on the account step.
      email: String(raw.e ?? raw.email ?? ""),
      phone: String(raw.p ?? raw.phone ?? ""),
      kind,
      ...(raw.l || raw.plan ? { plan: String(raw.l ?? raw.plan) } : {}),
      ...(raw.r === "b" || raw.rail === "beginner"
        ? { rail: "beginner" as const }
        : {}),
      /* Coerced and bounds-checked on the way out, not trusted because it
         was signed. A signature proves nobody changed the value; it does not
         prove the value was sane when it was written. */
      ...(readPence(raw.c ?? raw.customPence)
        ? { customPence: readPence(raw.c ?? raw.customPence)! }
        : {}),
      ...(raw.cn || raw.customName
        ? { customName: String(raw.cn ?? raw.customName).slice(0, 40) }
        : {}),
      iat: Number(raw.i ?? raw.iat ?? 0),
      exp,
    };
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

/**
 * The link Ben sends.
 *
 * `/o/` rather than `/onboarding/`: eleven characters he pays for on every
 * single invite, and inside an SMS those characters are money. The long path
 * still serves the same screen for links already sent.
 */
export function inviteUrl(token: string, base: string): string {
  return `${base.replace(/\/$/, "")}/o/${token}`;
}

/**
 * The same link, stripped for a text message.
 *
 * "https://www." is twelve characters that every phone adds back for free:
 * messaging apps link a bare domain, and the apex redirects to www anyway. In
 * an SMS those twelve characters are billed on every invite Ben ever sends.
 */
export function inviteUrlForSms(token: string, base: string): string {
  return inviteUrl(token, base).replace(/^https?:\/\/(www\.)?/, "");
}
