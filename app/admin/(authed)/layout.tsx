import type { Metadata } from "next";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin/auth";
import { AdminSignOut } from "@/components/admin/sign-out";

export const metadata: Metadata = {
  title: "Mission control. Suth Performance",
  description: "Suth Performance admin console.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; group: string }[] = [
  { href: "/admin", label: "Overview", group: "Today" },
  { href: "/admin/live", label: "Live on site", group: "Today" },
  { href: "/admin/results-engine", label: "Results engine", group: "Today" },
  { href: "/admin/customers", label: "Customers", group: "Members" },
  { href: "/admin/subscriptions", label: "Subscriptions", group: "Members" },
  { href: "/admin/partners", label: "Applications", group: "Partners" },
  { href: "/admin/partners/list", label: "Partners", group: "Partners" },
  { href: "/admin/payouts", label: "Payouts", group: "Partners" },
  { href: "/admin/blog", label: "Blog posts", group: "Content" },
  { href: "/admin/waitlist", label: "Waitlist", group: "Marketing" },
  { href: "/admin/messaging", label: "Emails & texts", group: "Marketing" },
  { href: "/admin/quiz", label: "Quiz responses", group: "Marketing" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // (authed) route group: every page under here requires an admin user.
  // /admin/login lives outside the group and has no auth gate.
  const { user } = await assertAdmin();

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <div className="min-h-svh bg-suth-base text-suth-text">
      <div className="mx-auto flex max-w-[1480px] gap-0 md:gap-8 px-0 md:px-6">
        <aside className="hidden w-64 shrink-0 border-r border-suth-border-subtle py-8 pr-6 md:block">
          <Link
            href="/admin"
            className="block px-2 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent"
          >
            [ MISSION CONTROL ]
          </Link>
          <p className="mt-1 px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Suth Performance admin
          </p>

          <nav aria-label="Admin" className="mt-8 space-y-6">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                  {group}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {NAV.filter((n) => n.group === group).map((n) => (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        className="block rounded-md px-2 py-1.5 text-sm text-suth-text-secondary transition-colors hover:bg-suth-elevated hover:text-suth-text"
                      >
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-10 border-t border-suth-border-subtle pt-4">
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
          {/* Mobile chip nav (collapsed sidebar) */}
          <nav
            aria-label="Admin sections"
            className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden"
          >
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="inline-flex h-9 shrink-0 items-center rounded-pill border border-suth-border-subtle bg-suth-elevated px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-secondary"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
