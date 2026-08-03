"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DRAFT_KEY = "suth:partners:apply:draft:v1";

/**
 * Stage 12 (PART 11.4) — Partner application wizard.
 *
 * 11 sequential screens per spec, each focused on a single decision so the
 * application feels quiz-like rather than form-like. The final screen
 * confirms and submits to the same POST /api/partners/apply endpoint the
 * earlier single-page form used; the payload shape is unchanged so the
 * server route is untouched.
 *
 * Screens:
 *   1.  Welcome
 *   2.  Name
 *   3.  Email
 *   4.  Country
 *   5.  Primary platform
 *   6.  Follower count
 *   7.  Content description
 *   8.  Why Suth Performance
 *   9.  Primary URL
 *  10.  Past affiliate experience (optional)
 *  11.  Promotion methods + terms + submit
 */

type Status = "idle" | "submitting" | "success" | "error";

type Answers = {
  name: string;
  email: string;
  country: string;
  platform: string;
  followerCount: string;
  contentDescription: string;
  whySuth: string;
  primaryUrl: string;
  pastAffiliate: string;
  promotionMethods: string[];
  termsAccepted: boolean;
};

const INITIAL: Answers = {
  name: "",
  email: "",
  country: "",
  platform: "",
  followerCount: "",
  contentDescription: "",
  whySuth: "",
  primaryUrl: "",
  pastAffiliate: "",
  promotionMethods: [],
  termsAccepted: false,
};

const PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Blog",
  "Newsletter",
  "Discord",
  "In-person community",
  "Other",
] as const;

const FOLLOWERS = [
  "Under 1K",
  "1K to 5K",
  "5K to 20K",
  "20K to 50K",
  "50K to 200K",
  "200K+",
] as const;

const PROMOTION = [
  "Organic posts",
  "Paid ads",
  "Newsletter",
  "Video reviews",
  "In-app integration",
  "Other",
] as const;

const TOTAL_SCREENS = 11;

export function PartnerApplicationForm() {
  const [screen, setScreen] = useState(1);
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore any in-flight draft on mount. The partner application was
  // previously component-state only; refreshing the tab on step 9 dropped
  // everything. Now we mirror the quiz pattern and persist as the user
  // progresses.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          answers?: Partial<Answers>;
          screen?: number;
        };
        if (parsed.answers) {
          setAnswers((prev) => ({ ...prev, ...parsed.answers }));
        }
        if (typeof parsed.screen === "number") {
          setScreen(Math.max(1, Math.min(TOTAL_SCREENS, parsed.screen)));
        }
      }
    } catch {
      // bad / non-JSON draft, ignore
    }
    setHydrated(true);
  }, []);

  // Persist after every change once hydrated. Skipped before hydration so
  // we don't overwrite the stored draft with the INITIAL defaults.
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ answers, screen }),
      );
    } catch {
      // quota exceeded or disabled; non-fatal
    }
  }, [answers, screen, hydrated]);

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  function togglePromotion(method: string) {
    setAnswers((prev) => {
      const set = new Set(prev.promotionMethods);
      if (set.has(method)) set.delete(method);
      else set.add(method);
      return { ...prev, promotionMethods: Array.from(set) };
    });
  }

  function canAdvance(): boolean {
    switch (screen) {
      case 1:
        return true;
      case 2:
        return answers.name.trim().length > 1;
      case 3:
        return /.+@.+\..+/.test(answers.email.trim());
      case 4:
        return answers.country.trim().length > 1;
      case 5:
        return Boolean(answers.platform);
      case 6:
        return Boolean(answers.followerCount);
      case 7:
        return answers.contentDescription.trim().length >= 12;
      case 8:
        return answers.whySuth.trim().length >= 20;
      case 9:
        return /^https?:\/\/.+\..+/.test(answers.primaryUrl.trim());
      case 10:
        return true;
      case 11:
        return (
          answers.promotionMethods.length > 0 && answers.termsAccepted
        );
      default:
        return false;
    }
  }

  async function submit() {
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: answers.name.trim(),
          email: answers.email.trim(),
          country: answers.country.trim(),
          platform: answers.platform,
          followerCount: answers.followerCount,
          contentDescription: answers.contentDescription.trim(),
          whySuth: answers.whySuth.trim(),
          primaryUrl: answers.primaryUrl.trim(),
          pastAffiliate: answers.pastAffiliate.trim(),
          promotionMethods: answers.promotionMethods,
          termsAccepted: answers.termsAccepted,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(
          data.error ?? "Something went wrong. Please try again.",
        );
        return;
      }
      setStatus("success");
      clearDraft();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Network error. Please try again.",
      );
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="mt-12 rounded-lg border border-suth-accent/40 bg-suth-elevated p-8 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ APPLICATION RECEIVED ]
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-suth-text md:text-4xl">
          Thanks. We will review within 48 hours.
        </h2>
        <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
          You will hear back at the email you provided. If approved, the
          email contains an onboarding link to set your partner code and
          payout details.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12" aria-label="Partner application">
      <ProgressBar screen={screen} total={TOTAL_SCREENS} />

      <form
        className="mt-8 rounded-lg border border-suth-border-subtle bg-suth-elevated/50 p-6 md:p-10"
        onSubmit={(e) => {
          e.preventDefault();
          if (screen < TOTAL_SCREENS) {
            if (canAdvance()) setScreen(screen + 1);
          } else if (canAdvance() && status !== "submitting") {
            submit();
          }
        }}
        noValidate
      >
        {screen === 1 && (
          <Screen
            eyebrow="Welcome"
            title="Apply to the Suth Performance Partner Programme"
            help="About three minutes. Eleven short questions about you and your audience."
          >
            <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              We&apos;re looking for creators, coaches, and community organisers
              with a Hyrox-aligned audience. Submit this application and
              we&apos;ll respond within 48 hours.
            </p>
          </Screen>
        )}

        {screen === 2 && (
          <Screen
            eyebrow={`Step 2 of ${TOTAL_SCREENS}`}
            title="What&rsquo;s your name?"
          >
            <Field
              label="Your full name"
              name="name"
              value={answers.name}
              onChange={(v) => update("name", v)}
              autoFocus
            />
          </Screen>
        )}

        {screen === 3 && (
          <Screen
            eyebrow={`Step 3 of ${TOTAL_SCREENS}`}
            title="Where should we email you?"
            help="We&rsquo;ll send the approval decision here. Use the address you check most."
          >
            <Field
              label="Email"
              name="email"
              type="email"
              value={answers.email}
              onChange={(v) => update("email", v)}
              autoFocus
            />
          </Screen>
        )}

        {screen === 4 && (
          <Screen
            eyebrow={`Step 4 of ${TOTAL_SCREENS}`}
            title="Which country are you based in?"
            help="Monthly BACS payouts to UK accounts. Other countries on request, processed via Wise."
          >
            <Field
              label="Country"
              name="country"
              value={answers.country}
              onChange={(v) => update("country", v)}
              placeholder="United Kingdom"
              autoFocus
            />
          </Screen>
        )}

        {screen === 5 && (
          <Screen
            eyebrow={`Step 5 of ${TOTAL_SCREENS}`}
            title="What&rsquo;s your primary platform?"
            help="The one you post most consistently to."
          >
            <RadioGrid
              name="platform"
              options={PLATFORMS}
              value={answers.platform}
              onChange={(v) => update("platform", v)}
            />
          </Screen>
        )}

        {screen === 6 && (
          <Screen
            eyebrow={`Step 6 of ${TOTAL_SCREENS}`}
            title="How big is your audience?"
            help="Rough range is fine. We weight engagement higher than raw follower count."
          >
            <RadioGrid
              name="followerCount"
              options={FOLLOWERS}
              value={answers.followerCount}
              onChange={(v) => update("followerCount", v)}
            />
          </Screen>
        )}

        {screen === 7 && (
          <Screen
            eyebrow={`Step 7 of ${TOTAL_SCREENS}`}
            title="What do you make?"
            help="A sentence or two on your niche and content style."
          >
            <Textarea
              label="Niche and content style"
              name="contentDescription"
              value={answers.contentDescription}
              onChange={(v) => update("contentDescription", v)}
              maxLength={200}
              placeholder="E.g. UK Hyrox prep coach, weekly video breakdowns, beginner-focused."
              autoFocus
            />
          </Screen>
        )}

        {screen === 8 && (
          <Screen
            eyebrow={`Step 8 of ${TOTAL_SCREENS}`}
            title="Why is Suth Performance a fit?"
            help="What does your audience get out of it specifically?"
          >
            <Textarea
              label="Why Suth Performance"
              name="whySuth"
              value={answers.whySuth}
              onChange={(v) => update("whySuth", v)}
              maxLength={300}
              autoFocus
            />
          </Screen>
        )}

        {screen === 9 && (
          <Screen
            eyebrow={`Step 9 of ${TOTAL_SCREENS}`}
            title="Link to your main account"
            help="We&rsquo;ll spend two minutes reviewing it before we decide."
          >
            <Field
              label="Primary URL"
              name="primaryUrl"
              type="url"
              value={answers.primaryUrl}
              onChange={(v) => update("primaryUrl", v)}
              placeholder="https://"
              autoFocus
            />
          </Screen>
        )}

        {screen === 10 && (
          <Screen
            eyebrow={`Step 10 of ${TOTAL_SCREENS}`}
            title="Past partner or affiliate experience?"
            help="Optional. Helps us judge fit faster but won&rsquo;t count against you if blank."
          >
            <Field
              label="Past affiliate (optional)"
              name="pastAffiliate"
              value={answers.pastAffiliate}
              onChange={(v) => update("pastAffiliate", v)}
              placeholder="Brief details, if any"
            />
          </Screen>
        )}

        {screen === 11 && (
          <Screen
            eyebrow={`Step 11 of ${TOTAL_SCREENS}`}
            title="How will you promote Suth Performance?"
            help="Pick at least one. We use this to send relevant assets after approval."
          >
            <CheckGrid
              name="promotionMethods"
              options={PROMOTION}
              values={answers.promotionMethods}
              onToggle={togglePromotion}
            />
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-suth-border-subtle bg-suth-base/40 p-4 text-base text-suth-text">
              <input
                type="checkbox"
                checked={answers.termsAccepted}
                onChange={(e) =>
                  update("termsAccepted", e.currentTarget.checked)
                }
                className="mt-1 size-4 accent-suth-accent"
              />
              <span>
                I accept the{" "}
                <Link
                  href="/legal/terms"
                  className="text-suth-accent underline underline-offset-4"
                >
                  Suth Performance Terms
                </Link>{" "}
                and the Partner Programme T&amp;Cs, including the no-bidding
                rule on Suth Performance brand terms and the 30-day commission clawback
                window.
              </span>
            </label>
          </Screen>
        )}

        {errorMessage ? (
          <p role="alert" className="mt-6 text-sm text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          {screen > 1 && (
            <button
              type="button"
              onClick={() => setScreen(screen - 1)}
              className="inline-flex h-12 items-center rounded-pill border border-suth-border bg-suth-base px-5 text-sm font-medium text-suth-text hover:border-suth-border-strong"
            >
              ← Back
            </button>
          )}
          <button
            type="submit"
            disabled={!canAdvance() || status === "submitting"}
            className="ml-auto inline-flex h-12 items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold tracking-tight text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {screen === TOTAL_SCREENS
              ? status === "submitting"
                ? "Submitting..."
                : "Submit application →"
              : "Continue →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProgressBar({ screen, total }: { screen: number; total: number }) {
  const pct = Math.round((screen / total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Step {screen} of {total}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          {pct}%
        </p>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-suth-elevated">
        <div
          className="h-full bg-suth-accent transition-[width] duration-base ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Screen({
  eyebrow,
  title,
  help,
  children,
}: {
  eyebrow: string;
  title: string;
  help?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
        [ {eyebrow} ]
      </p>
      <h2
        className="mt-3 text-balance text-2xl font-black leading-tight tracking-[-0.04em] text-suth-text md:text-3xl"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {help ? (
        <p
          className="mt-3 text-base text-suth-text-secondary md:text-lg"
          dangerouslySetInnerHTML={{ __html: help }}
        />
      ) : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "url";
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-suth-text">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={type === "email" ? "email" : "off"}
        className="mt-2 block h-12 w-full rounded-md border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary focus:border-suth-accent"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  maxLength,
  placeholder,
  autoFocus,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-suth-text">
        {label}
        {maxLength ? (
          <span className="ml-2 font-mono text-xs text-suth-text-tertiary">
            up to {maxLength} chars
          </span>
        ) : null}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="mt-2 block w-full resize-y rounded-md border border-suth-border bg-suth-base px-4 py-3 text-base text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary focus:border-suth-accent"
      />
    </label>
  );
}

function RadioGrid<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly T[];
  value: string;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {options.map((opt) => {
        const checked = value === opt;
        return (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-base transition-colors ${
              checked
                ? "border-suth-accent bg-suth-accent/10 text-suth-text"
                : "border-suth-border-subtle bg-suth-base/40 text-suth-text hover:border-suth-border-strong"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={checked}
              onChange={() => onChange(opt)}
              className="size-4 accent-suth-accent"
            />
            <span>{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function CheckGrid<T extends string>({
  name,
  options,
  values,
  onToggle,
}: {
  name: string;
  options: readonly T[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  const set = new Set(values);
  return (
    <fieldset>
      <legend className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
        Pick all that apply
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const checked = set.has(opt);
          return (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-base text-suth-text transition-colors ${
                checked
                  ? "border-suth-accent bg-suth-accent/10"
                  : "border-suth-border-subtle bg-suth-base/40 hover:border-suth-border-strong"
              }`}
            >
              <input
                type="checkbox"
                name={name}
                value={opt}
                checked={checked}
                onChange={() => onToggle(opt)}
                className="size-4 accent-suth-accent"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
