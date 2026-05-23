import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readPartnerSession } from "@/lib/partners/session";
import { PartnerLoginForm } from "@/components/partners/dashboard-login-form";
import { PartnerLinkBox } from "@/components/partners/link-box";

export const metadata: Metadata = {
  title: "Partner dashboard",
  description:
    "Track referrals, earnings, and payouts for your Vyrek Partner Programme.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
  })}`;
}

function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function tierRate(tier: string): string {
  if (tier === "elite") return "50%";
  if (tier === "growth") return "40%";
  return "30%";
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL?.replace(/^/, "https://") ??
    "https://vyrek.vercel.app"
  );
}

export default async function PartnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const partnerId = await readPartnerSession();

  if (!partnerId) {
    return (
      <>
        <MarketingNav />
        <main className="pb-24 pt-32 md:pt-40">
          <Container>
            <div className="mx-auto max-w-md">
              <Eyebrow>Partner sign-in</Eyebrow>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
                Open your dashboard.
              </h1>
              <p className="mt-4 text-base text-vyrek-text-secondary">
                Sign-in link sent by email. Use the address on your partner
                profile.
              </p>
              {err ? (
                <p
                  role="alert"
                  className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
                >
                  Sign-in link error: {err}. Request a new one below.
                </p>
              ) : null}
              <PartnerLoginForm />
              <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                [ NOT A PARTNER YET? ]
              </p>
              <div className="mt-3 text-center">
                <Link
                  href="/partners"
                  className="text-vyrek-accent underline underline-offset-4"
                >
                  See the programme overview →
                </Link>
              </div>
            </div>
          </Container>
        </main>
        <MarketingFooter />
      </>
    );
  }

  // Signed in — load the dashboard data.
  type Partner = {
    id: string;
    email: string;
    name: string;
    partner_code: string;
    tier: string;
    total_referrals: number;
    active_subscribers: number;
    lifetime_earnings_pence: number;
    pending_payout_pence: number;
    suspended_at: string | null;
  };
  let partner: Partner | null = null;
  let referrals: Array<{
    id: string;
    status: string;
    signed_up_at: string | null;
    first_paid_at: string | null;
    recurring_earnings_pence: number | null;
  }> = [];
  let payouts: Array<{
    id: string;
    amount_pence: number;
    period_start: string;
    period_end: string;
    status: string;
    paid_at: string | null;
    bacs_reference: string | null;
  }> = [];
  let loadErr: string | null = null;

  try {
    const sb = supabaseAdmin();
    const { data: p, error: pErr } = await sb
      .from("partners")
      .select(
        "id, email, name, partner_code, tier, total_referrals, active_subscribers, lifetime_earnings_pence, pending_payout_pence, suspended_at",
      )
      .eq("id", partnerId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!p) {
      return (
        <Suspended message="We couldn't find your partner profile. Sign in again." />
      );
    }
    if (p.suspended_at) {
      return (
        <Suspended message="Your account has been suspended. Email partners@vyrek.com." />
      );
    }
    partner = p as Partner;

    const { data: refs } = await sb
      .from("partner_referrals")
      .select(
        "id, status, signed_up_at, first_paid_at, recurring_earnings_pence",
      )
      .eq("partner_id", partnerId)
      .order("signed_up_at", { ascending: false })
      .limit(20);
    referrals = (refs ?? []) as typeof referrals;

    const { data: pos } = await sb
      .from("partner_payouts")
      .select(
        "id, amount_pence, period_start, period_end, status, paid_at, bacs_reference",
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(12);
    payouts = (pos ?? []) as typeof payouts;
  } catch (e) {
    loadErr = e instanceof Error ? e.message : "Could not load dashboard.";
  }

  if (!partner) {
    return (
      <Suspended message={loadErr ?? "Could not load your dashboard."} />
    );
  }

  const link = `${siteUrl()}/p/${partner.partner_code}`;
  const tierNext =
    partner.tier === "starter"
      ? { tier: "growth", at: 10 }
      : partner.tier === "growth"
        ? { tier: "elite", at: 50 }
        : null;
  const tierProgress = tierNext
    ? Math.min(100, Math.round((partner.active_subscribers / tierNext.at) * 100))
    : 100;

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <header className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow>Partner dashboard</Eyebrow>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
                {partner.name}
              </h1>
              <p className="mt-2 text-sm text-vyrek-text-secondary">
                Signed in as{" "}
                <span className="text-vyrek-text">{partner.email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <form action="/api/partners/dashboard/logout" method="POST">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text-secondary hover:text-vyrek-text"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Total referrals"
              value={partner.total_referrals.toString()}
            />
            <StatTile
              label="Active now"
              value={partner.active_subscribers.toString()}
            />
            <StatTile
              label="This month"
              value={gbp(partner.pending_payout_pence)}
              note="Pending payout"
            />
            <StatTile
              label="Lifetime"
              value={gbp(partner.lifetime_earnings_pence)}
            />
          </section>

          {/* Tier */}
          <section className="mt-8 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
                  [ {tierLabel(partner.tier).toUpperCase()} TIER · {tierRate(partner.tier)} ]
                </p>
                <p className="mt-2 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
                  {tierRate(partner.tier)} lifetime recurring
                </p>
              </div>
              {tierNext ? (
                <p className="text-right text-sm text-vyrek-text-secondary">
                  Next tier:
                  <br />
                  <span className="font-mono uppercase tracking-[0.18em] text-vyrek-accent">
                    {tierNext.tier} ({tierNext.at}+)
                  </span>
                </p>
              ) : (
                <p className="text-right font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
                  Top tier reached
                </p>
              )}
            </div>
            {tierNext ? (
              <>
                <div className="mt-5 h-2 overflow-hidden rounded-pill bg-vyrek-base">
                  <div
                    className="h-full bg-vyrek-accent transition-all"
                    style={{ width: `${tierProgress}%` }}
                    aria-hidden
                  />
                </div>
                <p className="mt-2 text-xs text-vyrek-text-tertiary">
                  {partner.active_subscribers} of {tierNext.at} active
                  subscribers needed for {tierNext.tier} tier.
                </p>
              </>
            ) : null}
          </section>

          {/* Your link */}
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Your link
            </h2>
            <PartnerLinkBox link={link} />
          </section>

          {/* Recent referrals */}
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Recent referrals
            </h2>
            {referrals.length === 0 ? (
              <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/40 p-8 text-center">
                <p className="text-sm text-vyrek-text-tertiary">
                  No referrals yet. Share your link to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-vyrek-border-subtle">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-vyrek-elevated">
                    <tr>
                      <Th>Status</Th>
                      <Th>Signed up</Th>
                      <Th>First paid</Th>
                      <Th align="right">Earned</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-vyrek-border-subtle last:border-b-0"
                      >
                        <Td>
                          <ReferralBadge status={r.status} />
                        </Td>
                        <Td>
                          {r.signed_up_at
                            ? formatDistanceToNow(new Date(r.signed_up_at), {
                                addSuffix: true,
                              })
                            : "—"}
                        </Td>
                        <Td>
                          {r.first_paid_at
                            ? format(
                                new Date(r.first_paid_at),
                                "dd MMM yyyy",
                              )
                            : "—"}
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {gbp(r.recurring_earnings_pence ?? 0)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Payouts */}
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Payout history
            </h2>
            {payouts.length === 0 ? (
              <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/40 p-6 text-sm text-vyrek-text-tertiary">
                No payouts yet. Payouts queue automatically once your pending
                balance reaches £50.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-vyrek-border-subtle">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-vyrek-elevated">
                    <tr>
                      <Th>Period</Th>
                      <Th align="right">Amount</Th>
                      <Th>Status</Th>
                      <Th>BACS reference</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-vyrek-border-subtle last:border-b-0"
                      >
                        <Td>
                          <span className="font-mono text-xs">
                            {p.period_start} → {p.period_end}
                          </span>
                        </Td>
                        <Td align="right" className="tabular-nums font-semibold">
                          {gbp(p.amount_pence)}
                        </Td>
                        <Td>
                          <PayoutBadge status={p.status} />
                        </Td>
                        <Td>
                          <span className="font-mono text-xs text-vyrek-text-secondary">
                            {p.bacs_reference ?? "—"}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Marketing assets */}
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Marketing assets
            </h2>
            <ul role="list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AssetCard
                title="Wordmark (SVG)"
                href="/logo-primary.svg"
                note="Primary lock-up. Scales to any size."
              />
              <AssetCard
                title="Monogram (SVG)"
                href="/logo-monogram.svg"
                note="Square. Use for avatars, app icons."
              />
              <AssetCard
                title="Brand guidelines"
                href="/press/brand-guidelines"
                note="Voice, palette, typography."
              />
              <AssetCard
                title="Product screenshots"
                href="/press"
                note="Press kit collection."
              />
            </ul>
            <div className="mt-6 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                Suggested copy
              </p>
              <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                &ldquo;The Vyrek Hyrox training plan adapts every Sunday based
                on what you logged. I&rsquo;ve been using it for [X] weeks
                and broke my [Y] PB. Get a personalised week 1 before you
                pay: <span className="text-vyrek-text">{link}</span>&rdquo;
              </p>
            </div>
          </section>

          <div className="mt-12 text-center">
            <CtaButton href="/partners" size="md">
              Back to programme overview →
            </CtaButton>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-[-0.02em] text-vyrek-text tabular-nums md:text-4xl">
        {value}
      </p>
      {note ? (
        <p className="mt-2 text-xs text-vyrek-text-tertiary">{note}</p>
      ) : null}
    </div>
  );
}

function ReferralBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    trial: "border-vyrek-accent/30 bg-vyrek-accent/10 text-vyrek-accent",
    cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
    clawed_back: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
  const tone =
    tones[status] ??
    "border-vyrek-border-subtle bg-vyrek-elevated text-vyrek-text-secondary";
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}
    >
      {status}
    </span>
  );
}

function PayoutBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    failed: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  const tone =
    tones[status] ??
    "border-vyrek-border-subtle bg-vyrek-elevated text-vyrek-text-secondary";
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}
    >
      {status}
    </span>
  );
}

function AssetCard({
  title,
  href,
  note,
}: {
  title: string;
  href: string;
  note: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex flex-col gap-2 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 transition-colors hover:border-vyrek-border-strong"
      >
        <span className="text-sm font-semibold text-vyrek-text">{title}</span>
        <span className="text-xs text-vyrek-text-secondary">{note}</span>
      </a>
    </li>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`border-b border-vyrek-border-subtle px-4 py-3 ${
        align === "right" ? "text-right" : "text-left"
      } font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle ${
        align === "right" ? "text-right" : "text-left"
      } ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

function Suspended({ message }: { message: string }) {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
              [ PARTNER DASHBOARD ]
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Account paused.
            </h1>
            <p className="mt-4 text-base text-vyrek-text-secondary">
              {message}
            </p>
            <form
              action="/api/partners/dashboard/logout"
              method="POST"
              className="mt-6"
            >
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text"
              >
                Sign out
              </button>
            </form>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
