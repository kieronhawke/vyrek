import type { Metadata } from "next";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin/auth";
import { AdminSignOut } from "@/components/admin/sign-out";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { AdminSideNav } from "@/components/admin/side-nav";

export const metadata: Metadata = {
  title: "Mission control",
  description: "Suth Performance admin console.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; group: string; icon: string }[] = [
  { href: "/admin", label: "Overview", group: "Today", icon: "overview" },
  { href: "/admin/leads", label: "Enquiries", group: "Today", icon: "enquiries" },
  { href: "/admin/calendar", label: "Consultations", group: "Today", icon: "consultations" },
  { href: "/admin/live", label: "Live on site", group: "Today", icon: "live" },
  { href: "/admin/results-engine", label: "Results engine", group: "Today", icon: "results" },
  { href: "/admin/clients", label: "Clients", group: "Members", icon: "clients" },
  { href: "/admin/customers", label: "Customers", group: "Members", icon: "customers" },
  { href: "/admin/subscriptions", label: "Subscriptions", group: "Members", icon: "subscriptions" },
  { href: "/admin/payments", label: "Payments", group: "Members", icon: "payments" },
  { href: "/admin/partners", label: "Applications", group: "Partners", icon: "applications" },
  { href: "/admin/partners/list", label: "Partners", group: "Partners", icon: "partners" },
  { href: "/admin/payouts", label: "Payouts", group: "Partners", icon: "payouts" },
  { href: "/admin/blog", label: "Blog posts", group: "Content", icon: "blog" },
  { href: "/admin/waitlist", label: "Waitlist", group: "Marketing", icon: "waitlist" },
  { href: "/admin/messaging", label: "Emails & texts", group: "Marketing", icon: "messaging" },
  { href: "/admin/quiz", label: "Quiz responses", group: "Marketing", icon: "quiz" },
  { href: "/admin/settings", label: "Settings", group: "System", icon: "settings" },
];

function SuthMonogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" aria-hidden focusable="false" className={className}>
      <rect x="6" y="6" width="228" height="228" rx="24" stroke="currentColor" strokeWidth="8" fill="none" />
      <g transform="translate(74.51 189.57)">
        <path
          d="M47.3 2.06Q34.23 2.06 25.46 -2.58Q16.68 -7.22 12.21 -16.94Q7.74 -26.66 7.22 -42.14L33.54 -46.1Q33.71 -37.15 35.17 -31.65Q36.64 -26.14 39.3 -23.74Q41.97 -21.33 45.75 -21.33Q50.57 -21.33 52.03 -24.6Q53.49 -27.86 53.49 -31.48Q53.49 -40.08 49.36 -46.01Q45.24 -51.94 38.18 -57.96L26.14 -68.46Q18.23 -75.16 12.81 -83.68Q7.4 -92.19 7.4 -104.75Q7.4 -122.46 17.89 -131.84Q28.38 -141.21 46.44 -141.21Q57.62 -141.21 64.41 -137.43Q71.21 -133.64 74.73 -127.54Q78.26 -121.43 79.55 -114.64Q80.84 -107.84 81.01 -101.65L54.52 -98.38Q54.35 -104.58 53.75 -109.13Q53.15 -113.69 51.26 -116.19Q49.36 -118.68 45.41 -118.68Q41.11 -118.68 39.13 -115.07Q37.15 -111.46 37.15 -107.84Q37.15 -100.1 40.85 -95.2Q44.55 -90.3 50.57 -84.97L62.09 -74.82Q71.21 -67.08 77.49 -57.28Q83.76 -47.47 83.76 -33.02Q83.76 -23.22 79.29 -15.22Q74.82 -7.22 66.65 -2.58Q58.48 2.06 47.3 2.06Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // (authed) route group: every page under here requires an admin user.
  // /admin/login lives outside the group and has no auth gate.
  const { user } = await assertAdmin();

  return (
    <div className="min-h-svh bg-suth-base text-suth-text">
      <div className="mx-auto flex max-w-[1480px] gap-0 md:gap-8 px-0 md:px-6">
        <aside className="hidden w-64 shrink-0 border-r border-suth-border-subtle py-8 pr-6 md:block">
          <Link href="/admin" className="flex items-center gap-3 px-2">
            {/* Inlined rather than an <img>: the monogram draws itself in
                currentColor, which only resolves to the brand accent when
                the SVG lives in the document. */}
            <SuthMonogram className="size-8 shrink-0 text-suth-accent" />
            <span className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                Mission Control
              </span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                Suth Performance
              </span>
            </span>
          </Link>

          <AdminSideNav items={NAV} />

          {/* The other surfaces of the same system, one login. */}
          <div className="mt-6 space-y-2 border-t border-suth-border-subtle pt-4">
            <Link
              href="/console"
              className="flex items-center justify-between rounded-xl border border-suth-border bg-suth-elevated px-3 py-2.5 text-sm text-suth-text transition-colors hover:border-suth-border-strong"
            >
              <span>
                Coaching console
                <span className="block text-xs text-suth-text-tertiary">
                  Plans, diary, clients, comms
                </span>
              </span>
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/coach"
              className="flex items-center justify-between rounded-xl border border-suth-border bg-suth-elevated px-3 py-2.5 text-sm text-suth-text transition-colors hover:border-suth-border-strong"
            >
              <span>
                Coach view
                <span className="block text-xs text-suth-text-tertiary">
                  Ben&apos;s phone-sized view
                </span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="mt-6 border-t border-suth-border-subtle pt-4">
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Signed in
            </p>
            <p className="mt-1 truncate px-2 text-xs text-suth-text">
              {user.email}
            </p>
            <div className="mt-3 px-2">
              <AdminSignOut />
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 md:px-0 md:py-10">
          {/* On a phone the sidebar is gone, so the brand rides above the
              chip nav instead. */}
          <Link
            href="/admin"
            className="mb-4 flex items-center gap-2.5 md:hidden"
          >
            <SuthMonogram className="size-7 shrink-0 text-suth-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
              Mission Control
            </span>
          </Link>
          {/* Mobile chip nav (collapsed sidebar), current section lit. */}
          <AdminMobileNav
            items={NAV.map(({ href, label }) => ({ href, label }))}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
