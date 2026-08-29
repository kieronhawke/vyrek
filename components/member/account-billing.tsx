"use client";

import { useEffect, useState } from "react";
import { ManageBillingButton } from "@/components/member/manage-billing-button";
import { CancelFlow } from "@/components/member/cancel-flow";
import {
  billingHeadline,
  formatCard,
  formatDate,
  formatMoney,
  formatRecurring,
  nextEventDate,
  nextEventLabel,
  type BillingSummary,
} from "@/lib/member/billing";

/**
 * Billing, and the way out of it.
 *
 * WHAT IT USED TO BE
 * A button that opened Stripe, and a line saying detail would appear one day.
 * So the two questions anybody actually opens a billing page to answer — when
 * does this next come out, and how much — were four taps away on somebody
 * else's website, and the page that was supposed to answer them said nothing.
 *
 * WHAT IT IS NOW
 * The facts on the page, read live from the subscription, and the portal for
 * changing them. Stripe's Billing Portal cannot be embedded: it sends
 * X-Frame-Options: DENY, which is what stops a hostile page framing somebody's
 * card details, so an iframe was never on the table. Reading here and writing
 * there is as close to in-page as this gets without reimplementing Stripe's
 * screens against their API — which would mean owning the compliance for a
 * card form, and getting a renewal date subtly wrong on somebody's money.
 *
 * NOTHING IS INVENTED. Every value is nullable and renders as absent rather
 * than as a plausible guess. Somebody budgets around this number.
 *
 * CANCELLING SITS NEXT TO IT rather than buried. Hiding the exit does not
 * keep anybody: it produces chargebacks and one-star reviews, and in the UK
 * it is a matter for the Consumer Protection from Unfair Trading Regulations.
 * What the flow behind it does is ask why, which is the thing Ben genuinely
 * cannot learn any other way.
 */

type State =
  | { kind: "loading" }
  | { kind: "none"; reason: string }
  | { kind: "ready"; summary: BillingSummary }
  | { kind: "error" };

export function AccountBilling({
  firstName,
  hasSubscription,
}: {
  firstName: string;
  hasSubscription: boolean;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/subscription");
        /* Not signed in is not a fault. It happens in the demo shell, and
           "something went wrong" there would be a lie about a working app. */
        if (res.status === 401) {
          if (!dead) setState({ kind: "none", reason: "AUTH_REQUIRED" });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as {
          subscription: BillingSummary | null;
          reason?: string;
        };
        if (dead) return;
        setState(
          body.subscription
            ? { kind: "ready", summary: body.subscription }
            : { kind: "none", reason: body.reason ?? "NO_SUBSCRIPTION" },
        );
      } catch {
        if (!dead) setState({ kind: "error" });
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  return (
    <div className="acctbill">
      {state.kind === "loading" ? (
        <p className="acctbill__note">Checking your subscription…</p>
      ) : null}

      {state.kind === "ready" ? <Summary summary={state.summary} /> : null}

      {state.kind === "none" ? (
        <p className="acctbill__note">
          {hasSubscription
            ? "Your subscription detail is not readable at the moment. Manage billing still works."
            : "There is no subscription on this account yet. Nothing is being charged."}
        </p>
      ) : null}

      {state.kind === "error" ? (
        /* Says what is wrong and leaves the door open. A billing panel that
           cannot read is not a billing panel that cannot act. */
        <p className="acctbill__note">
          Could not read your billing detail just now. Manage billing still
          opens Stripe, where everything is up to date.
        </p>
      ) : null}

      <div className="acctbill__actions">
        <ManageBillingButton />
        <button
          type="button"
          className="acctbill__cancel"
          onClick={() => setCancelling(true)}
        >
          Cancel my membership
        </button>
      </div>

      {cancelling ? (
        <CancelFlow firstName={firstName} onClose={() => setCancelling(false)} />
      ) : null}
    </div>
  );
}

function Summary({ summary }: { summary: BillingSummary }) {
  const recurring = formatRecurring(
    summary.amount,
    summary.currency,
    summary.interval,
    summary.intervalCount,
  );
  const when = formatDate(nextEventDate(summary));
  const card = formatCard(summary.card);
  const paid = summary.invoices.filter((i) => i.paid);

  return (
    <div className="acctbill__summary">
      <div className="acctbill__top">
        <span
          className="acctbill__status"
          data-tone={toneFor(summary)}
        >
          {billingHeadline(summary)}
        </span>
        {summary.planName ? (
          <span className="acctbill__plan">{summary.planName}</span>
        ) : null}
      </div>

      <dl className="acctbill__facts">
        {recurring ? (
          <div>
            <dt>Price</dt>
            <dd>{recurring}</dd>
          </div>
        ) : null}
        {when ? (
          <div>
            <dt>{nextEventLabel(summary)}</dt>
            <dd>{when}</dd>
          </div>
        ) : null}
        {card ? (
          <div>
            <dt>Card</dt>
            <dd>{card}</dd>
          </div>
        ) : null}
      </dl>

      {summary.status === "past_due" || summary.status === "unpaid" ? (
        /* The one state worth interrupting for. Everything else can wait
           until they scroll; a failed payment ends the membership if it is
           ignored, and most people have simply changed card. */
        <p className="acctbill__alert">
          The last payment did not go through. Updating your card in Manage
          billing fixes it, and nothing else changes.
        </p>
      ) : null}

      {paid.length > 0 ? (
        <details className="acctbill__invoices">
          <summary>Payments</summary>
          <ul>
            {paid.map((inv) => (
              <li key={inv.id}>
                <span>{formatDate(inv.date) ?? "—"}</span>
                <span>{formatMoney(inv.amount, inv.currency)}</span>
                {/* Stripe's hosted receipt. Rendering one ourselves would
                    mean reproducing tax lines and credit notes, and getting
                    either wrong on a document somebody files with their
                    accounts is worse than a link out. */}
                {inv.url ? (
                  <a href={inv.url} target="_blank" rel="noreferrer noopener">
                    Receipt ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function toneFor(s: BillingSummary): "ok" | "warn" | "off" {
  if (s.status === "past_due" || s.status === "unpaid") return "warn";
  if (s.status === "canceled" || s.endingAtPeriodEnd) return "off";
  return "ok";
}
