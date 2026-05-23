"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "checking" | "submitting" | "done";

export function OnboardingForm({
  applicationId,
  email,
  name,
  token,
}: {
  applicationId: string;
  email: string;
  name: string;
  token: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");
  const [code, setCode] = useState(
    suggestSlug(name || email.split("@")[0] || "partner"),
  );

  async function checkCodeAvailability(value: string) {
    setCodeStatus("checking");
    try {
      const res = await fetch(
        `/api/partners/onboard?check=${encodeURIComponent(value)}`,
      );
      const data = (await res.json()) as { available?: boolean; reason?: string };
      if (data.available) setCodeStatus("ok");
      else if (data.reason === "invalid") setCodeStatus("invalid");
      else setCodeStatus("taken");
    } catch {
      setCodeStatus("invalid");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (codeStatus !== "ok") {
      setErr("Pick an available partner code first.");
      return;
    }
    setErr(null);
    setStatus("submitting");
    const form = new FormData(e.currentTarget);
    const payload = {
      token,
      partnerCode: code,
      bankAccountName: String(form.get("bankAccountName") ?? "").trim(),
      bankSortCode: String(form.get("bankSortCode") ?? "").trim(),
      bankAccountNumber: String(form.get("bankAccountNumber") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      vatNumber: String(form.get("vatNumber") ?? "").trim() || null,
      termsAccepted: form.get("termsAccepted") === "on",
    };
    try {
      const res = await fetch("/api/partners/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("idle");
        setErr(data.error ?? "Could not save.");
        return;
      }
      setStatus("done");
      setTimeout(() => router.push("/partners/dashboard"), 800);
    } catch (e) {
      setStatus("idle");
      setErr(e instanceof Error ? e.message : "Network error.");
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        className="mt-12 rounded-lg border border-vyrek-accent/40 bg-vyrek-elevated p-8 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ YOU&apos;RE IN ]
        </p>
        <h2 className="mt-3 text-2xl font-black text-vyrek-text">
          Partner profile saved.
        </h2>
        <p className="mt-3 text-sm text-vyrek-text-secondary">
          Opening your dashboard...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-12 space-y-6" noValidate>
      <section className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/50 p-6 md:p-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          Confirm your details
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Name" v={name} />
          <Row k="Email" v={email} mono />
        </dl>
        <p className="mt-3 text-xs text-vyrek-text-tertiary">
          Email <a href="mailto:partners@vyrek.com" className="text-vyrek-accent underline underline-offset-4">partners@vyrek.com</a> to change either.
        </p>
      </section>

      <section className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/50 p-6 md:p-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          Choose your partner code
        </h2>
        <p className="mt-3 text-sm text-vyrek-text-secondary">
          Your link will be <code className="font-mono text-vyrek-text">vyrek.com/p/{code || "your-slug"}</code>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                setCode(v);
                setCodeStatus("idle");
              }}
              onBlur={() => code && checkCodeAvailability(code)}
              minLength={3}
              maxLength={32}
              className="block h-12 w-full rounded-md border border-vyrek-border bg-vyrek-base px-4 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
              placeholder="your-slug"
            />
          </div>
          <button
            type="button"
            onClick={() => checkCodeAvailability(code)}
            disabled={!code || codeStatus === "checking"}
            className="inline-flex h-12 items-center justify-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text disabled:opacity-50"
          >
            Check
          </button>
        </div>
        <p className="mt-2 text-xs">
          {codeStatus === "checking" ? (
            <span className="text-vyrek-text-tertiary">Checking...</span>
          ) : codeStatus === "ok" ? (
            <span className="text-emerald-300">Available.</span>
          ) : codeStatus === "taken" ? (
            <span className="text-red-400">Already taken. Try another.</span>
          ) : codeStatus === "invalid" ? (
            <span className="text-red-400">
              Use 3 to 32 lowercase letters, numbers, or dashes.
            </span>
          ) : (
            <span className="text-vyrek-text-tertiary">
              Lowercase letters, numbers, dashes. Min 3.
            </span>
          )}
        </p>
      </section>

      <section className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/50 p-6 md:p-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          Bank details for BACS payouts
        </h2>
        <p className="mt-2 text-xs text-vyrek-text-tertiary">
          Stored encrypted. Only the last four digits of your account number
          are visible to admins or to you in the dashboard.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Account name"
            name="bankAccountName"
            required
            placeholder="As it appears on the account"
          />
          <Field
            label="Sort code"
            name="bankSortCode"
            required
            placeholder="00-00-00"
          />
          <Field
            label="Account number"
            name="bankAccountNumber"
            required
            placeholder="8 digits"
          />
        </div>
      </section>

      <section className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/50 p-6 md:p-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          Address for tax records
        </h2>
        <Field
          label="Address"
          name="address"
          required
          placeholder="House / flat, street, city, postcode"
        />
        <Field
          label="VAT number (optional)"
          name="vatNumber"
          placeholder="Only if VAT registered"
        />
      </section>

      <section className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/50 p-6 md:p-8">
        <label className="flex cursor-pointer items-start gap-3 text-base text-vyrek-text">
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
      </section>

      {err ? (
        <p role="alert" className="text-sm text-red-400">
          {err}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-14 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-semibold tracking-tight text-[#0A0A0A] hover:bg-vyrek-accent-hover disabled:opacity-60"
      >
        {status === "submitting" ? "Saving..." : "Finish onboarding →"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-vyrek-text">
        {label}
      </span>
      <input
        type="text"
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 block h-12 w-full rounded-md border border-vyrek-border bg-vyrek-base px-4 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
      />
    </label>
  );
}

function Row({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-vyrek-text-tertiary">{k}</dt>
      <dd
        className={
          mono
            ? "font-mono text-xs text-vyrek-text"
            : "text-right text-vyrek-text"
        }
      >
        {v}
      </dd>
    </div>
  );
}

function suggestSlug(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}
