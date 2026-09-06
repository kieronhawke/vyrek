import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * INVITES FOR TESTS, WITHOUT GOING THROUGH THE ADMIN API.
 *
 * `/api/onboarding/invite` is admin-gated — it sends real email, real SMS and
 * mints a real payment link — so an unauthenticated test gets 401. The specs
 * were written before that gate and still asked the endpoint for a link, so
 * `body.link` came back undefined, every token was the string "undefined",
 * and twenty-two tests failed on a page reading "This link looks incomplete".
 * That looks exactly like a broken product and is not, which is the worst
 * kind of failing test: it hides the real regressions underneath it.
 *
 * Writing the row directly gives the same link the client would receive,
 * needs no admin session, and sends nobody a text.
 */

/** No I, L, O, U, 0 or 1 — mirrors lib/onboarding/invite-store.ts. */
const ALPHABET = "abcdefghjkmnpqrstvwxyz23456789";

/**
 * Playwright does not load .env.local — Next does that for the server under
 * test, not for this process. Cheaper than a dotenv dependency for two keys.
 */
export function env(key: string): string {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} is not in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

export function db(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}

export function newInviteId(): string {
  const bytes = randomBytes(20);
  let id = "";
  for (let i = 0; id.length < 10 && i < bytes.length; i++) {
    if (bytes[i] >= 240) continue;
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  while (id.length < 10) id += ALPHABET[randomBytes(1)[0] % ALPHABET.length];
  return id;
}

/** A unique address per run, so a leftover account cannot make a test pass. */
export function freshEmail(tag = "test"): string {
  return `kieron.hawke+${tag}-${randomBytes(4).toString("hex")}@googlemail.com`;
}

export type InviteOverrides = {
  name?: string;
  email?: string;
  phone?: string;
  kind?: "full" | "payment";
  plan?: string;
  amountPence?: number;
  dueTodayPence?: number;
  startDay?: number;
  rail?: string;
};

/** Writes a real invite row and returns the id that goes in the link. */
export async function mintInvite(over: InviteOverrides = {}): Promise<string> {
  const id = newInviteId();
  const now = Math.floor(Date.now() / 1000);
  const { error } = await db()
    .from("onboarding_invites")
    .insert({
      id,
      expires_at: new Date(Date.now() + 31 * 86400 * 1000).toISOString(),
      payload: {
        name: "Sam Reeves",
        email: "sam@example.com",
        phone: "07700900001",
        kind: "full",
        iat: now,
        exp: now + 30 * 86400,
        ...over,
      },
    });
  if (error) throw new Error(`could not mint an invite: ${error.message}`);
  return id;
}

/**
 * Removes the invite and anything the journey created under `email`.
 *
 * Tests that walk as far as the details step create a real Supabase auth
 * user, so leaving them behind would fill the auth store with junk and, worse,
 * let the next run's "already registered" branch fire and pass for the wrong
 * reason.
 */
export async function cleanUpInvite(inviteId: string, email?: string) {
  const sb = db();
  if (inviteId) await sb.from("onboarding_invites").delete().eq("id", inviteId);
  if (!email) return;

  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return;

  const { data: customer } = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (customer) {
    await sb.from("subscriptions").delete().eq("customer_id", customer.id);
    await sb.from("customers").delete().eq("id", customer.id);
  }
  await sb.auth.admin.deleteUser(user.id);
}
