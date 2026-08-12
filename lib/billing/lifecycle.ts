/**
 * WHO HEARS WHAT, WHEN A SUBSCRIPTION CHANGES.
 *
 * One pure function decides every communication the billing system sends.
 * The webhook feeds it Stripe events; it returns the list of messages to
 * send. Nothing else in the codebase decides to email a customer about
 * their subscription, which is what makes the matrix testable: the
 * scenario suite sweeps thousands of event shapes through this function
 * and checks the rules hold on every one.
 *
 * The rules, in plain words:
 *   - Cancelling ahead (customer in the portal, or admin's kind cancel)
 *     gets a "your membership ends on X" note and a heads-up to the admin.
 *   - Un-cancelling gets a welcome-back note.
 *   - The final end of a subscription gets the goodbye note.
 *   - Pausing and resuming each get a short note saying exactly what is
 *     and isn't collected.
 *   - A failed payment tells the customer how to fix it and tells the
 *     admin who to watch.
 *   - A payment that succeeds after failing gets an "all sorted" note.
 *   - No event ever produces two emails to the customer.
 *   - An event that changed nothing relevant produces nothing at all.
 */

export type SubscriptionUpdate = {
  type: "subscription.updated";
  /** From Stripe's previous_attributes: only fields that CHANGED appear.
      undefined means "did not change in this event". */
  prevCancelAtPeriodEnd?: boolean;
  prevPaused?: boolean;
  next: {
    status: string;
    cancelAtPeriodEnd: boolean;
    paused: boolean;
  };
};

export type LifecycleEvent =
  | SubscriptionUpdate
  | { type: "subscription.deleted" }
  | {
      type: "invoice.payment_failed";
      attemptCount: number;
      hasNextAttempt: boolean;
    }
  | { type: "invoice.payment_succeeded"; attemptCount: number };

export type CustomerEmailKind =
  | "cancel_scheduled"
  | "cancel_reversed"
  | "cancelled"
  | "paused"
  | "resumed"
  | "payment_failed"
  | "payment_recovered";

export type AdminAlertKind =
  | "cancel_scheduled"
  | "cancelled"
  | "payment_failed";

export type Comm =
  | { channel: "customer_email"; kind: CustomerEmailKind }
  | { channel: "admin_alert"; kind: AdminAlertKind };

export function commsFor(event: LifecycleEvent): Comm[] {
  switch (event.type) {
    case "subscription.updated": {
      // A false→true flip on cancel_at_period_end is a cancellation being
      // scheduled; true→false is it being reversed. previous_attributes
      // only carries fields that changed, so undefined means untouched.
      if (
        event.prevCancelAtPeriodEnd === false &&
        event.next.cancelAtPeriodEnd
      ) {
        return [
          { channel: "customer_email", kind: "cancel_scheduled" },
          { channel: "admin_alert", kind: "cancel_scheduled" },
        ];
      }
      if (
        event.prevCancelAtPeriodEnd === true &&
        !event.next.cancelAtPeriodEnd
      ) {
        return [{ channel: "customer_email", kind: "cancel_reversed" }];
      }
      if (event.prevPaused === false && event.next.paused) {
        return [{ channel: "customer_email", kind: "paused" }];
      }
      if (event.prevPaused === true && !event.next.paused) {
        return [{ channel: "customer_email", kind: "resumed" }];
      }
      return [];
    }

    case "subscription.deleted":
      return [
        { channel: "customer_email", kind: "cancelled" },
        { channel: "admin_alert", kind: "cancelled" },
      ];

    case "invoice.payment_failed":
      return [
        { channel: "customer_email", kind: "payment_failed" },
        { channel: "admin_alert", kind: "payment_failed" },
      ];

    case "invoice.payment_succeeded":
      // The first attempt succeeding is normal life and gets no email
      // (Stripe sends the receipt). A LATER attempt succeeding means a
      // failure just resolved itself, and saying so closes the loop the
      // payment-failed email opened.
      return event.attemptCount > 1
        ? [{ channel: "customer_email", kind: "payment_recovered" }]
        : [];
  }
}
