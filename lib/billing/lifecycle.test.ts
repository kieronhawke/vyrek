import { describe, expect, it } from "vitest";
import {
  commsFor,
  type LifecycleEvent,
  type SubscriptionUpdate,
} from "@/lib/billing/lifecycle";

/**
 * THE FULL SWEEP.
 *
 * Every combination of subscription state change Stripe can describe,
 * every retry count an invoice can carry, pushed through the one function
 * that decides who gets told what. The named cases pin the behaviour a
 * human cares about; the exhaustive sweeps prove the rules hold across
 * the whole space, not just the corners we thought of.
 */

const STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;
const TRISTATE = [true, false, undefined] as const;
const BOOLS = [true, false] as const;

function customerEmails(e: LifecycleEvent) {
  return commsFor(e).filter((c) => c.channel === "customer_email");
}
function adminAlerts(e: LifecycleEvent) {
  return commsFor(e).filter((c) => c.channel === "admin_alert");
}

describe("the cases a human would name", () => {
  it("customer cancels in the portal: goodbye-for-now email + admin heads-up", () => {
    const comms = commsFor({
      type: "subscription.updated",
      prevCancelAtPeriodEnd: false,
      next: { status: "active", cancelAtPeriodEnd: true, paused: false },
    });
    expect(comms).toEqual([
      { channel: "customer_email", kind: "cancel_scheduled" },
      { channel: "admin_alert", kind: "cancel_scheduled" },
    ]);
  });

  it("admin's kind cancel looks identical to the customer's own", () => {
    // Both go through Stripe's cancel_at_period_end, so the client hears
    // the same words whoever pressed the button.
    const comms = commsFor({
      type: "subscription.updated",
      prevCancelAtPeriodEnd: false,
      next: { status: "trialing", cancelAtPeriodEnd: true, paused: false },
    });
    expect(comms.map((c) => c.kind)).toEqual([
      "cancel_scheduled",
      "cancel_scheduled",
    ]);
  });

  it("changing their mind: welcome-back email, no admin noise", () => {
    const comms = commsFor({
      type: "subscription.updated",
      prevCancelAtPeriodEnd: true,
      next: { status: "active", cancelAtPeriodEnd: false, paused: false },
    });
    expect(comms).toEqual([
      { channel: "customer_email", kind: "cancel_reversed" },
    ]);
  });

  it("the subscription actually ending: goodbye email + admin note", () => {
    const comms = commsFor({ type: "subscription.deleted" });
    expect(comms).toEqual([
      { channel: "customer_email", kind: "cancelled" },
      { channel: "admin_alert", kind: "cancelled" },
    ]);
  });

  it("admin pauses collection: the client is told, once", () => {
    const comms = commsFor({
      type: "subscription.updated",
      prevPaused: false,
      next: { status: "active", cancelAtPeriodEnd: false, paused: true },
    });
    expect(comms).toEqual([{ channel: "customer_email", kind: "paused" }]);
  });

  it("resume: the client is told collection is back on", () => {
    const comms = commsFor({
      type: "subscription.updated",
      prevPaused: true,
      next: { status: "active", cancelAtPeriodEnd: false, paused: false },
    });
    expect(comms).toEqual([{ channel: "customer_email", kind: "resumed" }]);
  });

  it("first failed payment: fix-it email + admin watch note", () => {
    const comms = commsFor({
      type: "invoice.payment_failed",
      attemptCount: 1,
      hasNextAttempt: true,
    });
    expect(comms.map((c) => c.kind)).toEqual([
      "payment_failed",
      "payment_failed",
    ]);
  });

  it("a retry succeeding: the all-sorted email", () => {
    expect(
      commsFor({ type: "invoice.payment_succeeded", attemptCount: 2 }),
    ).toEqual([{ channel: "customer_email", kind: "payment_recovered" }]);
  });

  it("a normal monthly payment: silence (Stripe sends the receipt)", () => {
    expect(
      commsFor({ type: "invoice.payment_succeeded", attemptCount: 1 }),
    ).toEqual([]);
  });

  it("a renewal that changes nothing relevant: silence", () => {
    expect(
      commsFor({
        type: "subscription.updated",
        next: { status: "active", cancelAtPeriodEnd: false, paused: false },
      }),
    ).toEqual([]);
  });
});

describe("the exhaustive update sweep", () => {
  const events: SubscriptionUpdate[] = [];
  for (const status of STATUSES) {
    for (const prevCancel of TRISTATE) {
      for (const nextCancel of BOOLS) {
        for (const prevPause of TRISTATE) {
          for (const nextPause of BOOLS) {
            events.push({
              type: "subscription.updated",
              prevCancelAtPeriodEnd: prevCancel,
              prevPaused: prevPause,
              next: {
                status,
                cancelAtPeriodEnd: nextCancel,
                paused: nextPause,
              },
            });
          }
        }
      }
    }
  }

  it(`${events.length} update shapes: never more than one customer email`, () => {
    for (const e of events) {
      expect(customerEmails(e).length).toBeLessThanOrEqual(1);
    }
  });

  it("a cancellation email only ever follows a real flip of the flag", () => {
    for (const e of events) {
      const kinds = customerEmails(e).map((c) => c.kind);
      if (kinds.includes("cancel_scheduled")) {
        expect(e.prevCancelAtPeriodEnd).toBe(false);
        expect(e.next.cancelAtPeriodEnd).toBe(true);
      }
      if (kinds.includes("cancel_reversed")) {
        expect(e.prevCancelAtPeriodEnd).toBe(true);
        expect(e.next.cancelAtPeriodEnd).toBe(false);
      }
    }
  });

  it("pause emails only ever follow a real flip of the pause", () => {
    for (const e of events) {
      const kinds = customerEmails(e).map((c) => c.kind);
      if (kinds.includes("paused")) {
        expect(e.prevPaused).toBe(false);
        expect(e.next.paused).toBe(true);
      }
      if (kinds.includes("resumed")) {
        expect(e.prevPaused).toBe(true);
        expect(e.next.paused).toBe(false);
      }
    }
  });

  it("an event where nothing relevant changed says nothing at all", () => {
    for (const e of events) {
      const cancelUntouched =
        e.prevCancelAtPeriodEnd === undefined ||
        e.prevCancelAtPeriodEnd === e.next.cancelAtPeriodEnd;
      const pauseUntouched =
        e.prevPaused === undefined || e.prevPaused === e.next.paused;
      if (cancelUntouched && pauseUntouched) {
        expect(commsFor(e)).toEqual([]);
      }
    }
  });

  it("the admin is never alerted without the customer also being told", () => {
    for (const e of events) {
      if (adminAlerts(e).length > 0) {
        expect(customerEmails(e).length).toBe(1);
      }
    }
  });

  it("cancelling takes precedence when several things change at once", () => {
    // Stripe can bundle a pause change and a cancel change into one
    // event. One email, and it is the cancellation, because that is the
    // one with a deadline on it.
    for (const e of events) {
      const flippedCancelOn =
        e.prevCancelAtPeriodEnd === false && e.next.cancelAtPeriodEnd;
      if (flippedCancelOn) {
        expect(customerEmails(e).map((c) => c.kind)).toEqual([
          "cancel_scheduled",
        ]);
      }
    }
  });
});

describe("the exhaustive invoice sweep", () => {
  it("every failure count up to a year of retries behaves the same way", () => {
    for (let attempt = 1; attempt <= 52; attempt++) {
      for (const hasNext of BOOLS) {
        const comms = commsFor({
          type: "invoice.payment_failed",
          attemptCount: attempt,
          hasNextAttempt: hasNext,
        });
        expect(comms.map((c) => c.kind)).toEqual([
          "payment_failed",
          "payment_failed",
        ]);
        expect(
          comms.filter((c) => c.channel === "customer_email").length,
        ).toBe(1);
      }
    }
  });

  it("recovery emails need a failure to have happened first", () => {
    for (let attempt = 1; attempt <= 52; attempt++) {
      const comms = commsFor({
        type: "invoice.payment_succeeded",
        attemptCount: attempt,
      });
      if (attempt === 1) expect(comms).toEqual([]);
      else
        expect(comms).toEqual([
          { channel: "customer_email", kind: "payment_recovered" },
        ]);
    }
  });
});
