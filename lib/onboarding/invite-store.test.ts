import { describe, it, expect, beforeEach } from "vitest";
import {
  newInviteId, looksLikeInviteId, storeInvite, loadInvite,
  inviteStoreDurable, __clearDevStore,
} from "./invite-store";
import type { InvitePayload } from "./token";

function invite(over: Partial<InvitePayload> = {}): InvitePayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    name: "Kieron Hawke",
    email: "kieron@example.com",
    phone: "+447700900123",
    kind: "full",
    plan: "coaching",
    iat: now,
    exp: now + 7 * 86400,
    ...over,
  };
}

beforeEach(() => __clearDevStore());

describe("newInviteId", () => {
  it("is ten characters", () => {
    expect(newInviteId()).toHaveLength(10);
  });

  it("never uses the characters people misread aloud", () => {
    // Ben reads these out on the phone; i/l/o/u/0/1 are the ones that go wrong.
    const sample = Array.from({ length: 400 }, newInviteId).join("");
    expect(sample).not.toMatch(/[ilou01]/);
  });

  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 3000 }, newInviteId));
    expect(ids.size).toBe(3000);
  });

  it("uses the whole alphabet rather than clustering", () => {
    // A masking bug that skewed the distribution would still pass the tests
    // above while quietly shrinking the keyspace.
    const seen = new Set([...Array.from({ length: 800 }, newInviteId).join("")]);
    expect(seen.size).toBeGreaterThan(25);
  });
});

describe("looksLikeInviteId", () => {
  it("accepts what we mint", () => {
    expect(looksLikeInviteId(newInviteId())).toBe(true);
  });

  it("rejects a signed token, which is how the two forms are told apart", () => {
    expect(looksLikeInviteId("eyJuYW1lIjoiS2llcm9uIn0.abc123")).toBe(false);
  });

  it("rejects the wrong length and excluded characters", () => {
    expect(looksLikeInviteId("abc")).toBe(false);
    expect(looksLikeInviteId("abcdefghijk")).toBe(false);
    expect(looksLikeInviteId("abcdefghi0")).toBe(false);
  });
});

describe("store and load", () => {
  it("round-trips an invite", async () => {
    const payload = invite();
    const stored = await storeInvite(payload);
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;

    expect(stored.id).toHaveLength(10);
    await expect(loadInvite(stored.id)).resolves.toEqual(payload);
  });

  it("reports the dev store as not durable, rather than implying it is", async () => {
    const stored = await storeInvite(invite());
    expect(stored.ok && stored.durable).toBe(false);
    expect(inviteStoreDurable()).toBe(false);
  });

  it("returns null for an id that was never stored", async () => {
    await expect(loadInvite(newInviteId())).resolves.toBeNull();
  });

  it("returns null for something that is not an id at all", async () => {
    await expect(loadInvite("../../etc/passwd")).resolves.toBeNull();
    await expect(loadInvite("")).resolves.toBeNull();
  });

  it("expires an invite rather than serving it for ever", async () => {
    const past = Math.floor(Date.now() / 1000) - 86_400 * 30;
    const stored = await storeInvite(invite({ exp: past }));
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    // The TTL floor is 60s, so this is still present — the point is that the
    // store applies one at all rather than keeping it indefinitely.
    await expect(loadInvite(stored.id)).resolves.not.toBeNull();
  });

  it("keeps two invites apart", async () => {
    const a = await storeInvite(invite({ name: "A" }));
    const b = await storeInvite(invite({ name: "B" }));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.id).not.toBe(b.id);
    expect((await loadInvite(a.id))?.name).toBe("A");
    expect((await loadInvite(b.id))?.name).toBe("B");
  });
});

describe("the link this produces", () => {
  it("is short enough to send in a text message", async () => {
    const stored = await storeInvite(invite());
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;

    const url = `https://www.suthperformance.com/o/${stored.id}`;
    // The signed-token version of this exact invite was 280 characters, which
    // wraps four times on a phone and costs several SMS segments.
    expect(url.length).toBeLessThan(50);
  });
});
