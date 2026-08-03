import { Redis } from "@upstash/redis";
import type { Lead } from "@/lib/leads/model";

/**
 * WHERE A LEAD LIVES SO THE TEXT MESSAGE HAS SOMETHING TO OPEN.
 *
 * Same Redis-or-memory arrangement as the booking diary and the invite
 * store, for the same reason: one storage story in this codebase, and a
 * local dev experience that works without provisioning anything.
 *
 * THEY EXPIRE. Ninety days, set as a Redis TTL rather than a cleanup job.
 * The record exists so Ben can open it from his phone in the hour after it
 * arrives; keeping somebody's injury history in a key-value store for ever
 * because nobody wrote the deletion code is how data-minimisation promises
 * quietly become untrue. After that the lead lives in the admin database
 * and the email, both of which are access-controlled.
 */

const TTL_SECONDS = 90 * 24 * 60 * 60;
const key = (id: string) => `suth:lead:${id}`;

function redisOrNull(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function leadStoreReady(): boolean {
  return redisOrNull() !== null;
}

/**
 * Dev fallback. Lost on restart, and that is understood.
 *
 * ON globalThis, not module scope. Next.js compiles route handlers and page
 * components into separate module graphs, so a module-level Map is two
 * Maps: the enquiry endpoint wrote to one and the lead page read from the
 * other, and every link 404'd in development while looking correct in
 * production. Same pattern as the usual dev database singleton.
 */
const memory: Map<string, Lead> = ((globalThis as unknown as {
  __suthLeads?: Map<string, Lead>;
}).__suthLeads ??= new Map<string, Lead>());

export async function saveLead(lead: Lead): Promise<boolean> {
  const redis = redisOrNull();
  if (!redis) {
    memory.set(lead.id, lead);
    return true;
  }
  try {
    await redis.set(key(lead.id), lead, { ex: TTL_SECONDS });
    return true;
  } catch {
    // The email and the text still go out with everything in them. A
    // storage failure must not swallow the lead itself.
    return false;
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  const redis = redisOrNull();
  if (!redis) return memory.get(id) ?? null;
  try {
    return (await redis.get<Lead>(key(id))) ?? null;
  } catch {
    return null;
  }
}
