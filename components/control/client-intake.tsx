"use client";

import { useState } from "react";
import { useCollection } from "@/lib/control/store";
import { PLANS, parsePrice } from "@/lib/onboarding/model";
import {
  deliveryLine,
  sendSetupInvite,
  setupBlocker,
  type SetupResult,
} from "@/lib/control/setup-invite";

/** The plan-select value meaning "a price Ben agreed on the call". */
const AGREED = "__agreed";
import { SEED_ATHLETES, TIER_LABEL, TIER_ORDER, TRACKER_KEY, type Tier, type TrackedAthlete } from "@/lib/control/tracker";

/**
 * ADD A CLIENT, AND SEND THEM THE LINK.
 *
 * Ben's whole intake, in one place: type a name, an email and a phone number,
 * press one button. The client lands in the tracker at the same moment the
 * invite goes out, because a client who exists but has not been invited and an
 * invite with no client behind it are both states he would have to reconcile
 * by hand.
 *
 * TWO BUTTONS, BECAUSE HE HAS TWO SITUATIONS. "Send onboarding" is the full
 * flow for somebody new. "Send payment link" is for somebody he has already
 * talked through everything with — it skips the questions and goes to the
 * plan. He asked for both.
 *
 * IT TELLS HIM WHAT ACTUALLY HAPPENED. Email is real and genuinely sends. SMS
 * has no provider, so the text is composed and handed to him to send himself,
 * and the panel says that in as many words rather than showing a tick. A green
 * tick for a message that was never transmitted is the worst thing this screen
 * could do — he would stop chasing.
 */

export function ClientIntake() {
  const athletes = useCollection<TrackedAthlete>(TRACKER_KEY, SEED_ATHLETES);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("coaching");
  const [plan, setPlan] = useState("");
  const [agreed, setAgreed] = useState("");
  const [agreedName, setAgreedName] = useState("");
  const [busy, setBusy] = useState<"full" | "payment" | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function request(kind: "full" | "payment") {
    return {
      name,
      email,
      phone,
      kind,
      plan: plan === AGREED ? undefined : plan || undefined,
      agreedPrice: plan === AGREED ? agreed : undefined,
      agreedName: plan === AGREED ? agreedName : undefined,
    };
  }

  /* Why the buttons are not lit, rather than two dead controls. The blocker
     is the same one the API enforces, so the screen and the server cannot
     disagree about what is missing. */
  const blocked = setupBlocker(request("full"));

  async function send(kind: "full" | "payment") {
    if (blocked) return;
    setBusy(kind);
    setError(null);
    setResult(null);
    setCopied(false);

    const out = await sendSetupInvite(request(kind));
    setBusy(null);
    if (!out.ok) {
      setError(out.message);
      return;
    }

    // The client goes into the tracker at the same moment. A client who
    // exists but was never invited, or an invite with nobody behind it, is a
    // reconciliation job Ben would have to do by hand.
    const standard = PLANS.find((p) => p.key === plan);
    const agreedPence = plan === AGREED ? parsePrice(agreed) : null;
    athletes.add({
      id: `a_${Date.now().toString(36)}`,
      name: name.trim(),
      tier,
      programmedUntil: null,
      note:
        agreedPence !== null
          ? `Agreed price sent`
          : kind === "payment"
            ? "Payment link sent"
            : "Onboarding sent",
      /* The agreed figure goes on the tracker row too, so the monthly total
         is right the moment they pay rather than after somebody remembers to
         correct it. */
      monthly:
        agreedPence !== null
          ? Math.round(agreedPence / 100)
          : standard
            ? Math.round(standard.pence / 100)
            : 0,
      paymentSet: false,
    });

    setResult(out.result);
    setName("");
    setEmail("");
    setPhone("");
    setPlan("");
    setAgreed("");
    setAgreedName("");
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="ci" aria-label="Add a client">
      <h2 className="ci-title">Add a client</h2>
      <p className="ci-blurb">
        They get a link that walks them through setting up and paying. Nothing
        needs doing at your end afterwards.
      </p>

      <div className="ci-fields">
        <label className="ci-field">
          <span className="eyebrow">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sam Reeves"
            className="ci-input"
            autoComplete="off"
          />
        </label>
        <label className="ci-field">
          <span className="eyebrow">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sam@example.com"
            className="ci-input"
            autoComplete="off"
          />
        </label>
        <label className="ci-field">
          <span className="eyebrow">Mobile</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07700 900000"
            className="ci-input"
            autoComplete="off"
          />
        </label>
        <label className="ci-field">
          <span className="eyebrow">Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
            className="ci-input"
          >
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="ci-field ci-field--wide">
          <span className="eyebrow">Plan (optional)</span>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className="ci-input">
            <option value="">Let them choose</option>
            {PLANS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} — {p.display} {p.cadence}
              </option>
            ))}
            <option value={AGREED}>A price you agreed on the call…</option>
          </select>
        </label>

        {/* Only once he says there is one. A money field open on every
            intake is a money field somebody eventually fills in by accident. */}
        {plan === AGREED ? (
          <>
            <label className="ci-field">
              <span className="eyebrow">Agreed monthly price</span>
              <input
                value={agreed}
                onChange={(e) => setAgreed(e.target.value)}
                inputMode="decimal"
                placeholder="150"
                className="ci-input"
                autoComplete="off"
              />
            </label>
            <label className="ci-field">
              <span className="eyebrow">Call it (optional)</span>
              <input
                value={agreedName}
                onChange={(e) => setAgreedName(e.target.value)}
                placeholder="Your agreed plan"
                maxLength={40}
                className="ci-input"
                autoComplete="off"
              />
            </label>
            <p className="ci-hint ci-field--wide">
              It appears first on their link, only on theirs, and it is what
              Stripe charges. The price is signed into the link, so they
              cannot change it.
            </p>
          </>
        ) : null}
      </div>

      <div className="ci-actions">
        <button
          type="button"
          className="ci-send"
          onClick={() => send("full")}
          disabled={Boolean(blocked) || busy !== null}
        >
          {busy === "full" ? "Sending…" : "Send onboarding"}
        </button>
        <button
          type="button"
          className="ci-send ci-send--quiet"
          onClick={() => send("payment")}
          disabled={Boolean(blocked) || busy !== null}
        >
          {busy === "payment" ? "Sending…" : "Send payment link only"}
        </button>
        {blocked ? <span className="ci-hint">{blocked}</span> : null}
      </div>

      {error ? (
        <p className="ci-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="ci-result" role="status">
          <p className="ci-result__head">Invite created.</p>

          <p className="ci-delivery">
            {deliveryLine(result)}
            {result.agreedPence
              ? ` Agreed price £${(result.agreedPence / 100)
                  .toFixed(2)
                  .replace(/\.00$/, "")} a month.`
              : ""}
          </p>

          <label className="ci-field">
            <span className="eyebrow">The link</span>
            <input readOnly value={result.link} className="ci-input ci-link" onFocus={(e) => e.currentTarget.select()} />
          </label>
          <button type="button" className="ci-copy" onClick={() => copy(result.link)}>
            {copied ? "Copied" : "Copy link"}
          </button>

          {result.sms.text ? (
            <label className="ci-field">
              <span className="eyebrow">Text to send</span>
              <textarea readOnly value={result.sms.text} rows={3} className="ci-input" />
            </label>
          ) : null}

          {!result.secured ? (
            <p className="ci-warn">
              This link is signed with a development key. Set ONBOARDING_SECRET
              before using it with a real client.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
