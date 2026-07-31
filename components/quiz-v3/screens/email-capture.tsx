"use client";

import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";

/**
 * Mid-flow email capture, placed roughly a third of the way in, straight
 * after the value interstitial and before the long tail of logistics
 * questions.
 *
 * The old quiz asked for an email only on the final screen, behind a
 * password. That made the ~60% who leave mid-quiz completely unreachable:
 * no abandonment sequence is possible if you never learn who they were.
 * Capturing here is the single change that unlocks that recovery, and it is
 * where Noom asks too.
 *
 * One field. No password. The account is finished later without the user
 * typing their address twice.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 5.1, screen 6.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValid(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function EmailCaptureScreen({
  value,
  marketingOptIn,
  onChange,
  onMarketingChange,
  showError,
}: {
  value: string;
  marketingOptIn: boolean;
  onChange: (v: string) => void;
  onMarketingChange: (v: boolean) => void;
  showError?: boolean;
}) {
  const invalid = showError && !isEmailValid(value);

  return (
    <div>
      <QuestionHeader
        question="Where should we send your plan?"
        helper="So you can pick this up on any device, and we can send your first week through."
      />

      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-suth-text-tertiary">
          Email
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="you@email.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "email-error" : undefined}
          className={`h-14 w-full rounded-md border bg-suth-elevated px-4 text-base text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary/60 focus:border-suth-accent ${
            invalid ? "border-suth-accent" : "border-suth-border"
          }`}
        />
      </label>

      {invalid ? (
        <p id="email-error" className="mt-2 text-sm text-suth-accent">
          That doesn&apos;t look like an email address. Mind checking it?
        </p>
      ) : null}

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-suth-text-secondary">
        <span className="relative mt-0.5 inline-flex size-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => onMarketingChange(e.target.checked)}
            className={cn(
              "peer size-5 cursor-pointer appearance-none rounded border border-suth-border bg-suth-elevated",
              "checked:border-suth-accent checked:bg-suth-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-suth-accent/40",
            )}
          />
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="pointer-events-none absolute size-3.5 text-[#0A0A0A] opacity-0 peer-checked:opacity-100"
          >
            <path
              d="M3 8.5l3.2 3L13 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="leading-snug">
          Send me Ben&apos;s weekly email: one idea, one session, one nudge.
          Unsubscribe in one click.
        </span>
      </label>

      <p className="mt-6 text-xs leading-relaxed text-suth-text-tertiary">
        We&apos;ll never sell your details. Your plan is saved against this
        address so you can come back to it.
      </p>
    </div>
  );
}
