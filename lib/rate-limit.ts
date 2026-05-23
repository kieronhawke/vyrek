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
  presencePing: build("rl:p_ping", 60, "1 m"),
  magicLink: build("rl:mlink", 5, "1 h"),
  newsletter: build("rl:news", 5, "1 h"),
  // Authenticated surfaces (lighter throttle)
  accountCreate: build("rl:acct", 10, "1 h"),
} as const;

/** Pull an IP for keying. Falls back to "anon". */
export function requestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}
