"use client";

import { useState } from "react";
import { ManageBillingButton } from "@/components/member/manage-billing-button";
import { CancelFlow } from "@/components/member/cancel-flow";

/**
 * Billing, and the way out of it.
 *
 * The row that said "Manage billing" linked to `/account` — a marketing route
 * with nothing to do with billing — so pressing it loaded a page that told
 * the member nothing. Meanwhile `ManageBillingButton` and the portal route it
 * posts to both already existed and were mounted nowhere.
 *
 * Cancelling sits next to it rather than buried, which is deliberate. Hiding
 * the exit does not keep anybody: it produces chargebacks and one-star
 * reviews, and in the UK it is a matter for the Consumer Protection from
 * Unfair Trading Regulations. What the flow behind it does is ask why, which
 * is the thing Ben genuinely cannot learn any other way.
 */
export function AccountBilling({
  firstName,
  hasSubscription,
}: {
  firstName: string;
  hasSubscription: boolean;
}) {
  const [cancelling, setCancelling] = useState(false);

  return (
    <div className="acctbill">
      <ManageBillingButton />

      <button
        type="button"
        className="acctbill__cancel"
        onClick={() => setCancelling(true)}
      >
        Cancel my membership
      </button>

      {!hasSubscription ? (
        <p className="acctbill__note">
          Billing detail appears once Stripe is connected to this account.
          Nothing here is invented in the meantime.
        </p>
      ) : null}

      {cancelling ? (
        <CancelFlow firstName={firstName} onClose={() => setCancelling(false)} />
      ) : null}
    </div>
  );
}
