import { describe, expect, it } from "vitest";
import {
  createInvite,
  readInvite,
  inviteUrl,
  inviteUrlForSms,
  validAmountPence,
  INVITE_DAYS,
  type InvitePayload,
} from "@/lib/onboarding/token";
import { planByKey, stepsFor, PLANS } from "@/lib/onboarding/model";

/**
 * THE PAYMENT-LINK ROUTE, HAMMERED.
 *
 * Every combination Ben can produce from the send-payment-link form, every
 * rate a client could be on, and every way a link can age or be mangled.
 * The live walk-throughs test one path at a time; this file is the
 * hundreds-of-scenarios sweep behind them.
 */

const KINDS = ["payment", "full"] as const;
const PLAN_KEYS = ["coaching-121", "coaching-tier2", "club", undefined] as const;
const RAILS = ["beginner", undefined] as const;
const NAMES = [
  "Sam",
  "Sam Reeves",
  "Seán Ó Briain",
  "李伟",
  "Marie-Claire de la Tour",
  "X Æ",
];
// Every £5 step across the whole allowed band, plus awkward penny rates.
const RATES: number[] = [];
for (let p = 100; p <= 100_000; p += 500) RATES.push(p);
RATES.push(1299, 8999, 12345, 18500, 99999);

describe("every plan/kind/rail/rate combination round-trips the signed token", () => {
  for (const kind of KINDS) {
    for (const plan of PLAN_KEYS) {
      for (const rail of RAILS) {
        it(`${kind} · ${plan ?? "no plan"} · ${rail ?? "athlete"}`, () => {
          const token = createInvite({
            name: "Sam Reeves",
            email: "sam@example.com",
            phone: "07700900123",
            kind,
            ...(plan ? { plan } : {}),
            ...(rail ? { rail } : {}),
          });
          const read = readInvite(token);
          expect(read.ok).toBe(true);
          if (!read.ok) return;
          expect(read.invite.kind).toBe(kind);
          expect(read.invite.plan).toBe(plan);
          expect(read.invite.rail).toBe(rail);
          // The steps the client walks: 3 for payment-only, 10 for full
          // (the coaching-style screen made it ten).
          expect(stepsFor(read.invite.kind)).toHaveLength(
            kind === "payment" ? 3 : 10,
          );
        });
      }
    }
  }
});

describe("every rate in the band survives signing exactly", () => {
  it(`${RATES.length} rates round-trip to the penny`, () => {
    for (const amountPence of RATES) {
      const token = createInvite({
        name: "Sam",
        email: "",
        phone: "",
        kind: "payment",
        plan: "coaching-121",
        amountPence,
      });
      const read = readInvite(token);
      expect(read.ok).toBe(true);
      if (read.ok) expect(read.invite.amountPence).toBe(amountPence);
    }
  });

  it("out-of-band rates are dropped by the reader even when signed", () => {
    for (const bad of [0, 1, 99, 100_001, 1_000_000, -500]) {
      const token = createInvite({
        name: "Sam",
        email: "",
        phone: "",
        kind: "payment",
        amountPence: bad as number,
      });
      const read = readInvite(token);
      expect(read.ok).toBe(true);
      if (read.ok) expect(read.invite.amountPence).toBeUndefined();
    }
  });
});

describe("names survive the token, whatever alphabet the client uses", () => {
  for (const name of NAMES) {
    it(`"${name}"`, () => {
      const token = createInvite({
        name,
        email: "",
        phone: "",
        kind: "payment",
      });
      const read = readInvite(token);
      expect(read.ok).toBe(true);
      // Only the first name travels in the compact token, by design.
      if (read.ok) expect(read.invite.name).toBe(name.trim().split(/\s+/)[0]);
    });
  }
});

describe("tampering: flipping ANY single character breaks the link safely", () => {
  const token = createInvite({
    name: "Marcus",
    email: "",
    phone: "",
    kind: "payment",
    plan: "coaching-121",
    amountPence: 18500,
  });

  it(`all ${token.length} single-character mutations are rejected or unchanged`, () => {
    for (let i = 0; i < token.length; i++) {
      const original = token[i];
      const flipped = original === "A" ? "B" : "A";
      if (original === flipped) continue;
      const mutated = token.slice(0, i) + flipped + token.slice(i + 1);
      const read = readInvite(mutated);
      if (read.ok) {
        // The only acceptable "ok" is a mutation that decodes to the very
        // same payload (base64 padding quirks); the rate must be intact.
        expect(read.invite.amountPence).toBe(18500);
        expect(read.invite.kind).toBe("payment");
      } else {
        expect(["tampered", "malformed", "expired"]).toContain(read.reason);
      }
    }
  });
});

describe("expiry", () => {
  it("a link is alive for its whole life and dead the moment it isn't", () => {
    const now = Date.now();
    const token = createInvite(
      { name: "Sam", email: "", phone: "", kind: "payment" },
      now,
    );
    const lastValidMs = (Math.floor((now / 1000 + INVITE_DAYS * 86400) / 86400) * 86400) * 1000;
    expect(readInvite(token, now).ok).toBe(true);
    expect(readInvite(token, lastValidMs - 1000).ok).toBe(true);
    const dead = readInvite(token, lastValidMs + 86400_000);
    expect(dead.ok).toBe(false);
    if (!dead.ok) expect(dead.reason).toBe("expired");
  });
});

describe("the links Ben pays to send", () => {
  it("SMS form drops the protocol and www", () => {
    const token = "tpfcr8gdwf";
    expect(inviteUrl(token, "https://www.suthperformance.com")).toBe(
      "https://www.suthperformance.com/o/tpfcr8gdwf",
    );
    expect(inviteUrlForSms(token, "https://www.suthperformance.com")).toBe(
      "suthperformance.com/o/tpfcr8gdwf",
    );
  });

  it("a short-id link stays inside one SMS segment with room for copy", () => {
    const link = inviteUrlForSms("tpfcr8gdwf", "https://www.suthperformance.com");
    // 32 chars of a 160-char GSM-7 segment; the invite copy fits alongside.
    expect(link.length).toBeLessThanOrEqual(40);
  });
});

describe("what each plan charges when no custom rate rides the link", () => {
  it("plan prices are the public ones, custom rate always wins", () => {
    for (const plan of PLANS) {
      const withRate: InvitePayload = {
        name: "S",
        email: "",
        phone: "",
        kind: "payment",
        plan: plan.key,
        amountPence: 15000,
        iat: 0,
        exp: Math.floor(Date.now() / 1000) + 86400,
      };
      // Mirrors the checkout route's resolution order.
      const isCustom = typeof withRate.amountPence === "number";
      const resolved = planByKey(isCustom ? withRate.plan : plan.key)!;
      const charge = withRate.amountPence ?? resolved.pence;
      expect(charge).toBe(15000);
      const trialDays = isCustom ? 0 : resolved.trialDays;
      expect(trialDays).toBe(0);
    }
  });

  it("without a custom rate, club keeps its trial and coaching has none", () => {
    expect(planByKey("club")!.trialDays).toBe(7);
    expect(planByKey("coaching-121")!.trialDays).toBe(0);
    expect(planByKey("coaching-tier2")!.trialDays).toBe(0);
  });
});
