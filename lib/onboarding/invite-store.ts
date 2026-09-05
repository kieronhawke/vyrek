import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
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


function dbConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
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

  if (!dbConfigured()) {
    devStore.set(id, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
    return { ok: true, id, durable: false };
  }

  try {
    const { error } = await supabaseAdmin().from("onboarding_invites").insert({
      id,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      payload,
    });
    if (error) {
      console.error("[invite-store] insert failed", error.message);
      return { ok: false, reason: "STORE_FAILED" };
    }
    return { ok: true, id, durable: true };
  } catch {
    // Configured but unreachable. Say so rather than handing back an id that
    // resolves to nothing when the athlete opens it.
    return { ok: false, reason: "STORE_FAILED" };
  }
}

/** Resolve a short id back to its invite. Null when unknown or expired. */
export type StoredInvite = {
  id: string;
  createdISO: string;
  expiresISO: string;
  openedISO: string | null;
  payload: InvitePayload;
};

/**
 * First open only: `.is("opened_at", null)` makes later opens no-ops, so the
 * timestamp always answers "when did they first look at it". Failure is
 * swallowed — tracking must never be the reason a link doesn't open.
 */
export async function markInviteOpened(id: string): Promise<void> {
  if (!looksLikeInviteId(id) || !dbConfigured()) return;
  try {
    await supabaseAdmin()
      .from("onboarding_invites")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", id)
      .is("opened_at", null);
  } catch {
    /* The invite still opens; it just isn't recorded. */
  }
}

/**
 * Newest first, for the admin's "who have I sent links to" list. Includes
 * expired rows the sweep hasn't reached — the admin wants to see that an
 * invite ran out, not have it vanish.
 */
export async function recentInvites(limit = 50): Promise<StoredInvite[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("onboarding_invites")
      .select("id, created_at, expires_at, opened_at, payload")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      createdISO: r.created_at as string,
      expiresISO: r.expires_at as string,
      openedISO: (r.opened_at as string | null) ?? null,
      payload: r.payload as InvitePayload,
    }));
  } catch {
    return [];
  }
}

export async function loadInvite(id: string): Promise<InvitePayload | null> {
  if (!looksLikeInviteId(id)) return null;

  if (!dbConfigured()) {
    const hit = devStore.get(id);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) { devStore.delete(id); return null; }
    return hit.payload;
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("onboarding_invites")
      .select("payload, expires_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    // Expiry is checked here, not only by the sweep. Redis deleted the row
    // itself; Postgres does not, so an unswept row must still be refused
    // rather than merely untidy.
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.payload as InvitePayload;
  } catch {
    return null;
  }
}

/**
 * Cancel a sent link.
 *
 * Ben reviewed it, sent it, and then spotted the wrong figure — or the client
 * rang to say the date should be the 15th. The row goes; the link resolves to
 * "expired", which is the message that tells the client to ask Ben for a new
 * one, and Ben sends the corrected link from the same form. A signed-token
 * fallback link cannot be cancelled this way because nothing stores it; the
 * admin says so rather than offering a button that does nothing.
 *
 * Returns whether a row was actually removed.
 */
export async function deleteInvite(id: string): Promise<boolean> {
  if (!looksLikeInviteId(id)) return false;
  if (!dbConfigured()) return devStore.delete(id);
  try {
    const { data, error } = await supabaseAdmin()
      .from("onboarding_invites")
      .delete()
      .eq("id", id)
      .select("id");
    return !error && Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

/**
 * Delete invites past their expiry.
 *
 * Redis did this for us. Called by the nightly cron in
 * app/api/cron/housekeeping.
 */
export async function expireOldInvites(): Promise<number> {
  if (!dbConfigured()) return 0;
  try {
    const { data, error } = await supabaseAdmin()
      .from("onboarding_invites")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");
    return error || !data ? 0 : data.length;
  } catch {
    return 0;
  }
}

/** True when invites will survive a deploy, for the admin to report honestly. */
export function inviteStoreDurable(): boolean {
  return dbConfigured();
}

/** Exposed for tests, which must not leak state between cases. */
export function __clearDevStore(): void {
  devStore.clear();
}
