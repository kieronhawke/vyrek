"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

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

export function PartnerApplicationForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      country: String(form.get("country") ?? "").trim(),
      platform: String(form.get("platform") ?? "").trim(),
      followerCount: String(form.get("followerCount") ?? "").trim(),
      contentDescription: String(form.get("contentDescription") ?? "").trim(),
      whyVyrek: String(form.get("whyVyrek") ?? "").trim(),
      primaryUrl: String(form.get("primaryUrl") ?? "").trim(),
      pastAffiliate: String(form.get("pastAffiliate") ?? "").trim(),
      promotionMethods: form.getAll("promotionMethods").map(String),
      termsAccepted: form.get("termsAccepted") === "on",
    };

    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
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
        className="mt-12 rounded-lg border border-vyrek-accent/40 bg-vyrek-elevated p-8 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ APPLICATION RECEIVED ]
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
          Thanks. We will review within 48 hours.
        </h2>
        <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
          You will hear back at the email you provided. If approved, the
          email contains an onboarding link to set your partner code and
          payout details.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-12 space-y-8"
      noValidate
      aria-label="Partner application"
    >
      {/* Identification */}
      <Group title="About you">
        <Field label="Your name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field
          label="Country"
          name="country"
          placeholder="United Kingdom"
          required
        />
      </Group>

      {/* Audience */}
      <Group title="Your audience">
        <SelectField label="Primary platform" name="platform" required>
          <option value="">Choose one</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectField>
        <SelectField label="Follower count" name="followerCount" required>
          <option value="">Choose one</option>
          {FOLLOWERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </SelectField>
        <TextareaField
          label="Niche and content style"
          name="contentDescription"
          maxLength={200}
          placeholder="E.g. UK Hyrox prep coach, weekly video breakdowns, beginner-focused."
          required
        />
      </Group>

      {/* Why */}
      <Group title="Fit with Vyrek">
        <TextareaField
          label="Why is Vyrek a fit for your audience?"
          name="whyVyrek"
          maxLength={300}
          required
        />
        <Field
          label="Link to your main account"
          name="primaryUrl"
          type="url"
          placeholder="https://"
          required
        />
        <Field
          label="Past partner or affiliate experience? (optional)"
          name="pastAffiliate"
          placeholder="Brief details, if any"
        />
      </Group>

      {/* Promotion */}
      <Group title="How you will promote Vyrek">
        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Pick all that apply
          </legend>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROMOTION.map((m) => (
              <label
                key={m}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated px-4 py-3 text-base text-vyrek-text transition-colors hover:border-vyrek-border-strong"
              >
                <input
                  type="checkbox"
                  name="promotionMethods"
                  value={m}
                  className="size-4 accent-vyrek-accent"
                />
                <span>{m}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Group>

      {/* Terms */}
      <Group title="Confirm and submit">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4 text-base text-vyrek-text">
          <input
            type="checkbox"
            name="termsAccepted"
            required
            className="mt-1 size-4 accent-vyrek-accent"
          />
          <span>
            I accept the{" "}
            <a
              href="/legal/terms"
              className="text-vyrek-accent underline underline-offset-4"
            >
              Vyrek Terms
            </a>{" "}
            and the Partner Programme T&amp;Cs, including the no-bidding rule
            on Vyrek brand terms and the 30-day commission clawback window.
          </span>
        </label>
      </Group>

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-14 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-semibold tracking-tight text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : "Submit application →"}
      </button>
    </form>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/50 p-6 md:p-8">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "url";
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-vyrek-text">
        {label}
        {required ? null : (
          <span className="ml-2 text-xs text-vyrek-text-tertiary">
            (optional)
          </span>
        )}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 block h-12 w-full rounded-md border border-vyrek-border bg-vyrek-base px-4 text-base text-vyrek-text outline-none transition-colors placeholder:text-vyrek-text-tertiary focus:border-vyrek-accent"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-vyrek-text">
        {label}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="mt-2 block h-12 w-full rounded-md border border-vyrek-border bg-vyrek-base px-4 text-base text-vyrek-text outline-none transition-colors focus:border-vyrek-accent"
      >
        {children}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  name,
  maxLength,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-vyrek-text">
        {label}
        {maxLength ? (
          <span className="ml-2 font-mono text-xs text-vyrek-text-tertiary">
            up to {maxLength} chars
          </span>
        ) : null}
      </span>
      <textarea
        name={name}
        required={required}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder}
        className="mt-2 block w-full resize-y rounded-md border border-vyrek-border bg-vyrek-base px-4 py-3 text-base text-vyrek-text outline-none transition-colors placeholder:text-vyrek-text-tertiary focus:border-vyrek-accent"
      />
    </label>
  );
}
