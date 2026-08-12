import Link from "next/link";
import { PageHeader, Stat } from "@/components/admin/ui";
import { listRealCoachClients, sortForCoachToday } from "@/lib/coach/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Plans" };

/**
 * TRAINING PLANS across everyone, worst-first: never-programmed at the top,
 * then overdue, then whoever runs out soonest. Tap a client to write or
 * review their week. Reads the real training_plans table.
 */
const toneClass: Record<string, string> = {
  ok: "text-suth-text-secondary",
  warn: "text-amber-300",
  danger: "text-suth-danger",
};

export default async function AdminPlansPage() {
  const clients = sortForCoachToday(await listRealCoachClients());
  const needPlan = clients.filter(
    (c) => c.programmedDaysLeft === null || c.programmedDaysLeft <= 2,
  ).length;
  const active = clients.filter(
    (c) => c.programmedDaysLeft !== null && c.programmedDaysLeft > 2,
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Coaching"
        title="Plans"
        description="Everyone's programming in one place. Whoever needs a plan is at the top."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Clients" value={String(clients.length)} />
        <Stat label="Need a plan" value={String(needPlan)} hint={needPlan ? "At the top of the list" : undefined} />
        <Stat label="Programmed" value={String(active)} />
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-suth-text-secondary">
          No clients yet. They appear here the moment someone signs up.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {clients.map((c) => (
            <li key={c.customerId}>
              <Link
                href={`/admin/plans/${c.customerId}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-suth-border bg-suth-elevated p-4 transition-colors hover:border-suth-border-strong"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-suth-text">
                    {c.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-suth-text-tertiary">
                    {c.paymentLabel}
                  </span>
                </span>
                <span className={`shrink-0 text-sm ${toneClass[c.planTone]}`}>
                  {c.planLabel} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
