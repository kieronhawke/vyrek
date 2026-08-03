import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { InvitePayload } from "./token";

/**
 * SHORT INVITE LINKS.
 *
 * The signed token carries the whole invite inside the URL — name, email,
 * phone, plan, both timestamps and a signature. That is a genuinely good
 * mechanism when there is nowhere to put the data, and it produced a link
 * **280 characters long**:
 *
 *   https://www.suthperformance.com/o/eyJuYW1lIjoiS2llcm9uIEhhd2tlIiwiZW1haWwi…
 *
 * That is not a link you send somebody. It wraps four times in a text message,
 * looks like a phishing attempt, and costs multiple SMS segments every time
 * Ben invites anybody.
 *
 * So the payload goes in Redis under a short random id and only the id travels:
 *
 *   https://www.suthperformance.com/o/k7m2xq9raf        ← 44 characters
 *
 * TEN CHARACTERS OF BASE32 is 50 bits of entropy. An attacker guessing at a
 * thousand attempts a second would need, on average, longer than the invite's
 * lifetime by many orders of magnitude — and a hit would reveal one person's
 * name and email, not an account, because the flow still makes them set a
 * password before anything is charged.
 *
 * The alphabet excludes the characters people misread aloud (I, L, O, U, 0, 1),
 * because Ben does read these out on the phone.
 *
 * FALLING BACK IS NOT OPTIONAL. Without Redis configured there is nowhere to
 * put the payload, and an invite that cannot be created is worse than a long
 * one — so the caller falls back to the signed token and says so. Both forms
 * are readable for ever, which also means every link already in somebody's
 * messages keeps working.
 */

/** No I, L, O, U, 0 or 1 — the ones misheard when a link is read aloud. */
const ALPHABET = "abcdefghjkmnpqrstvwxyz23456789";
const ID_LENGTH = 10;

export function newInviteId(): string {
  // Rejection-free: 30 characters divides 240 evenly, so masking to 0–239
  // and taking modulo 30 keeps every symbol equally likely.
  const bytes = randomBytes(ID_LENGTH * 2);
  let id = "";
  for (let i = 0; id.length < ID_LENGTH && i < bytes.length; i++) {
    if (bytes[i] >= 240) continue;
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  // Astronomically unlikely, but a short id is not worth a crash.
  while (id.length < ID_LENGTH) id += ALPHABET[randomBytes(1)[0] % ALPHABET.length];
  return id;
}

/** A short id is exactly the shape we mint; anything else is a signed token. */
export function looksLikeInviteId(value: string): boolean {
  return value.length === ID_LENGTH && [...value].every((c) => ALPHABET.includes(c));
}

const KEY_PREFIX = "invite:";

function redisOrNull(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Local development only. Single process, lost on restart — which is fine for
 * a developer clicking their own invite and useless for anything else, so it
 * is never reported as durable storage.
 */
const devStore = new Map<string, { payload: InvitePayload; expiresAt: number }>();

export type StoreResult =
  | { ok: true; id: string; durable: boolean }
  | { ok: false; reason: "STORE_FAILED" };

/** Store an invite and return the id that goes in the link. */
export async function storeInvite(payload: InvitePayload): Promise<StoreResult> {
  const id = newInviteId();
  // Redis expires it for us, so a stale invite cannot be resurrected even if
  // the signature check were ever relaxed. One hour of slack absorbs clock
  // skew between the browser that made it and the server that reads it.
  const ttlSeconds = Math.max(60, payload.exp - Math.floor(Date.now() / 1000) + 3600);

  const redis = redisOrNull();
  if (!redis) {
    devStore.set(id, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
    return { ok: true, id, durable: false };
  }

  try {
    await redis.set(KEY_PREFIX + id, JSON.stringify(payload), { ex: ttlSeconds });
    return { ok: true, id, durable: true };
  } catch {
    // Redis is configured but unreachable. Say so rather than handing back an
    // id that resolves to nothing when the athlete opens it.
    return { ok: false, reason: "STORE_FAILED" };
  }
}

/** Resolve a short id back to its invite. Null when unknown or expired. */
export async function loadInvite(id: string): Promise<InvitePayload | null> {
  if (!looksLikeInviteId(id)) return null;

  const redis = redisOrNull();
  if (!redis) {
    const hit = devStore.get(id);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) { devStore.delete(id); return null; }
    return hit.payload;
  }

  try {
    const raw = await redis.get<string | InvitePayload>(KEY_PREFIX + id);
    if (!raw) return null;
    // Upstash parses JSON automatically when it can, so accept either shape
    // rather than assuming — a double-parse throws and loses the invite.
    return typeof raw === "string" ? (JSON.parse(raw) as InvitePayload) : raw;
  } catch {
    return null;
  }
}

/** True when invites will survive a deploy, for the admin to report honestly. */
export function inviteStoreDurable(): boolean {
  return redisOrNull() !== null;
}

/** Exposed for tests, which must not leak state between cases. */
export function __clearDevStore(): void {
  devStore.clear();
}
