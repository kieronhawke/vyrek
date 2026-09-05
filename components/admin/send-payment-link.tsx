"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CUSTOM_MAX_PENCE,
  CUSTOM_MIN_PENCE,
  displayPrice,
  parsePrice,
} from "@/lib/onboarding/model";
import {
  MAX_START_DAYS_AHEAD,
  parseStartDate,
  startDateBlocker,
  startDateISO,
  todayDay,
} from "@/lib/onboarding/start-date";
import {
  DUE_TODAY_MAX_PENCE,
  parseDueToday,
  paymentSchedule,
  scheduleLines,
} from "@/lib/onboarding/schedule";

/**
 * SETTING UP AN EXISTING CLIENT.
 *
 * Six fields: who they are, what they owe today, what they pay a month, and
 * when that starts. Ben types those, REVIEWS exactly what the client will
 * receive — the text word for word, the email as it will render, the money
 * as a table — and then presses send. The client taps the link, gives their
 * details, enters a card, and it collects every month from the date he chose.
 *
 * ── WHY THERE IS A REVIEW STEP ────────────────────────────────────────────
 * This form sends money instructions to a real person in Ben's name, by two
 * channels, and until now the first time he saw the actual words was in the
 * client's reply. A one-line summary above the button is not a review: it
 * is a paraphrase, and the thing that goes wrong is never the paraphrase.
 * The server renders the real messages without sending them, the panel
 * shows them, and only then is there a send button. A typo in the mobile
 * number is refused at review, not reported after the email has gone.
 *
 * ── WHAT USED TO BE HERE, AND WHY IT IS NOT ───────────────────────────────
 * A row of package pills, a toggle between "payment only" and "full
 * onboarding". The packages were not decoration: whichever pill was lit rode
 * along on the invite, so the client was shown that package's NAME under the
 * number Ben had agreed for something else — and the same name landed on
 * their Stripe receipt for ever. There is no package. There is a person,
 * what they owe, a number, and a date.
 */

type Schedule = {
  monthlyPence: number;
  dueTodayPence: number;
  deferred: boolean;
  startDay: number | null;
  todayPence: number;
  shape: string;
  lines: { today: string; monthly: string } | null;
  rows: { label: string; value: string }[] | null;
  sms: string | null;
};

type Preview = {
  preview?: true;
  to?: { name: string; firstName: string; email: string | null; phone: string | null };
  agreedPence?: number | null;
  dueTodayPence?: number;
  startsOn?: string | null;
  schedule?: Schedule | null;
  link?: string;
  shortLink?: boolean;
  secured?: boolean;
  email?: {
    attempted: boolean;
    configured: boolean;
    from: string | null;
    sandbox: boolean;
    subject: string;
    html: string;
    text: string;
  };
  sms?: {
    attempted: boolean;
    configured: boolean;
    sentAs: string;
    text: string | null;
    segments: number;
    gsm: boolean;
    reserved: boolean;
  };
  error?: string;
  detail?: string;
};

type SendResult = {
  link?: string;
  inviteId?: string | null;
  linkLength?: number;
  shortLink?: boolean;
  secured?: boolean;
  agreedPence?: number | null;
  dueTodayPence?: number;
  startsOn?: string | null;
  schedule?: Schedule | null;
  error?: string;
  detail?: string;
  email?: {
    attempted: boolean;
    ok: boolean;
    reason: string | null;
    subject?: string;
    sandbox: boolean;
  };
  sms?: {
    attempted: boolean;
    ok: boolean;
    reason: string | null;
    configured: boolean;
    sentAs: string | null;
    text: string | null;
  };
};

/** The server's refusal codes, said the way Ben would say them. */
function explain(data: { error?: string; detail?: string }): string {
  if (data.detail) return data.detail;
  switch (data.error) {
    case "PRICE_INVALID":
    case "AMOUNT_INVALID":
      return `That rate does not look right. A monthly figure between ${displayPrice(CUSTOM_MIN_PENCE)} and ${displayPrice(CUSTOM_MAX_PENCE)}.`;
    case "DUE_TODAY_INVALID":
      return `That balance does not look right. Leave it blank if nothing is owed, or a figure up to ${displayPrice(DUE_TODAY_MAX_PENCE)}.`;
    case "DUE_TODAY_NEEDS_RATE":
      return "A balance needs a monthly rate beside it.";
    case "PHONE_INVALID":
      return "That mobile number does not look right. A UK mobile like 07700 900123, or +44 for anything else.";
    case "EMAIL_INVALID":
      return "That email address does not look right.";
    case "START_DATE_INVALID":
      return "That start date does not look right.";
    case "RATE_LIMITED":
      return "Too many links in a short time. Wait a few minutes and try again.";
    case "CONTACT_REQUIRED":
      return "Give an email address or a mobile number.";
    case "UNAUTHORIZED":
      return "Your admin session has ended. Sign in again.";
    default:
      return "Could not create the link. Nothing was sent.";
  }
}

export function SendPaymentLink({
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  initialRate = "",
  initialDueToday = "",
  initialStart,
}: {
  /** Pre-filled when arriving from a customer page or a "send again". */
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialRate?: string;
  initialDueToday?: string;
  initialStart?: string;
} = {}) {
  const router = useRouter();
  const today = todayDay();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [dueToday, setDueToday] = useState(initialDueToday);
  const [rate, setRate] = useState(initialRate);
  const [startDate, setStartDate] = useState(() => {
    /* A "send again" carries the old date. If it has passed, start from
       today rather than pre-filling a date the server would refuse. */
    const d = initialStart ? parseStartDate(initialStart) : null;
    return d !== null && d >= today ? initialStart! : startDateISO(today);
  });
  const [stage, setStage] = useState<"edit" | "review" | "sent">("edit");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ratePence = parsePrice(rate);
  const duePence = parseDueToday(dueToday);
  const startDay = parseStartDate(startDate);
  const dateProblem = startDay === null ? "Pick a date." : startDateBlocker(startDay);

  /* One place decides whether this can go to review, and it explains itself.
     A disabled button with no reason is the commonest way a form stalls. */
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
            : duePence === null
              ? `That balance does not look right. Leave it blank if nothing is owed, or a figure up to ${displayPrice(DUE_TODAY_MAX_PENCE)}.`
              : dateProblem;

  /* What he is about to send, in the client's own words, while he types. */
  const liveLines =
    ratePence !== null && duePence !== null && startDay !== null && !dateProblem
      ? scheduleLines(
          paymentSchedule({
            amountPence: ratePence,
            dueTodayPence: duePence,
            startDay: startDay > today ? startDay : null,
          }),
        )
      : null;

  const body = () =>
    JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      // Fixed. This surface exists for one job.
      kind: "payment",
      agreedPrice: rate.trim(),
      dueToday: dueToday.trim(),
      startDate,
    });

  async function review() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(body()), preview: true }),
      });
      const data = (await res.json()) as Preview;
      if (!res.ok || !data.preview) {
        setError(explain(data));
        return;
      }
      setPreview(data);
      setStage("review");
    } catch {
      setError("Couldn't reach the server. Nothing was sent.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body(),
      });
      const data = (await res.json()) as SendResult;
      if (!res.ok || !data.link) {
        setError(explain(data));
        return;
      }
      setResult(data);
      setStage("sent");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Nothing was sent.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setDueToday("");
    setRate("");
    setStartDate(startDateISO(today));
    setPreview(null);
    setResult(null);
    setError(null);
    setStage("edit");
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
  const moneyCls =
    "block h-12 w-full rounded-md border border-suth-border bg-suth-elevated pl-7 pr-3 text-base text-suth-text outline-none focus:border-suth-accent";
  const labelCls = "block text-xs font-medium text-suth-text-secondary";
  const eyebrow = "font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary";
  const primary =
    "inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50 sm:w-auto";
  const secondary =
    "inline-flex h-12 w-full items-center justify-center rounded-pill border border-suth-border px-5 text-base text-suth-text hover:border-suth-border-strong disabled:opacity-50 sm:w-auto";

  /* ── SENT ─────────────────────────────────────────────────────────────── */
  if (stage === "sent" && result?.link) {
    return (
      <div className="rounded-xl border border-suth-accent/40 bg-suth-accent/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            Sent to {name.split(/\s+/)[0]}
          </p>
          <button type="button" onClick={copyLink} className="inline-flex h-9 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text">
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>

        {result.schedule?.lines ? (
          <p className="mt-2 text-sm text-suth-text">
            {result.schedule.lines.today} {result.schedule.lines.monthly}
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

        <p className="mt-4 text-xs text-suth-text-secondary">
          You&apos;ll get an email and a text the moment they finish setting up.
          Until then the link sits in the list below, where you can cancel it
          or send it again.
        </p>

        <div className="mt-4">
          <button type="button" onClick={reset} className={secondary}>
            Set up another client
          </button>
        </div>
      </div>
    );
  }

  /* ── REVIEW ───────────────────────────────────────────────────────────── */
  if (stage === "review" && preview) {
    const p = preview;
    const first = p.to?.firstName ?? name.split(/\s+/)[0];
    const emailWillSend = Boolean(p.email?.attempted && p.email.configured);
    const smsWillSend = Boolean(
      p.sms?.attempted && p.sms.configured && !p.sms.reserved && p.sms.text,
    );
    return (
      <div className="rounded-xl border border-suth-accent/40 bg-suth-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          Check before it goes
        </p>
        <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-suth-text">
          {p.to?.name ?? name} will receive this
        </h2>

        <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className={eyebrow}>Email</dt>
            <dd className={p.to?.email ? "text-suth-text" : "text-suth-text-tertiary"}>
              {p.to?.email ?? "None given — nothing will be emailed"}
            </dd>
          </div>
          <div>
            <dt className={eyebrow}>Mobile</dt>
            <dd className={p.to?.phone ? "text-suth-text" : "text-suth-text-tertiary"}>
              {p.to?.phone ?? "None given — no text"}
            </dd>
          </div>
        </dl>

        {p.schedule?.rows ? (
          <section className="mt-5">
            <p className={eyebrow}>What they&apos;ll pay</p>
            <dl className="mt-2 divide-y divide-suth-border rounded-md border border-suth-border">
              {p.schedule.rows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-4 px-3 py-2">
                  <dt className="text-xs text-suth-text-secondary">{r.label}</dt>
                  <dd className="num text-right text-sm text-suth-text">{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-suth-text-secondary">
              {p.schedule.lines ? `${p.schedule.lines.today} ${p.schedule.lines.monthly}` : null}{" "}
              They enter a card once; Stripe takes every payment after that.
            </p>
          </section>
        ) : null}

        {p.sms?.attempted ? (
          <section className="mt-5">
            <p className={eyebrow}>The text message</p>
            <div className="mt-2 max-w-md rounded-2xl rounded-tl-sm border border-suth-border bg-suth-elevated px-4 py-3 text-sm text-suth-text">
              {p.sms.text}
            </div>
            <p className={`mt-1.5 text-xs ${smsWillSend ? "text-suth-text-secondary" : "text-amber-300"}`}>
              {p.sms.reserved
                ? "That is a reserved test number. No text will be sent."
                : !p.sms.configured
                  ? "Texts are not switched on in this environment, so this will not send. The email still goes; copy the text and send it yourself if you need to."
                  : `${p.sms.segments} segment${p.sms.segments === 1 ? "" : "s"}, sent as ${p.sms.sentAs}.${p.sms.gsm ? "" : " Contains characters that halve each segment."}`}
            </p>
          </section>
        ) : null}

        {p.email?.attempted ? (
          <section className="mt-5">
            <p className={eyebrow}>The email</p>
            <p className="mt-2 text-xs text-suth-text-secondary">
              From <span className="text-suth-text">{p.email.from ?? "the default sender"}</span>
              {" · "}
              Subject <span className="text-suth-text">{p.email.subject}</span>
            </p>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={p.email.html}
              className="mt-2 h-[600px] w-full rounded-md border border-suth-border bg-white"
            />
            {!emailWillSend ? (
              <p className="mt-1.5 text-xs text-amber-300">
                Email is not switched on in this environment, so this will not send.
              </p>
            ) : p.email.sandbox ? (
              <p className="mt-1.5 text-xs text-amber-300">
                This goes via the Resend sandbox sender, which only delivers to the account owner.
              </p>
            ) : null}
          </section>
        ) : null}

        <p className="mt-4 text-xs text-suth-text-tertiary">
          The link shown is a sample of the right shape. The real one is created
          the moment you press send, and it works for 30 days.
          {p.secured === false
            ? " This environment signs links with the development fallback secret."
            : ""}
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={send} disabled={busy} className={primary}>
            {busy ? "Sending…" : `Send to ${first}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("edit");
              setError(null);
            }}
            disabled={busy}
            className={secondary}
          >
            Back to edit
          </button>
        </div>
      </div>
    );
  }

  /* ── EDIT ─────────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border border-suth-border bg-suth-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        Set up an existing client
      </p>
      <p className="mt-2 text-sm text-suth-text-secondary">
        Anything they owe today, their monthly rate, and when it starts. You
        check the text and the email before anything goes; they add a card once
        and it collects every month.
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

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelCls}>Owed today (optional)</span>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-suth-text-secondary">
              £
            </span>
            <input
              inputMode="decimal"
              value={dueToday}
              onChange={(e) => setDueToday(e.target.value)}
              className={moneyCls}
              placeholder="0"
              aria-label="Amount owed today in pounds"
              autoComplete="off"
            />
          </div>
        </label>
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
              className={moneyCls}
              placeholder="150"
              aria-label="Monthly rate in pounds"
              autoComplete="off"
            />
          </div>
        </label>
        <label className="block">
          <span className={labelCls}>First monthly payment</span>
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

      {/* What he is about to send, in the client's words, before he sends it. */}
      {liveLines ? (
        <p className="mt-3 rounded-md border border-suth-accent/30 bg-suth-accent/5 px-3 py-2 text-sm text-suth-text">
          {liveLines.today} {liveLines.monthly}
        </p>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={review}
          disabled={busy || Boolean(blocker)}
          className={primary}
        >
          {busy ? "Preparing…" : "Review before sending"}
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
    </div>
  );
}
