import { describe, it, expect } from "vitest";
import { limiters } from "./rate-limit";

/**
 * The in-memory fallback (used when Upstash isn't configured) is the one
 * go-live-critical module that had no coverage. These lock in that it actually
 * caps — within a single process — so a regression here is caught. (Across
 * Vercel instances the fallback still doesn't hold; that's why Upstash is a
 * launch blocker, not a code fix.)
 */
describe("rate-limit fallback caps", () => {
  it("allows exactly the consultation budget then blocks (per key)", async () => {
    // Unique per run so a real Redis backend (if ever configured) doesn't carry
    // state across runs within the window.
    const key = `test-consult-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await limiters.consultation.limit(key);
      results.push(r.success);
    }
    // consultation is 5 / hour
    expect(results.slice(0, 5).every(Boolean)).toBe(true);
    expect(results[5]).toBe(false);
    expect(results[6]).toBe(false);
  });

  it("keys are independent — a blocked key doesn't block another", async () => {
    const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const a = `iso-a-${run}`;
    const b = `iso-b-${run}`;
    for (let i = 0; i < 6; i++) await limiters.consultation.limit(a);
    const blockedA = await limiters.consultation.limit(a);
    const freshB = await limiters.consultation.limit(b);
    expect(blockedA.success).toBe(false);
    expect(freshB.success).toBe(true);
  });
});
