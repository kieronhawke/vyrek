import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvite, readInvite } from "./token";
import { resolveInvite } from "./resolve";
import { __clearDevStore, storeInvite } from "./invite-store";
import { DUE_TODAY_MAX_PENCE } from "./schedule";

/**
 * CARRYING A BALANCE OWED TODAY IN THE LINK.
 *
 * It is money, so it gets the same treatment as the rate: signed so the
 * holder cannot edit it, bounds-checked on the way out because a signature
 * proves nobody changed a value and nothing about whether it was sane, and
 * absent — not zero — when nothing is owed, so an ordinary link is exactly
 * the length it was.
 */

const base = {
  name: "Sam Reeves",
  email: "",
  phone: "",
  kind: "payment" as const,
  amountPence: 6000,
};

describe("the signed token", () => {
  it("round-trips a balance beside the rate and the date", () => {
    const token = createInvite({ ...base, dueTodayPence: 10000, startDay: 20700 });
    const read = readInvite(token);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.invite.amountPence).toBe(6000);
    expect(read.invite.dueTodayPence).toBe(10000);
    expect(read.invite.startDay).toBe(20700);
  });

  it("does not lengthen a link that carries no balance", () => {
    const without = createInvite(base);
    const explicitZero = createInvite({ ...base, dueTodayPence: 0 });
    expect(explicitZero.length).toBe(without.length);
    const read = readInvite(without);
    expect(read.ok && read.invite.dueTodayPence).toBeUndefined();
  });

  it("refuses a token whose balance has been edited", () => {
    const token = createInvite({ ...base, dueTodayPence: 10000 });
    const [body, sig] = token.split(".");
    const json = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
    expect(json).toContain('"d":10000');
    const edited = Buffer.from(json.replace('"d":10000', '"d":100'))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const read = readInvite(`${edited}.${sig}`);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toBe("tampered");
  });

  it("drops an implausible balance even though it verifies", () => {
    for (const bad of [0, 1, 99, DUE_TODAY_MAX_PENCE + 1, -5, 12.5]) {
      const token = createInvite({ ...base, dueTodayPence: bad as number });
      const read = readInvite(token);
      expect(read.ok).toBe(true);
      if (read.ok) expect(read.invite.dueTodayPence, String(bad)).toBeUndefined();
    }
  });

  it("accepts the whole band", () => {
    for (const pence of [100, 10000, 250000, DUE_TODAY_MAX_PENCE]) {
      const read = readInvite(createInvite({ ...base, dueTodayPence: pence }));
      expect(read.ok && read.invite.dueTodayPence).toBe(pence);
    }
  });
});

describe("the stored invite", () => {
  const env = { ...process.env };
  beforeEach(() => {
    /* No database in unit tests: the store falls back to its in-memory map,
       which is enough to prove the resolver applies the same bounds to a
       stored payload as the token reader applies to a signed one. */
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    __clearDevStore();
  });
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  const exp = Math.floor(Date.now() / 1000) + 86400;

  it("resolves a balance that is in band", async () => {
    const stored = await storeInvite({ ...base, dueTodayPence: 10000, iat: 0, exp });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const read = await resolveInvite(stored.id);
    expect(read.ok && read.invite.dueTodayPence).toBe(10000);
  });

  it("drops a balance that is out of band, exactly as the token reader does", async () => {
    const stored = await storeInvite({ ...base, dueTodayPence: 9_999_999, iat: 0, exp });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    const read = await resolveInvite(stored.id);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.invite.dueTodayPence).toBeUndefined();
      // The rate beside it is untouched.
      expect(read.invite.amountPence).toBe(6000);
    }
  });
});
