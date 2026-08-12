import { describe, expect, it } from "vitest";
import {
  createInvite,
  readInvite,
  validAmountPence,
} from "@/lib/onboarding/token";

/**
 * The agreed per-client rate rides the SIGNED invite. These tests pin the
 * two properties that make that safe: the rate survives the round-trip
 * exactly, and it cannot be altered without breaking the signature —
 * a client must not be able to name their own price.
 */

describe("custom rate on the invite token", () => {
  it("round-trips the agreed rate", () => {
    const token = createInvite({
      name: "Marcus Bell",
      email: "marcus@example.com",
      phone: "07700900123",
      kind: "payment",
      plan: "coaching-121",
      amountPence: 18500, // £185 — a grandfathered rate no public plan has
    });
    const read = readInvite(token);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.invite.amountPence).toBe(18500);
      expect(read.invite.plan).toBe("coaching-121");
      expect(read.invite.kind).toBe("payment");
    }
  });

  it("omits the field entirely when no rate was set", () => {
    const token = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "full",
    });
    const read = readInvite(token);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.invite.amountPence).toBeUndefined();
  });

  it("a tampered rate breaks the signature", () => {
    const token = createInvite({
      name: "Marcus",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 18500,
    });
    const [body] = token.split(".");
    const decoded = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as Record<string, unknown>;
    decoded.a = 100; // pay £1 instead
    const forgedBody = Buffer.from(JSON.stringify(decoded))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const forged = `${forgedBody}.${token.split(".")[1]}`;
    const read = readInvite(forged);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toBe("tampered");
  });

  it("refuses a nonsense rate even if somehow signed", () => {
    // The reader validates independently of the writer: a rate outside
    // £1–£1,000 is dropped rather than charged.
    const token = createInvite({
      name: "X",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 5_000_000 as number, // £50,000/mo
    });
    const read = readInvite(token);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.invite.amountPence).toBeUndefined();
  });
});

describe("validAmountPence", () => {
  it("accepts the plausible band", () => {
    expect(validAmountPence(100)).toBe(true); // £1
    expect(validAmountPence(22000)).toBe(true); // £220
    expect(validAmountPence(100_000)).toBe(true); // £1,000
  });

  it("rejects everything else", () => {
    expect(validAmountPence(99)).toBe(false);
    expect(validAmountPence(100_001)).toBe(false);
    expect(validAmountPence(220.5)).toBe(false); // fractional pence
    expect(validAmountPence("220")).toBe(true); // numeric strings coerce
    expect(validAmountPence("abc")).toBe(false);
    expect(validAmountPence(null)).toBe(false);
    expect(validAmountPence(undefined)).toBe(false);
    expect(validAmountPence(NaN)).toBe(false);
  });
});
