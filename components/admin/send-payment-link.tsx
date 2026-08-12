"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * THE ONE-CLICK HANDOFF, WITH THE RATE BEN ACTUALLY AGREED.
 *
 * Ben's existing clients are on all sorts of rates, so the price is a
 * field, not a menu: pick a preset or type the number he quoted. The link
 * goes out by email and text, the client taps through, pays, and their
 * account is created — card on file, collected monthly from then on.
 *
 * EVERY RESULT IS REPORTED HONESTLY from the API's own response: whether
 * the email went, whether the text went and as whom, and the link itself
 * either way — a delivery failure must never leave Ben with no way to
 * onboard somebody. (A previous version of this form hardcoded "SMS not
 * sent — no provider connected" regardless of what actually happened.)
 */

const PRESETS = [
  { key: "coaching-121", label: "1:1 Coaching", pounds: 220, soon: false },
  { key: "coaching-tier2", label: "Programming", pounds: 80, soon: false },
  // Visible so Ben knows it's on the way, disabled so nobody is invited
  // to a product that isn't ready.
  { key: "club", label: "Suth Club", pounds: 12.99, soon: true },
] as const;

type SendResult = {
  link?: string;
  shortLink?: boolean;
  secured?: boolean;
  error?: string;
  email?: { attempted: boolean; ok: boolean; reason: string | null; sandbox: boolean };
  sms?: {
    attempted: boolean;
    ok: boolean;
    reason: string | null;
    configured: boolean;
    sentAs: string | null;
    text: string | null;
  };
};

export function SendPaymentLink({
  initialName = "",
  initialEmail = "",
}: {
  /** Pre-filled when arriving from a customer page, e.g. the restart
      button on a cancelled client. */
  initialName?: string;
  initialEmail?: string;
} = {}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState<"payment" | "full">("payment");
  const [plan, setPlan] = useState<string>("coaching-121");
  const [customRate, setCustomRate] = useState(false);
  const [rate, setRate] = useState<string>("220");
  const [beginner, setBeginner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ratePence = Math.round(Number(rate.replace(/[£,\s]/g, "")) * 100);
  const rateValid =
    !customRate || (Number.isFinite(ratePence) && ratePence >= 100 && ratePence <= 100_000);

  const canSend =
    name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0) && rateValid;

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          kind,
          plan,
          ...(customRate ? { amountPence: ratePence } : {}),
          ...(beginner ? { rail: "beginner" } : {}),
        }),
      });
      const data = (await res.json()) as SendResult;
      if (!res.ok || !data.link) {
        setError(
          data.error === "AMOUNT_INVALID"
            ? "That rate doesn't look right. It needs to be between £1 and £1,000 a month."
            : data.error === "RATE_LIMITED"
              ? "Too many links in a short time. Wait a few minutes and try again."
              : (data.error ?? "Couldn't create the link."),
        );
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!result?.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* The link is on screen either way. */
    }
  }

  // text-base, not text-sm: an input under 16px makes iOS Safari zoom the
  // whole page on focus, which is the single fastest way for a form to
  // stop feeling like an app. h-12 puts every field at thumb size.
  const inputCls =
    "mt-1.5 block h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-3 text-base text-suth-text outline-none focus:border-suth-accent";
  const labelCls = "block text-xs font-medium text-suth-text-secondary";

  return (
    <div className="rounded-xl border border-suth-border bg-suth-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        Send a payment link
      </p>
      <p className="mt-2 text-sm text-suth-text-secondary">
        Their link, their rate. It goes by email and text; they set up their
        card once and it collects monthly.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelCls}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Sam Reeves"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className={labelCls}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="sam@example.com"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className={labelCls}>Mobile</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="07700 900123"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind("payment")}
          aria-pressed={kind === "payment"}
          className={`inline-flex h-11 items-center rounded-pill border px-4 text-sm font-medium transition-colors ${
            kind === "payment"
              ? "border-suth-accent bg-suth-accent text-[#0A0A0A]"
              : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong"
          }`}
        >
          Payment only · existing client
        </button>
        <button
          type="button"
          onClick={() => setKind("full")}
          aria-pressed={kind === "full"}
          className={`inline-flex h-11 items-center rounded-pill border px-4 text-sm font-medium transition-colors ${
            kind === "full"
              ? "border-suth-accent bg-suth-accent text-[#0A0A0A]"
              : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong"
          }`}
        >
          Full onboarding · new client
        </button>
      </div>
      <p className="mt-2 text-xs text-suth-text-tertiary">
        {kind === "payment"
          ? "Three taps: welcome, their plan, pay. For somebody Ben has already spoken to."
          : "The whole set-up: goals, injuries, availability, then plan and payment."}
      </p>

      <div className="mt-5">
        <span className={labelCls}>Plan &amp; rate</span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PRESETS.map((p) =>
            p.soon ? (
              <span
                key={p.key}
                className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-pill border border-suth-border-subtle px-4 text-sm text-suth-text-tertiary opacity-60"
                title="Suth Club opens for clients soon"
              >
                {p.label}
                <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
                  Coming soon
                </span>
              </span>
            ) : (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPlan(p.key);
                  setCustomRate(false);
                }}
                aria-pressed={plan === p.key && !customRate}
                className={`inline-flex h-11 items-center rounded-pill border px-4 text-sm font-medium transition-colors ${
                  plan === p.key && !customRate
                    ? "border-suth-accent bg-suth-accent/15 text-suth-accent"
                    : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong"
                }`}
              >
                {p.label} · £{p.pounds}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => setCustomRate(true)}
            aria-pressed={customRate}
            className={`inline-flex h-11 items-center rounded-pill border px-4 text-sm font-medium transition-colors ${
              customRate
                ? "border-suth-accent bg-suth-accent/15 text-suth-accent"
                : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong"
            }`}
          >
            Their rate…
          </button>
          {customRate ? (
            <label className="flex items-center gap-1.5">
              <span className="text-base text-suth-text">£</span>
              <input
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="h-12 w-28 rounded-md border border-suth-border bg-suth-elevated px-3 text-base text-suth-text outline-none focus:border-suth-accent"
                aria-label="Monthly rate in pounds"
              />
              <span className="text-xs text-suth-text-tertiary">a month</span>
            </label>
          ) : null}
        </div>
        {customRate ? (
          <p className="mt-2 text-xs text-suth-text-tertiary">
            The exact monthly figure Ben agreed with them. Charged from the
            first payment; no trial on an agreed rate.
          </p>
        ) : null}
        {!rateValid ? (
          <p className="mt-2 text-xs text-suth-danger">
            The rate needs to be between £1 and £1,000 a month.
          </p>
        ) : null}
      </div>

      {kind === "full" ? (
        <label className="mt-4 flex items-center gap-2 text-xs text-suth-text-secondary">
          <input
            type="checkbox"
            checked={beginner}
            onChange={(e) => setBeginner(e.target.checked)}
            className="h-4 w-4 accent-[#A3E635]"
          />
          General fitness client (keeps racing language out of their set-up)
        </label>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          onClick={send}
          disabled={busy || !canSend}
          className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Sending…" : "Send the link"}
        </button>
        {!canSend && name.trim() ? (
          <p className="mt-2 text-xs text-suth-text-tertiary sm:ml-3 sm:mt-0 sm:inline">
            Needs an email or a mobile number.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {result?.link ? (
        <div className="mt-5 rounded-lg border border-suth-accent/40 bg-suth-accent/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
              Link created
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-8 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
          <p className="mt-2 break-all font-mono text-[12px] text-suth-text">{result.link}</p>

          <ul className="mt-3 space-y-1 text-xs">
            <li className={result.email?.ok ? "text-emerald-300" : "text-suth-text-tertiary"}>
              {result.email?.ok
                ? `Email sent${result.email.sandbox ? ". It went via the Resend sandbox sender, which only delivers to the account owner. Verify the domain to reach clients." : ""}`
                : result.email?.attempted
                  ? `Email failed: ${result.email.reason ?? "unknown"}`
                  : "No email given, so send them the link yourself."}
            </li>
            <li className={result.sms?.ok ? "text-emerald-300" : "text-suth-text-tertiary"}>
              {result.sms?.ok
                ? `Text sent as ${result.sms.sentAs ?? "SUTH"}`
                : result.sms?.attempted
                  ? `Text not sent: ${result.sms.reason ?? (result.sms.configured ? "unknown" : "SMS not configured")}`
                  : "No mobile given, so no text was attempted."}
            </li>
            {result.secured === false ? (
              <li className="text-amber-300">
                This link is signed with the development fallback secret. Set
                ONBOARDING_SECRET in production.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
