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
    if (result.ok) expect(result.invite.name).toBe("Kieron Hawke");
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
