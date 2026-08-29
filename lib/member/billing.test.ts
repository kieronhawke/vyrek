import { describe, expect, it } from "vitest";
import {
  billingHeadline,
  formatCard,
  formatDate,
  formatMoney,
  formatRecurring,
  nextEventDate,
  nextEventLabel,
  type BillingSummary,
} from "./billing";

const BASE: BillingSummary = {
  status: "active",
  planName: "Suth Club",
  amount: 899,
  currency: "gbp",
  interval: "month",
  intervalCount: 1,
  periodEnd: "2026-09-05T09:00:00.000Z",
  trialEnd: null,
  endingAtPeriodEnd: false,
  card: null,
  invoices: [],
};

describe("money", () => {
  it("reads minor units the way Stripe stores them", () => {
    expect(formatMoney(899, "gbp")).toBe("£8.99");
    expect(formatMoney(9000, "gbp")).toBe("£90.00");
  });

  /**
   * Yen has no minor unit. A divide-by-100 turns ¥1,200 into ¥12 — off by a
   * factor of a hundred, on somebody's bill.
   */
  it("does not divide currencies that have no minor unit", () => {
    /* "JP¥" rather than "¥" is en-GB doing the right thing: to a British
       reader a bare ¥ is ambiguous between yen and yuan. */
    expect(formatMoney(1200, "jpy")).toBe("JP¥1,200");
  });
});

describe("the recurring line", () => {
  it("says what it costs and how often", () => {
    expect(formatRecurring(899, "gbp", "month")).toBe("£8.99 a month");
    expect(formatRecurring(9000, "gbp", "year")).toBe("£90.00 a year");
  });

  it("handles an interval of more than one", () => {
    expect(formatRecurring(1800, "gbp", "month", 3)).toBe("£18.00 every 3 months");
  });

  /* The rule the whole file exists for: nothing invented. A missing amount
     produces no line, never a plausible one. */
  it("returns nothing rather than guessing", () => {
    expect(formatRecurring(null, "gbp", "month")).toBeNull();
    expect(formatRecurring(899, null, "month")).toBeNull();
    expect(formatRecurring(899, "gbp", null)).toBeNull();
  });
});

describe("the headline", () => {
  it("reads the ordinary states", () => {
    expect(billingHeadline(BASE)).toBe("Active");
    expect(billingHeadline({ ...BASE, status: "trialing" })).toBe("Free trial");
    expect(billingHeadline({ ...BASE, status: "canceled" })).toBe("Cancelled");
    expect(billingHeadline({ ...BASE, status: "past_due" })).toBe("Payment failed");
  });

  /**
   * The one that matters. Stripe still calls a subscription "active" right up
   * to the moment it stops, so a screen that echoes the status tells somebody
   * who cancelled last week that they are still a member.
   */
  it("does not call a subscription active when it is set to stop", () => {
    expect(billingHeadline({ ...BASE, endingAtPeriodEnd: true })).toBe(
      "Ends at the end of this period",
    );
  });
});

describe("the next date", () => {
  it("is the next payment while it is running", () => {
    expect(nextEventLabel(BASE)).toBe("Next payment");
    expect(nextEventDate(BASE)).toBe(BASE.periodEnd);
  });

  it("is the trial end during a trial", () => {
    const trial = { ...BASE, status: "trialing", trialEnd: "2026-08-12T09:00:00.000Z" };
    expect(nextEventLabel(trial)).toBe("Trial ends");
    expect(nextEventDate(trial)).toBe(trial.trialEnd);
  });

  /* Same timestamp, opposite meaning. Calling it "next payment" on a
     cancelled subscription tells somebody money is coming out when it is not. */
  it("is when access stops once it has been cancelled", () => {
    expect(nextEventLabel({ ...BASE, endingAtPeriodEnd: true })).toBe("Access until");
    expect(nextEventLabel({ ...BASE, status: "canceled" })).toBe("Access until");
  });
});

describe("dates and cards", () => {
  it("writes a date the way somebody would say it", () => {
    expect(formatDate("2026-09-05T09:00:00.000Z")).toBe("5 September 2026");
  });

  /* Never today as a stand-in for a date we do not have. */
  it("returns nothing for nothing", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("not a date")).toBeNull();
  });

  it("describes the card without repeating the number", () => {
    expect(
      formatCard({ brand: "visa", last4: "4242", expMonth: 8, expYear: 2028 }),
    ).toBe("Visa ending 4242, expires 08/28");
  });

  it("has nothing to say when there is no card", () => {
    expect(formatCard(null)).toBeNull();
  });
});
