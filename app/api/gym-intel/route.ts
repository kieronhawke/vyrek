import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { gymKey, isStationId } from "@/lib/gym-intel/types";

/**
 * Athlete-reported equipment, write side.
 *
 * Writes to Redis; the pages read a snapshot file built from it. See
 * lib/gym-intel/snapshot.ts for why the two are separate.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * No accounts, no email, no personal data. The contribution is one tap and the
 * only thing stored is a counter — which means there is nothing here worth
 * breaching, and nothing to handle under GDPR beyond the rate-limit key.
 *
 * The rate-limit key is a truncated hash of the IP, never the IP itself, and
 * it expires. Enough to stop one person voting a hundred times without keeping
 * a record of who visited which gym page.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_SECONDS = 60 * 60;
/** Per IP per hour. Generous for an honest contributor, useless for stuffing. */
const MAX_PER_WINDOW = 20;

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function hashed(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`gym-intel:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  const db = redis();
  if (!db) {
    // Unconfigured must not read as the visitor's failure, and must not read
    // as success either.
    return NextResponse.json(
      { ok: false, reason: "not-configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-json" }, { status: 400 });
  }

  const { place, gym, station, present } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof place !== "string" ||
    typeof gym !== "string" ||
    typeof station !== "string" ||
    typeof present !== "boolean" ||
    !isStationId(station) ||
    place.length > 80 ||
    gym.length > 120
  ) {
    return NextResponse.json({ ok: false, reason: "bad-input" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlKey = `gym-intel:rl:${await hashed(ip)}`;
  const count = await db.incr(rlKey);
  if (count === 1) await db.expire(rlKey, WINDOW_SECONDS);
  if (count > MAX_PER_WINDOW) {
    return NextResponse.json({ ok: false, reason: "rate-limited" }, { status: 429 });
  }

  const field = `${gymKey(gym)}:${station}:${present ? "yes" : "no"}`;
  await db.hincrby(`gym-intel:${place}`, field, 1);
  await db.sadd("gym-intel:places", place);

  return NextResponse.json({ ok: true });
}
