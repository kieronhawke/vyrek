"use client";

import { useState } from "react";
import { useCollection } from "@/lib/control/store";
import { PLANS } from "@/lib/onboarding/model";
import { SEED_ATHLETES, TIER_LABEL, TIER_ORDER, type Tier, type TrackedAthlete } from "@/lib/control/tracker";

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

type SendResult = {
  link: string;
  secured: boolean;
  email: { attempted: boolean; ok: boolean; reason: string | null; sandbox: boolean };
  sms: { attempted: boolean; ok: boolean; reason: string; text: string | null };
};

export function ClientIntake() {
  const athletes = useCollection<TrackedAthlete>("tracker", SEED_ATHLETES);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("121");
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState<"full" | "payment" | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ready = name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0);

  async function send(kind: "full" | "payment") {
    if (!ready) return;
    setBusy(kind);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, kind, plan: plan || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error === "CONTACT_REQUIRED"
            ? "Give an email address or a mobile number — otherwise there is nowhere to send it."
            : data?.error === "EMAIL_INVALID"
              ? "That email address does not look right."
              : "Could not create the invite. Try again.",
        );
        return;
      }

      // The client goes into the tracker at the same moment. A client who
      // exists but was never invited, or an invite with nobody behind it, is a
      // reconciliation job Ben would have to do by hand.
      const monthly = PLANS.find((p) => p.key === plan);
      athletes.add({
        id: `a_${Date.now().toString(36)}`,
        name: name.trim(),
        tier,
        programmedUntil: null,
        note: kind === "payment" ? "Payment link sent" : "Onboarding sent",
        monthly: monthly ? Math.round(monthly.pence / 100) : 0,
        paymentSet: false,
      });

      setResult(data as SendResult);
      setName("");
      setEmail("");
      setPhone("");
      setPlan("");
    } catch {
      setError("No connection. Nothing was sent.");
    } finally {
      setBusy(null);
    }
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
          </select>
        </label>
      </div>

      <div className="ci-actions">
        <button
          type="button"
          className="ci-send"
          onClick={() => send("full")}
          disabled={!ready || busy !== null}
        >
          {busy === "full" ? "Sending…" : "Send onboarding"}
        </button>
        <button
          type="button"
          className="ci-send ci-send--quiet"
          onClick={() => send("payment")}
          disabled={!ready || busy !== null}
        >
          {busy === "payment" ? "Sending…" : "Send payment link only"}
        </button>
        {!ready ? (
          <span className="ci-hint">A name, and either an email or a mobile.</span>
        ) : null}
      </div>

      {error ? (
        <p className="ci-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="ci-result" role="status">
          <p className="ci-result__head">Invite created.</p>

          <ul className="ci-channels">
            <li data-state={result.email.ok ? "ok" : result.email.attempted ? "failed" : "skipped"}>
              <strong>Email</strong>
              {result.email.ok
                ? result.email.sandbox
                  ? " sent — but the sending domain is not verified yet, so it only reaches your own address. Copy the link below and send it yourself until that is set up."
                  : " sent."
                : result.email.attempted
                  ? ` did not send: ${result.email.reason}. Copy the link below.`
                  : " not sent — no address given."}
            </li>
            <li data-state="failed">
              <strong>SMS</strong> not sent — there is no text provider connected
              yet. The message is below; send it from your phone.
            </li>
          </ul>

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
