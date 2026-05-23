import { format } from "date-fns";
import Link from "next/link";
import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { SectionEyebrow } from "@/components/member/section-eyebrow";
import { MemberSignOut } from "@/components/member/sign-out";
import { MemberSubscriptionPanel } from "@/components/member/subscription-panel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const ctx = await assertMember("/app/account");
  const programme = programmeLabel(ctx.programme);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ ACCOUNT ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          Manage your subscription, settings, and referral link.
        </p>
      </header>

      {/* Profile card */}
      <section className="mb-8">
        <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-base text-base font-semibold uppercase text-vyrek-text">
              {ctx.user.email[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-vyrek-text">
                {ctx.user.email}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                Member since{" "}
                {ctx.customer?.created_at
                  ? format(new Date(ctx.customer.created_at), "MMM yyyy")
                  : "-"}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                Programme
              </dt>
              <dd className="mt-1 text-vyrek-text">{programme}</dd>
            </div>
            <div className="rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                Referral code
              </dt>
              <dd className="mt-1 font-mono text-xs text-vyrek-text">
                {ctx.customer?.referral_code ?? "-"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Subscription */}
      <section className="mb-8">
        <SectionEyebrow title="Subscription" />
        <MemberSubscriptionPanel subscription={ctx.subscription} />
      </section>

      {/* PRs */}
      <section className="mb-8">
        <SectionEyebrow title="Performance" />
        <Link
          href="/app/account/pr"
          className="flex items-center justify-between gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-colors hover:border-vyrek-border-strong"
        >
          <div>
            <p className="text-sm font-semibold text-vyrek-text">
              Personal records
            </p>
            <p className="mt-1 text-xs text-vyrek-text-tertiary">
              Strength, cardio, and station bests. Updated when you log a session.
            </p>
          </div>
          <span className="font-mono text-xs text-vyrek-accent">→</span>
        </Link>
      </section>

      {/* Quick links */}
      <section className="mb-8">
        <SectionEyebrow title="Earn + refer" />
        <Link
          href="/account/refer"
          className="flex items-center justify-between gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-colors hover:border-vyrek-border-strong"
        >
          <div>
            <p className="text-sm font-semibold text-vyrek-text">
              Refer a friend, earn £20
            </p>
            <p className="mt-1 text-xs text-vyrek-text-tertiary">
              Paid to your BACS within 5 business days of their first paid invoice.
            </p>
          </div>
          <span className="font-mono text-xs text-vyrek-accent">→</span>
        </Link>
        <Link
          href="/partners"
          className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-colors hover:border-vyrek-border-strong"
        >
          <div>
            <p className="text-sm font-semibold text-vyrek-text">
              Partner programme
            </p>
            <p className="mt-1 text-xs text-vyrek-text-tertiary">
              For coaches and creators. 30-50% lifetime recurring.
            </p>
          </div>
          <span className="font-mono text-xs text-vyrek-accent">→</span>
        </Link>
      </section>

      {/* Settings */}
      <section className="mb-8">
        <SectionEyebrow title="Settings" />
        <ul role="list" className="space-y-2">
          <SettingRow label="Email + notifications" href="#email" />
          <SettingRow label="Password + security" href="#password" />
          <SettingRow label="Units (kg / lb / miles)" href="#units" />
          <SettingRow label="Privacy + data" href="/legal/privacy" external />
        </ul>
      </section>

      {/* Sign out */}
      <section className="mb-12">
        <SectionEyebrow title="Session" />
        <MemberSignOut />
      </section>

      <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        Need help? Email{" "}
        <a href="mailto:support@vyrek.com" className="text-vyrek-accent">
          support@vyrek.com
        </a>
      </p>
    </div>
  );
}

function SettingRow({
  label,
  href,
  external,
}: {
  label: string;
  href: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="flex items-center justify-between gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 px-4 py-3 transition-colors hover:border-vyrek-border-strong"
      >
        <span className="text-sm text-vyrek-text">{label}</span>
        <span className="font-mono text-xs text-vyrek-text-tertiary">
          {external ? "↗" : "→"}
        </span>
      </a>
    </li>
  );
}
