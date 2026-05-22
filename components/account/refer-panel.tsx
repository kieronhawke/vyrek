"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { capture } from "@/lib/posthog";

/**
 * Referral hub. The bounty only pays out once the referred friend's trial
 * has converted to paid — we surface that rule honestly. Until the member
 * is signed in (Supabase session), we render the page in "preview" mode
 * with a sample code so the layout, share copy, and terms are all visible.
 */

const SAMPLE_CODE = "DEMO-W2X4-RX9P";
const SHARE_TEXT =
  "I'm using Vyrek for Hyrox training. £4.99/mo, first week free — use my link and I'll get £20 if you stay past your trial.";

type ReferralState = {
  code: string;
  totalReferred: number;
  totalConverted: number;
  earningsPence: number;
};

async function fetchReferralState(): Promise<ReferralState | null> {
  try {
    const res = await fetch("/api/referral/state", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<ReferralState> & {
      authenticated?: boolean;
      hasCustomerRecord?: boolean;
    };
    if (!json.code) return null;
    return {
      code: json.code,
      totalReferred: json.totalReferred ?? 0,
      totalConverted: json.totalConverted ?? 0,
      earningsPence: json.earningsPence ?? 0,
    };
  } catch {
    return null;
  }
}

export function ReferPanel() {
  const [state, setState] = useState<ReferralState | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "url" | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReferralState().then((s) => {
      if (cancelled) return;
      setState(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPreview = !state;
  const code = state?.code ?? SAMPLE_CODE;
  const origin =
    typeof window === "undefined"
      ? "https://vyrek.com"
      : window.location.origin;
  const referralUrl = `${origin}/?ref=${code}`;

  const onCopy = useCallback(
    async (value: string, kind: "code" | "url") => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(kind);
        capture("referral_copied", { kind, preview: isPreview });
        window.setTimeout(() => setCopied(null), 1800);
      } catch {
        /* clipboard blocked */
      }
    },
    [isPreview],
  );

  const onShare = useCallback(async () => {
    capture("referral_share_clicked", { preview: isPreview });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Vyrek — Hyrox training",
          text: SHARE_TEXT,
          url: referralUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await onCopy(`${SHARE_TEXT} ${referralUrl}`, "url");
    }
  }, [isPreview, referralUrl, onCopy]);

  return (
    <main className="pb-24 pt-32 md:pt-40">
      <Container>
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Refer &amp; earn</Eyebrow>
          <SplitHeading
            as="h1"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
          >
            Refer a friend. Earn £20.
          </SplitHeading>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
            Send a friend your link. When their trial converts to paid, we BACS
            £20 to your account within 5 business days. No cap. No expiry.
          </p>

          {/* Code card */}
          <section className="mt-12 rounded-lg border border-vyrek-border bg-vyrek-elevated p-6 md:p-8">
            {isPreview ? (
              <div className="mb-5 inline-flex items-center gap-2 rounded-pill border border-vyrek-accent/40 bg-vyrek-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
                <span aria-hidden>●</span>
                Preview · sign in to see your real code
              </div>
            ) : (
              <Eyebrow>Your code</Eyebrow>
            )}

            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p
                  aria-label="Referral code"
                  className="select-all break-all font-mono text-3xl font-bold uppercase tracking-[0.05em] text-vyrek-text md:text-4xl"
                >
                  {code}
                </p>
                <p className="mt-2 text-sm text-vyrek-text-secondary">
                  Friends who use this code get the same 7-day free trial. You
                  earn £20 if they stay past day 7.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCopy(code, "code")}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-overlay px-5 text-sm font-medium text-vyrek-text transition-[border,background] duration-fast hover:border-vyrek-border-strong disabled:opacity-50"
              >
                {copied === "code" ? "Copied ✓" : "Copy code"}
              </button>
            </div>

            <hr className="my-6 border-t border-vyrek-border-subtle" />

            <Eyebrow>Share link</Eyebrow>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={referralUrl}
                aria-label="Referral URL"
                className="h-12 w-full rounded-md border border-vyrek-border bg-vyrek-base px-4 font-mono text-sm text-vyrek-text outline-none focus:border-vyrek-accent"
              />
              <button
                type="button"
                onClick={() => onCopy(referralUrl, "url")}
                disabled={loading}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-pill border border-vyrek-border bg-vyrek-overlay px-5 text-sm font-medium text-vyrek-text transition-[border,background] duration-fast hover:border-vyrek-border-strong disabled:opacity-50"
              >
                {copied === "url" ? "Copied ✓" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={onShare}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center rounded-pill bg-vyrek-accent px-5 text-sm font-medium text-[#0A0A0A] transition-[background,transform] duration-fast hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Share ↗
              </button>
            </div>
          </section>

          {/* Stats card */}
          <section className="mt-6 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-8">
            <Eyebrow>Your numbers</Eyebrow>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              <Stat label="Referred" value={state?.totalReferred ?? 0} />
              <Stat label="Converted" value={state?.totalConverted ?? 0} />
              <Stat
                label="Earned"
                value={`£${((state?.earningsPence ?? 0) / 100).toFixed(0)}`}
              />
            </dl>
            {isPreview ? (
              <p className="mt-5 text-sm text-vyrek-text-secondary">
                Numbers will update automatically as friends sign up.{" "}
                <Link
                  href="/quiz"
                  className="text-vyrek-text underline underline-offset-4 decoration-vyrek-accent hover:decoration-2"
                >
                  Start your own trial
                </Link>{" "}
                to claim your real code.
              </p>
            ) : null}
          </section>

          {/* How it works */}
          <section className="mt-16" aria-labelledby="refer-how-heading">
            <Eyebrow>How it works</Eyebrow>
            <h2 id="refer-how-heading" className="sr-only">
              How the referral programme works
            </h2>
            <ol role="list" className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Share your link",
                  body: "Send the URL above to a friend who&apos;d benefit from Hyrox programming.",
                },
                {
                  step: "02",
                  title: "They start their trial",
                  body: "Your code is auto-applied when they sign up. They get the same 7-day free trial as anyone else.",
                },
                {
                  step: "03",
                  title: "You earn £20",
                  body: "When their first paid month invoices, we BACS £20 to your nominated account within 5 working days.",
                },
              ].map((s) => (
                <li
                  key={s.step}
                  className="flex flex-col gap-3 rounded-lg border border-vyrek-border bg-vyrek-elevated p-5"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                    {s.step}
                  </span>
                  <h3 className="text-base font-bold text-vyrek-text">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-vyrek-text-secondary">
                    {s.body.replace(/&apos;/g, "’")}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Terms */}
          <section className="mt-16 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 p-6 md:p-8">
            <Eyebrow>Programme terms</Eyebrow>
            <ul role="list" className="mt-4 space-y-2 text-sm text-vyrek-text-secondary">
              <li>
                <strong className="text-vyrek-text">Eligibility.</strong> You
                must be a Vyrek member with at least one paid month on file
                before payouts release. (Active trials still earn referrals —
                they just don&apos;t pay out until you&apos;ve converted yourself.)
              </li>
              <li>
                <strong className="text-vyrek-text">Payout.</strong> £20 per
                converted referral, paid by BACS within 5 working days of the
                friend&apos;s first paid invoice settling. UK bank accounts
                only at launch.
              </li>
              <li>
                <strong className="text-vyrek-text">Cooling-off.</strong> If
                the referred friend cancels and refunds within the
                Consumer Contracts Regulations 14-day window, the bounty is
                reversed. This applies once per referral.
              </li>
              <li>
                <strong className="text-vyrek-text">No self-referrals.</strong>{" "}
                Codes are tied to the account that issued them. We auto-detect
                same-card, same-device, or shared-IP signups and decline those
                payouts.
              </li>
              <li>
                <strong className="text-vyrek-text">No cap.</strong> Refer as
                many as you like. We&apos;ll happily fund your gym membership
                in £20 chunks.
              </li>
            </ul>
            <p className="mt-5 text-xs text-vyrek-text-tertiary">
              Vyrek may pause the programme or adjust the bounty with 30 days&apos;
              notice. Existing earned payouts are never affected.
            </p>
          </section>
        </div>
      </Container>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
        {value}
      </dd>
    </div>
  );
}
