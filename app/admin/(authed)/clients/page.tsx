import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { SendPaymentLink } from "@/components/admin/send-payment-link";
import { InviteRowActions } from "@/components/admin/invite-row-actions";
import { recentInvites } from "@/lib/onboarding/invite-store";
import { planByKey } from "@/lib/onboarding/model";
import { formatStartDate, startDateISO } from "@/lib/onboarding/start-date";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clients" };

function gbp(pence: number): string {
  return pence % 100 === 0
    ? `£${pence / 100}`
    : `£${(pence / 100).toFixed(2)}`;
}

/**
 * WHERE A PERSON BECOMES A PAYING CLIENT.
 *
 * The form sends the link — at whatever rate Ben agreed with them — and
 * the list underneath is his answer to "did I already send Sarah hers?".
 * Accounts and subscriptions live under Customers once they've paid.
 */
export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    email?: string;
    phone?: string;
    rate?: string;
    due?: string;
    start?: string;
  }>;
}) {
  const sp = await searchParams;
  const invites = await recentInvites(50);
  // Read once in the data phase, not during render — the page is
  // force-dynamic so this is per-request anyway.
  const now = new Date().getTime();

  // Which invited people have become customers, so a sent link that has
  // been used clicks straight through to their customer page.
  const emails = Array.from(
    new Set(
      invites
        .map((i) => (i.payload.email || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const customerByEmail = new Map<string, string>();
  if (emails.length > 0) {
    try {
      const { data } = await supabaseAdmin()
        .from("customers")
        .select("id, email")
        .in("email", emails);
      for (const c of (data ?? []) as Array<{ id: string; email: string }>) {
        customerByEmail.set(c.email.toLowerCase(), c.id);
      }
    } catch {
      /* Rows render unlinked. */
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Clients"
        description="Set an existing client up on card payment: anything they owe today, the rate you agreed, and the date it starts. You see exactly what they'll receive before it goes. Once they pay they appear under Customers with a live subscription."
      />

      <SendPaymentLink
        initialName={sp.name?.trim() || undefined}
        initialEmail={sp.email?.trim() || undefined}
        initialPhone={sp.phone?.trim() || undefined}
        initialRate={sp.rate?.trim() || undefined}
        initialDueToday={sp.due?.trim() || undefined}
        initialStart={sp.start?.trim() || undefined}
      />

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Links sent
          </h2>
          <Link
            href="/admin/customers"
            className="text-xs text-suth-text-secondary underline-offset-4 hover:text-suth-text hover:underline"
          >
            Paid-up clients → Customers
          </Link>
        </div>

        {invites.length === 0 ? (
          <p className="mt-4 text-sm text-suth-text-secondary">
            No links sent yet. The first one you send appears here, with its
            rate and whether it has been used or expired.
          </p>
        ) : (
          <ul role="list" className="mt-4 space-y-2">
            {invites.map((inv) => {
              const p = inv.payload;
              const plan = planByKey(p.plan);
              const expired = new Date(inv.expiresISO).getTime() < now;
              const customerId = customerByEmail.get(
                (p.email || "").trim().toLowerCase(),
              );
              const rate = p.amountPence
                ? `${gbp(p.amountPence)}/mo, their rate`
                : plan
                  ? `${plan.display}/mo`
                  : "—";
              /* The balance owed on top, so a link that says "£100 today" in
                 the client's inbox says it here too. */
              const due =
                typeof p.dueTodayPence === "number" && p.dueTodayPence > 0
                  ? `+ ${gbp(p.dueTodayPence)} owed today`
                  : null;
              /* When the first collection actually happens. A link sent on the
                 28th that does not charge until the 1st looks unpaid for four
                 days, and without this Ben has no way to tell that apart from
                 a client who has ignored him. */
              const starts =
                typeof p.startDay === "number"
                  ? `first payment ${formatStartDate(p.startDay)}`
                  : null;
              // The journey in one line: sent, then opened, then signed up.
              // "Opened, not signed up" is the one worth a follow-up call.
              const opened = inv.openedISO
                ? `opened ${new Date(inv.openedISO).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : null;
              const body = (
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-suth-text">
                      {p.name || "—"}
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                        {p.kind === "payment" ? "payment link" : "full set-up"}
                      </span>
                      {customerId ? (
                        <span className="ml-2 rounded-pill bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                          signed up →
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-suth-text-secondary">
                      {[p.email, p.phone].filter(Boolean).join(" · ") || "no contact stored"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm text-suth-text">{rate}</p>
                    {due ? (
                      <p className="mt-0.5 text-[11px] text-suth-accent">{due}</p>
                    ) : null}
                    {starts ? (
                      <p className="mt-0.5 text-[11px] text-suth-accent">{starts}</p>
                    ) : null}
                    <p
                      className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                        expired && !customerId ? "text-suth-danger" : "text-suth-text-tertiary"
                      }`}
                    >
                      {expired && !customerId
                        ? "expired"
                        : `sent ${new Date(inv.createdISO).toLocaleDateString("en-GB")}`}
                    </p>
                    {!customerId ? (
                      <p
                        className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                          opened ? "text-amber-300" : "text-suth-text-tertiary"
                        }`}
                      >
                        {opened ?? "not opened yet"}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
              return (
                <li key={inv.id}>
                  {customerId ? (
                    <Link
                      href={`/admin/customers/${customerId}`}
                      className="block rounded-xl border border-suth-border bg-suth-elevated p-4 transition-colors hover:border-suth-border-strong"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-suth-border bg-suth-elevated p-4">
                      {body}
                      {!expired ? (
                        <InviteRowActions
                          id={inv.id}
                          name={p.name || ""}
                          email={p.email || ""}
                          phone={p.phone || ""}
                          ratePence={p.amountPence ?? null}
                          dueTodayPence={p.dueTodayPence ?? null}
                          startISO={
                            typeof p.startDay === "number" ? startDateISO(p.startDay) : null
                          }
                        />
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
