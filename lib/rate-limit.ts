import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Shared rate-limit helpers. Backed by Upstash Redis when
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are configured;
 * falls back to an in-memory map for local dev (single-process only,
 * does not scale across Vercel functions, intended only for dev).
 *
 * Each preset returns a `Ratelimit` instance you can call as
 *   const r = await limiters.partnerApply.limit(key);
 *   if (!r.success) return NextResponse.json(..., {status: 429});
 *
 * Keys: prefer `${endpoint}:${ip}:${email}` for per-IP+email throttling.
 * Falls back to `${endpoint}:${ip}` if you don't have an email.
 */

function redisOrNull(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// In-memory fallback for local dev. NOT scalable across processes.
type Bucket = { count: number; expiresAt: number };
const localBuckets = new Map<string, Bucket>();

function devLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = localBuckets.get(key);
  if (!b || b.expiresAt < now) {
    localBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }
  b.count++;
  return {
    success: b.count <= max,
    remaining: Math.max(0, max - b.count),
    reset: b.expiresAt,
  };
}

const r = redisOrNull();

function build(prefix: string, limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!r) {
    return {
      async limit(key: string) {
        const windowMs = parseWindowMs(window);
        return devLimit(`${prefix}:${key}`, limit, windowMs);
      },
    };
  }
  const rl = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
    analytics: false,
  });
  return {
    async limit(key: string) {
      const x = await rl.limit(key);
      return { success: x.success, remaining: x.remaining, reset: x.reset };
    },
  };
}

function parseWindowMs(w: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(w);
  if (!m) return 60_000;
  const n = Number(m[1]);
  const u = m[2];
  return n * (u === "s" ? 1000 : u === "m" ? 60_000 : u === "h" ? 3_600_000 : 86_400_000);
}

export const limiters = {
  // Public POST surfaces (most abusable)
  partnerApply: build("rl:p_apply", 5, "1 h"),
  consultation: build("rl:consult", 5, "1 h"),
  presencePing: build("rl:p_ping", 60, "1 m"),
  magicLink: build("rl:mlink", 5, "1 h"),
  newsletter: build("rl:news", 5, "1 h"),
  emailGateIp: build("rl:eg_ip", 20, "1 h"),
  emailGateEmail: build("rl:eg_em", 5, "1 h"),
  feedback: build("rl:fb", 20, "1 h"),
  partnerClick: build("rl:p_click", 60, "1 h"),
  // Suth Club waiting list. Unauthenticated and it sends an email (and a
  // text): without a throttle it is an open relay for bombing a victim's
  // inbox from our domain and burning send credit. The per-EMAIL cap is the
  // real victim-protection (re-sends to one address); the per-IP cap only
  // needs to stop machine-gun flooding, so it's set high enough that a busy
  // shared IP (mobile carrier / office NAT / an Instagram burst) doesn't trip
  // real people — the funnel is designed for exactly those bursts.
  clubWaitlistIp: build("rl:club_ip", 30, "1 h"),
  clubWaitlistEmail: build("rl:club_em", 3, "1 d"),
  // Authenticated surfaces (lighter throttle)
  accountCreate: build("rl:acct", 10, "1 h"),
  accountCreateIp: build("rl:acct_ip", 8, "1 d"),
  // Admin sending invites: generous enough for onboarding a whole client
  // roster in one sitting, tight enough that a runaway loop can't burn
  // SMS credit.
  adminInvite: build("rl:inv", 60, "1 h"),
} as const;

/** Pull an IP for keying. Falls back to "anon". */
export function requestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}
