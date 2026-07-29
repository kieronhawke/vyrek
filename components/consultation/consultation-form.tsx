"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: "get-fit", label: "Get fit and feel better" },
  { value: "lose-weight", label: "Lose weight" },
  { value: "first-hyrox", label: "Finish my first Hyrox" },
  { value: "improve-hyrox-time", label: "Improve my Hyrox time" },
  { value: "elite-ambitions", label: "Compete at a high level" },
  { value: "not-sure", label: "Not sure yet, help me work it out" },
];

const inputClasses =
  "h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-4 text-base text-suth-text placeholder:text-suth-text-tertiary focus:border-suth-accent focus:outline-none";

export function ConsultationForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!goal) {
      setError("Pick the goal that fits best.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, goal, message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError(
        "We couldn't submit your request just now. Email us directly at hello@suthperformance.com and Ben will come back to you.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-suth-accent/40 bg-suth-accent/[0.06] p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ Request received ]
        </p>
        <h2 className="mt-3 text-xl font-black tracking-[-0.02em] text-suth-text">
          You&apos;re booked in for a call back.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-suth-text-secondary">
          Ben will be in touch within one working day to arrange your free
          consultation. In the meantime, the three-minute quiz gives him a
          head start on your plan.
        </p>
        <a
          href="/quiz"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-pill bg-suth-accent px-5 text-sm font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background] duration-fast hover:bg-suth-accent-hover"
        >
          Take the quiz →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      <div>
        <label
          htmlFor="c-name"
          className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary"
        >
          Your name
        </label>
        <input
          id="c-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
          placeholder="First name is fine"
          autoComplete="name"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="c-email"
            className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary"
          >
            Email
          </label>
          <input
            id="c-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label
            htmlFor="c-phone"
            className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary"
          >
            Phone (optional)
          </label>
          <input
            id="c-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClasses}
            placeholder="For the call itself"
            autoComplete="tel"
          />
        </div>
      </div>
      <fieldset>
        <legend className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary">
          What are you working towards?
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoal(g.value)}
              aria-pressed={goal === g.value}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-pill border px-4 text-sm font-medium transition-[border,background] duration-fast",
                goal === g.value
                  ? "border-suth-accent bg-suth-accent text-[#0A0A0A]"
                  : "border-suth-border bg-suth-elevated text-suth-text hover:border-suth-border-strong",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label
          htmlFor="c-message"
          className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary"
        >
          Anything Ben should know? (optional)
        </label>
        <textarea
          id="c-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-suth-border bg-suth-elevated px-4 py-3 text-base text-suth-text placeholder:text-suth-text-tertiary focus:border-suth-accent focus:outline-none"
          placeholder="Injuries, race dates, how you're feeling about training, anything at all."
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-14 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background,opacity] duration-fast hover:bg-suth-accent-hover disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Request my free consultation"}
      </button>
      <p className="text-center text-xs leading-relaxed text-suth-text-tertiary">
        No card, no commitment, no pressure. Prefer email? Write to{" "}
        <a
          href="mailto:hello@suthperformance.com"
          className="text-suth-accent underline decoration-suth-accent/40 underline-offset-2"
        >
          hello@suthperformance.com
        </a>
        .
      </p>
    </form>
  );
}
