/**
 * Active-athlete stats used in social proof. Pre-launch: deterministic
 * synthesised values floored at 100 (per brief §25). Phase 2 will swap
 * this for a Supabase count once we have real subscribers.
 */

export type ActiveStats = {
  active: number;
  trial: number;
  last_24h: number;
};

const FLOOR = 100;
const PRE_LAUNCH_BASE = 327;
const LAUNCH_REFERENCE = new Date("2026-05-01").getTime();

export function getActiveStats(): ActiveStats {
  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - LAUNCH_REFERENCE) / 86_400_000),
  );
  const active = Math.max(FLOOR, PRE_LAUNCH_BASE + daysSince * 2);
  return {
    active,
    trial: Math.floor(active * 0.15),
    last_24h: Math.floor(active * 0.08),
  };
}
