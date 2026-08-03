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
/** The browsable list. Records are keyed individually; this orders them. */
const INDEX_KEY = "suth:leads:index";
const INDEX_MAX = 500;

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
    // The index is a separate write and deliberately not transactional: if
    // it fails the lead is still readable from the link in the text, which
    // is the delivery that actually matters. A lead missing from a list is
    // recoverable; a lead that cannot be opened at all is not.
    try {
      await redis.lpush(INDEX_KEY, lead.id);
      await redis.ltrim(INDEX_KEY, 0, INDEX_MAX - 1);
    } catch {
      /* see above */
    }
    return true;
  } catch {
    // The email and the text still go out with everything in them. A
    // storage failure must not swallow the lead itself.
    return false;
  }
}

/**
 * Recent leads, newest first, for the admin list.
 *
 * Reads the index then fetches each record, rather than keeping a second
 * copy of every lead inside one big list value. Records expire on their own
 * ninety-day TTL, so the index outlives some of them — the misses are
 * filtered out here rather than left as holes in the page.
 */
export async function recentLeads(limit = 100): Promise<Lead[]> {
  const redis = redisOrNull();
  if (!redis) {
    return [...memory.values()]
      .sort((a, b) => b.createdISO.localeCompare(a.createdISO))
      .slice(0, limit);
  }
  try {
    const ids = await redis.lrange<string>(INDEX_KEY, 0, limit - 1);
    if (!ids.length) return [];
    const records = await Promise.all(ids.map((id) => getLead(id)));
    return records.filter((l): l is Lead => l !== null);
  } catch {
    return [];
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
