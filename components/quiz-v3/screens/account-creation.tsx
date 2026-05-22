"use client";

import { useState } from "react";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";

export function AccountCreationScreen({
  email,
  password,
  marketingOptIn,
  error,
  onEmailChange,
  onPasswordChange,
  onMarketingChange,
}: {
  email: string;
  password: string;
  marketingOptIn: boolean;
  error: string | null;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onMarketingChange: (v: boolean) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <QuestionHeader
        question="Save your plan"
        helper="Create an account so you can pick this up anytime."
      />

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-vyrek-text-tertiary">
            Email
          </span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@email.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-14 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-base text-vyrek-text outline-none transition-colors focus:border-vyrek-accent"
            aria-invalid={!!error}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-vyrek-text-tertiary">
            Password (8+ characters)
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-14 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 pr-20 text-base text-vyrek-text outline-none transition-colors focus:border-vyrek-accent"
              aria-invalid={!!error}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-3 py-1 text-xs uppercase tracking-[0.15em] text-vyrek-text-secondary hover:text-vyrek-text"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-3 py-2 text-sm text-vyrek-text-secondary">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => onMarketingChange(e.target.checked)}
            className={cn(
              "size-5 cursor-pointer rounded border-vyrek-border bg-vyrek-elevated",
              "appearance-none border checked:border-vyrek-accent checked:bg-vyrek-accent",
            )}
          />
          <span>Email me Vyrek updates (optional)</span>
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-vyrek-danger/40 bg-vyrek-danger/10 px-3 py-2 text-sm text-vyrek-danger"
          >
            {error}
          </p>
        ) : null}

        <p className="pt-2 text-xs leading-relaxed text-vyrek-text-tertiary">
          We won&apos;t spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

export function validateAccountForm(
  email: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be 8+ characters." };
  }
  return { ok: true };
}
