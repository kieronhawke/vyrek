import type { Metadata } from "next";
import { assertAdmin } from "@/lib/admin/auth";
import { AdminChrome } from "@/components/admin/admin-chrome";
import type { SideNavItem } from "@/components/admin/side-nav";

export const metadata: Metadata = {
  title: "Mission control",
  description: "Suth Performance admin console.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * One centralised console. The coaching workflow (Plans, Clients, Diary,
 * Messages, Activity) now lives here alongside the money and business
 * modules, so there is a single place everything is run from — responsive
 * down to a phone, with no separate Coach or Console app to switch to.
 */
const NAV: SideNavItem[] = [
  // What needs Ben today.
  { href: "/admin", label: "Overview", group: "Today", icon: "overview" },
  { href: "/admin/leads", label: "Leads & enquiries", group: "Today", icon: "enquiries" },
  { href: "/admin/calendar", label: "Diary", group: "Today", icon: "consultations" },
  { href: "/admin/live", label: "Live on site", group: "Today", icon: "live" },
  { href: "/admin/activity", label: "Activity", group: "Today", icon: "activity" },
  // The coaching workflow.
  { href: "/admin/clients", label: "Clients", group: "Coaching", icon: "clients" },
  { href: "/admin/plans", label: "Plans", group: "Coaching", icon: "plans" },
  { href: "/admin/messages", label: "Messages", group: "Coaching", icon: "messaging" },
  // The money.
  { href: "/admin/customers", label: "Customers", group: "Members", icon: "customers" },
  { href: "/admin/subscriptions", label: "Subscriptions", group: "Members", icon: "subscriptions" },
  { href: "/admin/payments", label: "Payments", group: "Members", icon: "payments" },
  { href: "/admin/finance", label: "Finance", group: "Members", icon: "finance" },
  { href: "/admin/accounts", label: "Accounts", group: "Members", icon: "accounts" },
  // Partners.
  { href: "/admin/partners", label: "Applications", group: "Partners", icon: "applications" },
  { href: "/admin/partners/list", label: "Partners", group: "Partners", icon: "partners" },
  { href: "/admin/payouts", label: "Payouts", group: "Partners", icon: "payouts" },
  // Content & growth.
  { href: "/admin/blog", label: "Blog posts", group: "Content", icon: "blog" },
  { href: "/admin/assets", label: "Assets", group: "Content", icon: "assets" },
  { href: "/admin/seo", label: "SEO", group: "Content", icon: "seo" },
  { href: "/admin/results-engine", label: "Results engine", group: "Content", icon: "results" },
  { href: "/admin/waitlist", label: "Waitlist", group: "Marketing", icon: "waitlist" },
  { href: "/admin/messaging", label: "Emails & texts", group: "Marketing", icon: "quiz" },
  { href: "/admin/quiz", label: "Quiz responses", group: "Marketing", icon: "quiz" },
  // Editing the quiz wording, not reading its answers — the pencil keeps it
  // apart from "Quiz responses" sitting directly above it.
  { href: "/admin/quiz-copy", label: "Quiz wording", group: "Marketing", icon: "blog" },
  { href: "/admin/settings", label: "Settings", group: "System", icon: "settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await assertAdmin();
  return (
    <AdminChrome items={NAV} userEmail={user.email ?? ""}>
      {children}
    </AdminChrome>
  );
}
