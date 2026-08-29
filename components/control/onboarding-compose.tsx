"use client";

import { useState } from "react";
import { PLANS } from "@/lib/onboarding/model";
import {
  deliveryLine,
  sendSetupInvite,
  setupBlocker,
  type SetupResult,
} from "@/lib/control/setup-invite";

/**
 * SENDING THE SETUP LINK, WITH THE DETAIL THE CALL PRODUCED.
 *
 * This was a button labelled "Send the onboarding email". Ben rang somebody,
 * agreed a price on the call, and then met a control that could only offer
 * the published tiers — so the agreed figure lived in his head and got
 * applied by hand afterwards, or did not.
 *
 * Now the button opens this. It costs one extra tap and captures the two
 * things the call actually decided: which route they are on, and what he told
 * them it would cost.
 *
 * THE PRICE FIELD ONLY EXISTS WHEN HE SAYS THERE IS ONE. A money box sitting
 * open on every enquiry is a money box that eventually gets a number typed
 * into it by accident, and the accident charges somebody.
 *
 * IT REPORTS WHAT TRANSMITTED, NOT WHAT WAS ATTEMPTED. A tick over an email
 * that only reached the sandbox sender is how Ben stops chasing somebody who
 * never heard from him.
 */

/** The plan-select value meaning "a price you agreed on the call". */
const AGREED = "__agreed";

export function OnboardingCompose({
  name,
  email,
  phone,
  rail,
  onSent,
  onCancel,
}: {
  name: string;
  email: string;
  phone: string;
  /** The route they came down, so the link asks the right questions. */
  rail?: "beginner";
  /** Called once something has actually gone out, so the stage can move. */
  onSent: (summary: { link: string; agreedPence: number | null }) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"full" | "payment">("full");
  const [plan, setPlan] = useState("");
  const [agreed, setAgreed] = useState("");
  const [agreedName, setAgreedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);

  const request = {
    name,
    email,
    phone,
    kind,
    plan: plan === AGREED ? undefined : plan || undefined,
    agreedPrice: plan === AGREED ? agreed : undefined,
    agreedName: plan === AGREED ? agreedName : undefined,
    rail,
  };
  const blocked = setupBlocker(request);

  async function send() {
    setBusy(true);
    setError(null);
    const out = await sendSetupInvite(request);
    setBusy(false);
    if (!out.ok) {
      setError(out.message);
      return;
    }
    setResult(out.result);
    /* The stage moves only once something has been created. Advancing on the
       click would leave a lead marked "onboarding sent" after a failure, and
       nobody would ever look at it again. */
    onSent({ link: out.result.link, agreedPence: out.result.agreedPence ?? null });
  }

  if (result) {
    return (
      <div className="obc" role="status">
        <p className="obc__done">
          {deliveryLine(result)}
          {result.agreedPence
            ? ` Agreed price ${formatPence(result.agreedPence)} a month.`
            : ""}
        </p>
        <div className="obc__linkrow">
          <input
            readOnly
            value={result.link}
            className="obc__input obc__input--link"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            className="obc__copy"
            onClick={() => {
              navigator.clipboard.writeText(result.link).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {!result.secured ? (
          <p className="obc__warn">
            Signed with a development key. Set ONBOARDING_SECRET before sending
            this to a real client.
          </p>
        ) : null}
        <button type="button" className="obc__close" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="obc">
      <p className="obc__title">Send {name.split(/\s+/)[0]} their setup link</p>

      <div className="obc__grid">
        <label className="obc__field">
          <span className="obc__label">What to send</span>
          <select
            className="obc__input"
            value={kind}
            onChange={(e) => setKind(e.target.value as "full" | "payment")}
          >
            <option value="full">Full setup — questions, then pay</option>
            <option value="payment">Payment only — straight to the plan</option>
          </select>
        </label>

        <label className="obc__field">
          <span className="obc__label">Plan</span>
          <select
            className="obc__input"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="">Let them choose</option>
            {PLANS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} — {p.display} {p.cadence}
              </option>
            ))}
            <option value={AGREED}>A price you agreed on the call…</option>
          </select>
        </label>
      </div>

      {plan === AGREED ? (
        <div className="obc__grid">
          <label className="obc__field">
            <span className="obc__label">Agreed monthly price</span>
            <input
              className="obc__input"
              value={agreed}
              onChange={(e) => setAgreed(e.target.value)}
              inputMode="decimal"
              placeholder="150"
              autoComplete="off"
            />
          </label>
          <label className="obc__field">
            <span className="obc__label">Call it (optional)</span>
            <input
              className="obc__input"
              value={agreedName}
              onChange={(e) => setAgreedName(e.target.value)}
              placeholder="Your agreed plan"
              maxLength={40}
              autoComplete="off"
            />
          </label>
          <p className="obc__note">
            It leads their setup link, only theirs, and it is what Stripe
            charges. The price is signed into the link, so they cannot change
            it.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="obc__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="obc__actions">
        <button
          type="button"
          className="obc__send"
          onClick={() => void send()}
          disabled={busy || Boolean(blocked)}
        >
          {busy ? "Sending…" : "Send it"}
        </button>
        <button type="button" className="obc__cancel" onClick={onCancel}>
          Cancel
        </button>
        {/* Why the button is not lit. A dead control with no explanation is
            the commonest reason anybody abandons a form. */}
        {blocked ? <span className="obc__hint">{blocked}</span> : null}
      </div>
    </div>
  );
}

function formatPence(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}
