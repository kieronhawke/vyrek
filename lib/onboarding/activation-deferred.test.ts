import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { startDateISO, todayDay } from "./start-date";

/**
 * THE SUBSCRIPTION CHECKOUT COULD NOT MAKE.
 *
 * A balance-first checkout saves the card and stamps the arrangement on the
 * session; activation creates the anchored subscription from those stamps.
 * These pin the parts that would fail silently: the idempotency key, the
 * anchor with no proration, reuse of a subscription already made by the
 * other activation caller, and refusing to invent one without a saved card.
 */

const stripeMock = vi.hoisted(() => ({
  subscriptions: {
    list: vi.fn(),
    create: vi.fn(),
  },
  paymentIntents: {
    retrieve: vi.fn(),
  },
}));

vi.mock("@/lib/stripe", () => ({ stripe: () => stripeMock }));
vi.mock("@/lib/billing/products", () => ({
  ensurePlanProduct: vi.fn(async () => "prod_coaching_test"),
}));
// Pulled in by activation.ts at module level; never called by these tests.
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
vi.mock("@/lib/email/send", () => ({ sendAccountReady: vi.fn() }));

import { ensureDeferredSubscription, stampedSchedule } from "./activation";

const TODAY = todayDay();
const IN_TEN = startDateISO(TODAY + 10);

function session(over: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    mode: "payment",
    customer: "cus_abc",
    payment_intent: "pi_abc",
    created: Math.floor(Date.now() / 1000),
    metadata: {
      flow: "invite",
      deferred_subscription: "1",
      plan: "agreed",
      onboarding: "payment",
      client_name: "Sam Reeves",
      amount_pence: "6000",
      agreed_price_pence: "6000",
      due_today_pence: "10000",
      starts_on: IN_TEN,
    },
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  stripeMock.subscriptions.list.mockResolvedValue({ data: [] });
  stripeMock.paymentIntents.retrieve.mockResolvedValue({
    id: "pi_abc",
    payment_method: "pm_saved",
  });
  stripeMock.subscriptions.create.mockImplementation(async (params: unknown) => ({
    id: "sub_new",
    status: "active",
    items: { data: [{ price: { unit_amount: 6000 } }] },
    metadata: (params as { metadata: Record<string, string> }).metadata,
  }));
});

describe("ensureDeferredSubscription", () => {
  it("creates the subscription against the saved card, anchored with no proration", async () => {
    const out = await ensureDeferredSubscription(session());
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.subscription.id).toBe("sub_new");

    expect(stripeMock.subscriptions.create).toHaveBeenCalledTimes(1);
    const [params, opts] = stripeMock.subscriptions.create.mock.calls[0];
    expect(params.customer).toBe("cus_abc");
    expect(params.default_payment_method).toBe("pm_saved");
    expect(params.items[0].price_data).toMatchObject({
      currency: "gbp",
      unit_amount: 6000,
      recurring: { interval: "month" },
      product: "prod_coaching_test",
    });
    expect(params.proration_behavior).toBe("none");
    expect(typeof params.billing_cycle_anchor).toBe("number");
    expect(params.billing_cycle_anchor * 1000).toBeGreaterThan(Date.now());
    // Stamped so the other caller can find it, and so Stripe shows the whole
    // arrangement a year later.
    expect(params.metadata).toMatchObject({
      checkout_session: "cs_test_123",
      amount_pence: "6000",
      due_today_pence: "10000",
      starts_on: IN_TEN,
      client_name: "Sam Reeves",
    });
    // One subscription per session, whichever caller gets there first.
    expect(opts).toEqual({ idempotencyKey: "deferred-sub:cs_test_123" });
  });

  it("reuses a subscription the other activation caller already made", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        { id: "sub_other", metadata: { checkout_session: "cs_other" } },
        { id: "sub_mine", metadata: { checkout_session: "cs_test_123" } },
      ],
    });
    const out = await ensureDeferredSubscription(session());
    expect(out.ok && out.subscription.id).toBe("sub_mine");
    expect(stripeMock.subscriptions.create).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("charges the first month now when the date passed between checkout and here", async () => {
    const out = await ensureDeferredSubscription(
      session({ metadata: { ...session().metadata, starts_on: startDateISO(TODAY - 1) } }),
    );
    expect(out.ok).toBe(true);
    const [params] = stripeMock.subscriptions.create.mock.calls[0];
    expect(params.billing_cycle_anchor).toBeUndefined();
    expect(params.proration_behavior).toBeUndefined();
  });

  it("refuses to invent a subscription without a saved card", async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ id: "pi_abc", payment_method: null });
    const out = await ensureDeferredSubscription(session());
    expect(out).toEqual({ ok: false, error: "DEFERRED_NO_PAYMENT_METHOD" });
    expect(stripeMock.subscriptions.create).not.toHaveBeenCalled();
  });

  it("refuses without a customer or an amount", async () => {
    expect(await ensureDeferredSubscription(session({ customer: null }))).toEqual({
      ok: false,
      error: "DEFERRED_NO_CUSTOMER",
    });
    expect(
      await ensureDeferredSubscription(
        session({ metadata: { ...session().metadata, amount_pence: "0" } }),
      ),
    ).toEqual({ ok: false, error: "DEFERRED_NO_AMOUNT" });
  });

  it("reports a Stripe refusal rather than throwing, so the webhook retries", async () => {
    stripeMock.subscriptions.create.mockRejectedValue(new Error("card_declined"));
    const out = await ensureDeferredSubscription(session());
    expect(out).toEqual({ ok: false, error: "DEFERRED_SUB_FAILED" });
  });
});

describe("stampedSchedule", () => {
  it("reads the arrangement back off the session", () => {
    const s = stampedSchedule(session());
    expect(s).toMatchObject({
      monthlyPence: 6000,
      dueTodayPence: 10000,
      deferred: true,
      todayPence: 10000,
      shape: "balance-then-subscription",
    });
  });

  it("resolves the date as of the checkout, not as of the redelivery", () => {
    // Created twelve days ago with a start ten days ago that was, at the
    // time, two days ahead. A webhook redelivered today must still describe
    // the deferred arrangement the client saw.
    const created = Math.floor(Date.now() / 1000) - 12 * 86400;
    const s = stampedSchedule(
      session({
        created,
        metadata: { ...session().metadata, starts_on: startDateISO(TODAY - 10) },
      }),
    );
    expect(s?.deferred).toBe(true);
  });

  it("is null for a published tier, which has no agreed figures", () => {
    expect(stampedSchedule(session({ metadata: { flow: "invite", plan: "club" } }))).toBeNull();
  });
});
