import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  invoiceChargeId,
  invoicePaymentIntentId,
  invoiceSubscriptionId,
  subscriptionPeriodEndUnix,
} from "@/lib/billing/stripe-compat";

/**
 * These helpers exist because Stripe's 2025-03-31 "Basil" release moved
 * fields the webhook depended on, and the old code force-cast the old
 * names and silently read undefined. Every test here runs BOTH shapes,
 * because the webhook payload follows whatever API version the endpoint
 * is configured with — not what the SDK ships.
 */

const asSub = (o: object) => o as unknown as Stripe.Subscription;
const asInv = (o: object) => o as unknown as Stripe.Invoice;

describe("subscriptionPeriodEndUnix", () => {
  it("reads the legacy flat field", () => {
    expect(subscriptionPeriodEndUnix(asSub({ current_period_end: 1750000000 }))).toBe(
      1750000000,
    );
  });

  it("reads the Basil per-item field", () => {
    const sub = asSub({
      items: { data: [{ current_period_end: 1750000000 }] },
    });
    expect(subscriptionPeriodEndUnix(sub)).toBe(1750000000);
  });

  it("takes the furthest end across items", () => {
    const sub = asSub({
      items: {
        data: [
          { current_period_end: 1750000000 },
          { current_period_end: 1760000000 },
        ],
      },
    });
    expect(subscriptionPeriodEndUnix(sub)).toBe(1760000000);
  });

  it("prefers the legacy field when both exist", () => {
    const sub = asSub({
      current_period_end: 1740000000,
      items: { data: [{ current_period_end: 1750000000 }] },
    });
    expect(subscriptionPeriodEndUnix(sub)).toBe(1740000000);
  });

  it("returns null when neither shape carries an end", () => {
    expect(subscriptionPeriodEndUnix(asSub({}))).toBeNull();
    expect(subscriptionPeriodEndUnix(asSub({ items: { data: [{}] } }))).toBeNull();
  });
});

describe("invoiceSubscriptionId", () => {
  it("reads the legacy string field", () => {
    expect(invoiceSubscriptionId(asInv({ subscription: "sub_123" }))).toBe(
      "sub_123",
    );
  });

  it("reads the legacy expanded object", () => {
    expect(
      invoiceSubscriptionId(asInv({ subscription: { id: "sub_123" } })),
    ).toBe("sub_123");
  });

  it("reads the Basil parent shape", () => {
    const inv = asInv({
      parent: { subscription_details: { subscription: "sub_456" } },
    });
    expect(invoiceSubscriptionId(inv)).toBe("sub_456");
  });

  it("reads the Basil parent shape when expanded", () => {
    const inv = asInv({
      parent: { subscription_details: { subscription: { id: "sub_456" } } },
    });
    expect(invoiceSubscriptionId(inv)).toBe("sub_456");
  });

  it("returns null for a one-off invoice", () => {
    expect(invoiceSubscriptionId(asInv({}))).toBeNull();
    expect(invoiceSubscriptionId(asInv({ parent: {} }))).toBeNull();
  });
});

describe("invoicePaymentIntentId", () => {
  it("reads the legacy flat field", () => {
    expect(invoicePaymentIntentId(asInv({ payment_intent: "pi_1" }))).toBe(
      "pi_1",
    );
  });

  it("reads the Basil payments list", () => {
    const inv = asInv({
      payments: { data: [{ payment: { payment_intent: "pi_2" } }] },
    });
    expect(invoicePaymentIntentId(inv)).toBe("pi_2");
  });

  it("returns null on an unpaid invoice", () => {
    expect(invoicePaymentIntentId(asInv({}))).toBeNull();
    expect(invoicePaymentIntentId(asInv({ payments: { data: [] } }))).toBeNull();
  });
});

describe("invoiceChargeId", () => {
  it("reads the legacy flat field", () => {
    expect(invoiceChargeId(asInv({ charge: "ch_1" }))).toBe("ch_1");
  });

  it("reads the Basil payments list", () => {
    const inv = asInv({
      payments: { data: [{ payment: { charge: "ch_2" } }] },
    });
    expect(invoiceChargeId(inv)).toBe("ch_2");
  });

  it("returns null when nothing was charged", () => {
    expect(invoiceChargeId(asInv({}))).toBeNull();
  });
});
