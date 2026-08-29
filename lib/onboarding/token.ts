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
   * The rate Ben agreed with THIS client, in pence per month. Existing
   * clients are on all sorts of grandfathered rates, so the public plan
   * price cannot be the only price.
   *
   * THIS IS WHY THE TOKEN IS SIGNED. Everything else in here is a
   * convenience — a name to greet them with, which step to start on. This is
   * money. An athlete who could edit it would set their own price, so it
   * travels inside the signed body, any change breaks the signature, and the
   * link stops resolving. Checkout reads the amount from the verified invite
   * and never from the request that asked for it.
   *
   * NAMED ONCE. `main` called this `amountPence` and `origin/main` called it
   * `customPence` (with a `customName` beside it); the two branches grew the
   * same feature independently. `amountPence` wins because it is the name the
   * live invite route, checkout route, activation and four test files already
   * use. `customName` is dropped rather than merged: Ben types a rate, not a
   * product name, and a label he never sets is a field that can only ever be
   * blank or wrong.
   */
  amountPence?: number;
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
  /**
   * The day the first payment should come out, as days since the epoch.
   *
   * Signed like the price, and for the same reason: between them these two
   * fields ARE the arrangement. A client who could move the date could take a
   * month of coaching before the first collection.
   *
   * A day number rather than a timestamp, because "the 1st" is a calendar
   * date and not an instant. Five characters in a link that goes out by SMS,
   * and it cannot drift across a timezone on the way. The instant is worked
   * out once, at checkout, in London — see start-date.ts.
   *
   * Absent means charge at checkout, which is what most of these are.
   */
  startDay?: number;
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
   * ⚠️ EMAIL AND PHONE ARE DELIBERATELY NOT IN HERE, AND PUTTING THEM BACK
   * IS A TRAP I ALREADY FELL INTO ONCE.
   *
   * They were 85 of the token's 170 characters. Taking them out has a real
   * cost: on the fallback path the account screen opens with an empty email
   * and the athlete has to type it, which is not the "nothing to retype"
   * experience the invite is supposed to give.
   *
   * So I put them back. That was worse. `lib/sms/send.ts` refuses any message
   * over three segments, and the longer token pushes a client with a long name
   * past that limit — meaning the invite text is silently never sent at all.
   * Trading "types their own email" for "never receives the link" is not a
   * trade. See `invite-cost.test.ts`, which exists because the first live
   * invite went out at three segments and 12.7p.
   *
   * The actual fix is neither: it is to configure `UPSTASH_REDIS_REST_URL` and
   * `UPSTASH_REDIS_REST_TOKEN`. With a store available the link carries a
   * ten-character id, the full payload lives in Redis, the text is one segment
   * AND nothing needs retyping. Without one, this token is the fallback and
   * short is the only thing it can afford to be.
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
    // Email stays OUT (see the warning above): putting it back pushes the
    // fallback SMS past three segments and the text silently never sends,
    // which is worse than the narrow double-charge gap it would close. The
    // short-id path (default when the store is up) already carries email,
    // so the already-subscribed guard works there. Signed tokens are only
    // the rare store-down fallback.
    k: payload.kind === "payment" ? "p" : "f",
    ...(payload.plan ? { l: payload.plan } : {}),
    // The agreed per-client rate. Six characters at most (£1000 = "a":100000)
    // and only present when Ben set one, so standard invites stay short.
    ...(payload.amountPence ? { a: payload.amountPence } : {}),
    // Only ever "b": athlete is the default, so spending a character to say
    // so would make every racing link longer for nothing.
    ...(payload.rail === "beginner" ? { r: "b" } : {}),
    // The first-payment date, days since epoch. Five characters, and only
    // present when Ben set one, so an invite that charges today is exactly
    // the length it was.
    ...(payload.startDay ? { s: payload.startDay } : {}),
    x: Math.floor(payload.exp / 86400),
  };
  const body = b64url(JSON.stringify(compact));
  return `${body}.${sign(body)}`;
}

export type InviteResult =
  | { ok: true; invite: InvitePayload }
  | { ok: false; reason: "malformed" | "tampered" | "expired" };

/**
 * A monthly rate that could plausibly be real: whole pence, within the band
 * declared in the model. Shared by the invite API (validating Ben's input)
 * and the token reader (refusing a nonsense value that somehow got signed).
 *
 * THE BOUNDS COME FROM ONE PLACE ON PURPOSE. `parsePrice` in model.ts read
 * Ben's typing against £1–£2,000 while this read the result against
 * £1–£1,000. A rate between the two — £1,500, an entirely legitimate figure —
 * parsed cleanly, then vanished here, and the invite went out priced at the
 * PUBLIC tier instead. Silently charging a different number from the one Ben
 * agreed is the worst failure this file has, so the two now cannot disagree.
 */
export function validAmountPence(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= CUSTOM_MIN_PENCE && n <= CUSTOM_MAX_PENCE;
}

/**
 * A first-payment day that could plausibly be real.
 *
 * Whole days since the epoch, somewhere between 2020 and 2100. Deliberately
 * loose: this is a sanity check on a decoded token, not the business rule.
 * WHAT BEN MAY PICK is decided by `startDateBlocker` in start-date.ts against
 * Stripe's own ceiling, and it is checked when the invite is CREATED so he
 * finds out — rather than here, weeks later, while a client is trying to pay.
 */
export function validStartDay(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 18262 && n <= 47482;
}

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
      // Not carried in the fallback token — see the note in the encoder. Read
      // anyway so a payload that came from the Redis store (which does keep
      // them) decodes identically.
      email: String(raw.e ?? raw.email ?? ""),
      phone: String(raw.p ?? raw.phone ?? ""),
      kind,
      ...(raw.l || raw.plan ? { plan: String(raw.l ?? raw.plan) } : {}),
      /* Coerced and bounds-checked on the way out, not trusted because it
         was signed. A signature proves nobody changed the value; it does not
         prove the value was sane when it was written.
         `c` is origin/main's spelling of the same field — read so a link
         minted on that branch still resolves; only `a` is ever written. */
      ...(validAmountPence(raw.a ?? raw.c ?? raw.amountPence)
        ? { amountPence: Number(raw.a ?? raw.c ?? raw.amountPence) }
        : {}),
      ...(raw.r === "b" || raw.rail === "beginner"
        ? { rail: "beginner" as const }
        : {}),
      /* Bounds-checked on the way out like the price is. A day number outside
         any plausible range means a mangled or hand-made token, and the safe
         reading of "I cannot tell when this should start" is to drop it and
         charge at checkout — never to guess a date and take money on it. */
      ...(validStartDay(raw.s ?? raw.startDay)
        ? { startDay: Number(raw.s ?? raw.startDay) }
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
