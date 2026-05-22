"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/shared/eyebrow";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Screen 15 — capture the email before plan reveal. Single input, 16px
 * font-size (prevents iOS auto-zoom), trust line below, mono helper.
 */
export function EmailGateScreen({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  error: string | null;
}) {
  const [touched, setTouched] = useState(false);
  const showError = error || (touched && value && !EMAIL_RE.test(value));

  return (
    <div>
      <h1 className="text-2xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-3xl">
        Where should we send your plan?
      </h1>
      <Eyebrow className="mt-3 block !text-vyrek-text-secondary">
        We&apos;ll save it to this email so you can come back anytime.
      </Eyebrow>

      <div className="mt-8">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={value}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="you@email.com"
          className="h-14 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-base text-vyrek-text outline-none transition-colors focus:border-vyrek-accent placeholder:text-vyrek-text-tertiary"
        />
        {showError && (
          <p
            className="mt-2 text-sm text-vyrek-danger"
            role="alert"
            aria-live="polite"
          >
            {error ?? "Enter a valid email address."}
          </p>
        )}
        <p className="mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          [ TRIAL STARTS WHEN YOU SUBSCRIBE · NO CHARGE YET ]
        </p>
        <p className="mt-4 text-sm text-vyrek-text-secondary">
          We won&apos;t spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}
