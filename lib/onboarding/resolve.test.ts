import { describe, it, expect, beforeEach } from "vitest";
import { resolveInvite } from "./resolve";
import { storeInvite, newInviteId, __clearDevStore } from "./invite-store";
import { createInvite } from "./token";
import type { InvitePayload } from "./token";

const base = {
  name: "Kieron Hawke",
  email: "kieron@example.com",
  phone: "+447700900123",
  kind: "full" as const,
  plan: "coaching",
};

beforeEach(() => __clearDevStore());

describe("resolveInvite", () => {
  it("resolves a short id", async () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: InvitePayload = { ...base, iat: now, exp: now + 86400 };
    const stored = await storeInvite(payload);
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;

    const result = await resolveInvite(stored.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.invite.email).toBe("kieron@example.com");
  });

  it("still resolves a signed token already sitting in somebody's messages", async () => {
    // The whole point of keeping both forms: an athlete invited last week must
    // not meet an error page because we changed how links are made.
    const token = createInvite(base);
    const result = await resolveInvite(token);
    expect(result.ok).toBe(true);
    // The token carries the first name only — the surname was dropped to save
    // characters, and the screen only ever greets them by it.
    if (result.ok) expect(result.invite.name).toBe("Kieron");
  });

  it("the short form keeps what the token had to drop", async () => {
    /*
     * A real difference between the two, worth pinning.
     *
     * The token dropped email and phone because together they were half the
     * length of a text message. The stored form has no such pressure — only
     * the id travels — so it keeps them, and the first screen can pre-fill
     * both instead of asking somebody to retype an address Ben already has.
     */
    const now = Math.floor(Date.now() / 1000);
    const stored = await storeInvite({ ...base, iat: now, exp: now + 86400 });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;

    const viaId = await resolveInvite(stored.id);
    const viaToken = await resolveInvite(createInvite(base));

    expect(viaId.ok && viaId.invite.email).toBe("kieron@example.com");
    expect(viaId.ok && viaId.invite.phone).toBe("+447700900123");
    expect(viaToken.ok && viaToken.invite.email).toBe("");
  });

  it("calls an unknown short id expired, not tampered", async () => {
    // Nothing was forged — it has been used up or mistyped, and "expired" is
    // the message that tells somebody to ask for a new one.
    const result = await resolveInvite(newInviteId());
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("enforces expiry on the payload, not just the store's TTL", async () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    const stored = await storeInvite({ ...base, iat: past - 10, exp: past });
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    // Redis TTL has a floor, so this row is still present. The resolver must
    // refuse it anyway: expiry is authorisation, not cleanup.
    await expect(resolveInvite(stored.id)).resolves.toEqual({ ok: false, reason: "expired" });
  });

  it("reports a mangled token as malformed", async () => {
    await expect(resolveInvite("not-a-token")).resolves.toEqual({ ok: false, reason: "malformed" });
  });

  it("reports a forged signature as tampered", async () => {
    const token = createInvite(base);
    const forged = `${token.split(".")[0]}.aaaaaaaaaaaaaaaa`;
    await expect(resolveInvite(forged)).resolves.toEqual({ ok: false, reason: "tampered" });
  });
});

/**
 * BOTH DOORS CHECK THE MONEY.
 *
 * The signed-token reader has always bounds-checked the rate and the date on
 * the way out: a signature proves nobody edited a value and says nothing about
 * whether it was sane when it was written. The stored path returned its payload
 * verbatim and skipped all of that — so the two doors into the same checkout
 * held different standards.
 *
 * Found by putting `amountPence: 9999999` in the store and watching Checkout be
 * asked for £99,999.99 a month, a figure both Ben's form and the invite API
 * refuse. These pin the fix.
 */
describe("the stored path bounds-checks like the signed one", () => {
  const now = Math.floor(Date.now() / 1000);

  async function resolveStored(extra: Partial<InvitePayload>) {
    const stored = await storeInvite({
      ...base,
      kind: "payment",
      iat: now,
      exp: now + 86400,
      ...extra,
    } as InvitePayload);
    if (!stored.ok) throw new Error("store failed");
    return resolveInvite(stored.id);
  }

  it("drops a rate outside the band rather than charging it", async () => {
    for (const bad of [9_999_999, 1, 99, 0, -500]) {
      const r = await resolveStored({ amountPence: bad });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.invite.amountPence, `${bad}p survived`).toBeUndefined();
    }
  });

  it("keeps a rate inside the band exactly", async () => {
    for (const good of [100, 15000, 22000, 200000]) {
      const r = await resolveStored({ amountPence: good });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.invite.amountPence).toBe(good);
    }
  });

  it("drops an implausible start day rather than charging on it", async () => {
    for (const bad of [0, 1, 999_999_999, -20]) {
      const r = await resolveStored({ amountPence: 15000, startDay: bad });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.invite.startDay, `day ${bad} survived`).toBeUndefined();
    }
  });

  it("keeps a plausible start day", async () => {
    const r = await resolveStored({ amountPence: 15000, startDay: 20711 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.invite.startDay).toBe(20711);
  });

  /* Dropping, not refusing. A bad value falls back to "charge the published
     price at checkout", which somebody can recover from; an error page is a
     dead end for a person holding a link they did not write. */
  it("still resolves the invite when it drops a field", async () => {
    const r = await resolveStored({ amountPence: 9_999_999 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.invite.email).toBe("kieron@example.com");
  });
});
