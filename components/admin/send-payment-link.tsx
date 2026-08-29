"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CUSTOM_MAX_PENCE, CUSTOM_MIN_PENCE, displayPrice, parsePrice } from "@/lib/onboarding/model";
import {
  MAX_START_DAYS_AHEAD,
  formatStartDate,
  parseStartDate,
  startDateBlocker,
  startDateISO,
  todayDay,
} from "@/lib/onboarding/start-date";

/**
 * SETTING UP AN EXISTING CLIENT.
 *
 * Five fields: who they are, what they pay, and when it starts. Ben types
 * those and presses send. The client taps the link, gives their details,
 * enters a card, and it collects every month from the date he chose.
 *
 * ── WHAT USED TO BE HERE, AND WHY IT IS NOT ───────────────────────────────
 * A row of package pills — 1:1 Coaching £220, Programming £80, a greyed-out
 * Suth Club — then a fourth pill, "Their rate…", which had to be tapped
 * before the £ box appeared at all. And a toggle between "payment only" and
 * "full onboarding".
 *
 * Two things were wrong with that. The small one: an agreed rate, which is
 * what every existing client is on, took an extra tap to reach and was not
 * the default. The large one: the packages were not decoration. Whichever
 * pill was lit rode along on the invite, so the client was shown that
 * package's NAME and its five feature bullets underneath the number Ben had
 * agreed for something else — and the same package name landed on their
 * Stripe receipt for ever after. Worse, the default state of this form was a
 * lit "1:1 Coaching · £220" pill with no rate entered, so the happy path —
 * type a name, type an email, press send — sent somebody a link charging
 * £220 and offering them a menu.
 *
 * There is no package. There is a person, a number, and a date.
 */

type SendResult = {
  link?: string;
  linkLength?: number;
  shortLink?: boolean;
  secured?: boolean;
  agreedPence?: number | null;
  startsOn?: string | null;
  error?: string;
  detail?: string;
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
  const today = todayDay();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(startDateISO(today));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ratePence = parsePrice(rate);
  const startDay = parseStartDate(startDate);
  const dateProblem = startDay === null ? "Pick a date." : startDateBlocker(startDay);

  /* One place decides whether this can be sent, and it explains itself. A
     disabled button with no reason is the commonest way a form stalls. */
  const blocker: string | null = !name.trim()
    ? "A name, so the link can greet them."
    : !email.trim() && !phone.trim()
      ? "An email or a mobile — otherwise there is nowhere to send it."
      : email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
        ? "That email address does not look right."
        : !rate.trim()
          ? "What are they paying a month?"
          : ratePence === null
            ? `That rate does not look right. A monthly figure between ${displayPrice(CUSTOM_MIN_PENCE)} and ${displayPrice(CUSTOM_MAX_PENCE)}.`
            : dateProblem;

  const startsToday = startDay !== null && startDay <= today;

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
          // Fixed. This surface exists for one job.
          kind: "payment",
          agreedPrice: rate.trim(),
          startDate,
        }),
      });
      const data = (await res.json()) as SendResult;
      if (!res.ok || !data.link) {
        setError(
          data.detail ??
            (data.error === "PRICE_INVALID" || data.error === "AMOUNT_INVALID"
              ? `That rate does not look right. A monthly figure between ${displayPrice(CUSTOM_MIN_PENCE)} and ${displayPrice(CUSTOM_MAX_PENCE)}.`
              : data.error === "START_DATE_INVALID"
                ? "That start date does not look right."
                : data.error === "RATE_LIMITED"
                  ? "Too many links in a short time. Wait a few minutes and try again."
                  : data.error === "CONTACT_REQUIRED"
                    ? "Give an email address or a mobile number."
                    : "Could not create the link. Nothing was sent."),
        );
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Nothing was sent.");
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
        Set up an existing client
      </p>
      <p className="mt-2 text-sm text-suth-text-secondary">
        Their rate, their start date. The link goes out by email and text; they
        add a card once and it collects every month.
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
            inputMode="email"
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
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="07700 900123"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Monthly rate</span>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-suth-text-secondary">
              £
            </span>
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="block h-12 w-full rounded-md border border-suth-border bg-suth-elevated pl-7 pr-3 text-base text-suth-text outline-none focus:border-suth-accent"
              placeholder="150"
              aria-label="Monthly rate in pounds"
              autoComplete="off"
            />
          </div>
        </label>
        <label className="block">
          <span className={labelCls}>First payment</span>
          <input
            type="date"
            value={startDate}
            min={startDateISO(today)}
            /* Stripe will not anchor a monthly cycle further out than this,
               and the place to find that out is here rather than at the
               moment a client is trying to pay. */
            max={startDateISO(today + MAX_START_DAYS_AHEAD)}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* What he is about to send, in one sentence, before he sends it. */}
      {ratePence !== null && startDay !== null && !dateProblem ? (
        <p className="mt-3 rounded-md border border-suth-accent/30 bg-suth-accent/5 px-3 py-2 text-sm text-suth-text">
          {displayPrice(ratePence)} a month
          {startsToday
            ? ", collected as soon as they enter a card."
            : `, first payment on ${formatStartDate(startDay)}, then monthly.`}
        </p>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={send}
          disabled={busy || Boolean(blocker)}
          className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Sending…" : "Send the link"}
        </button>
        {blocker ? (
          <p className="mt-2 text-xs text-suth-text-tertiary sm:ml-3 sm:mt-0 sm:inline">
            {blocker}
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
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
              className="inline-flex h-9 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>

          {result.agreedPence ? (
            <p className="mt-2 text-sm text-suth-text">
              {displayPrice(result.agreedPence)} a month
              {result.startsOn
                ? `, first payment ${formatStartDate(parseStartDate(result.startsOn)!)}.`
                : ", collected when they enter a card."}
            </p>
          ) : null}

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
