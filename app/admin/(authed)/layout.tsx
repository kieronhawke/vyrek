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
];

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
          <Link
            href="/admin"
            className="block px-2 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent"
          >
            [ MISSION CONTROL ]
          </Link>
          <p className="mt-1 px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Suth Performance admin
          </p>

          <AdminSideNav items={NAV} />

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
