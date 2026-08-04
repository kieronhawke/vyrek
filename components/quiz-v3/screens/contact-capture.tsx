"use client";

import { QuestionHeader } from "@/components/quiz-v3/question-header";
import {
  DIAL_CODES,
  dialCodeFor,
  placeholderFor,
  optionLabel,
  isPhoneValid,
} from "@/lib/dial-codes";

/**
 * WHO THEY ARE AND HOW BEN REACHES THEM.
 *
 * This replaced "Where should we send your plan?", which was asking for an
 * email so we could send something we are not offering. Nothing on this
 * route produces a plan: it produces a free thirty-minute call about their
 * fitness, and the screen should say the thing it is actually doing.
 *
 * THREE FIELDS, AND THE PHONE IS THE POINT. The whole route ends in Ben
 * ringing them, so a number is not optional here the way it is on a form
 * that only promises an email.
 *
 * THE DIALLING CODE IS A REAL PICKER. Somebody in Spain typing 612 34 56 78
 * into a box that assumes the UK produces a number nobody can ring, and
 * they never find out. The flag is beside the country's name rather than
 * standing in for it, because Windows renders regional-indicator pairs as
 * two letters, not a flag.
 *
 * The placeholder is that country's own format, so it teaches the shape
 * instead of showing a row of zeroes.
 */

export function isContactValid(
  name: string,
  email: string,
  iso: string,
  phone: string,
): boolean {
  return (
    name.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) &&
    isPhoneValid(iso, phone)
  );
}

export function ContactCaptureScreen({
  name,
  email,
  phoneIso,
  phone,
  onName,
  onEmail,
  onIso,
  onPhone,
  showError,
}: {
  name: string;
  email: string;
  phoneIso: string;
  phone: string;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onIso: (v: string) => void;
  onPhone: (v: string) => void;
  showError?: boolean;
}) {
  const country = dialCodeFor(phoneIso);
  const emailBad =
    showError && email.trim() !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const phoneBad = showError && phone.trim() !== "" && !isPhoneValid(phoneIso, phone);

  return (
    <div>
      <QuestionHeader
        question="Where can Ben reach you?"
        helper="He'll call you for the assessment. Nothing is shared with anybody else."
      />

      <div className="space-y-4">
        <Field label="Your name" hint="What Ben should call you.">
          <input
            type="text"
            value={name}
            autoComplete="given-name"
            onChange={(e) => onName(e.target.value)}
            placeholder="Sam"
            className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
          />
        </Field>

        <Field
          label="Email"
          hint="Where the confirmation lands."
          error={emailBad ? "That email address doesn't look right." : undefined}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
          />
        </Field>

        <Field
          label="Mobile"
          hint={`Ben calls this number. ${country.name} format.`}
          error={phoneBad ? "That number doesn't look right for that country." : undefined}
        >
          {/* Stacked on a phone, side by side from sm.
              The option text is "flag, country, code" now that the list is
              every country rather than thirty — a bare "+1" is not findable
              among two hundred, and a native select shows the chosen option's
              full text, which will not fit beside a phone box at 390px. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:shrink-0">
              <select
                aria-label="Country dialling code"
                value={phoneIso}
                onChange={(e) => onIso(e.target.value)}
                className="h-12 w-full appearance-none rounded-lg border border-suth-border bg-suth-base pl-3 pr-8 text-base text-suth-text outline-none transition-colors focus:border-suth-accent sm:w-[13rem]"
              >
                {DIAL_CODES.map((c) => (
                  // Name in the option text so typing "Spain" jumps to it.
                  <option key={c.iso} value={c.iso}>
                    {optionLabel(c)}
                  </option>
                ))}
              </select>
              <span
                aria-hidden
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-suth-text-tertiary"
              >
                ▾
              </span>
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
              placeholder={placeholderFor(phoneIso)}
              className="h-12 min-w-0 flex-1 rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
            />
          </div>
        </Field>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-suth-text-tertiary">
        No card, no commitment, and nobody else gets your details.
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </span>
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span role="alert" className="mt-1.5 block text-sm text-suth-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-suth-text-tertiary">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
