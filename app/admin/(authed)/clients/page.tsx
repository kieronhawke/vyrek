import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { SendPaymentLink } from "@/components/admin/send-payment-link";
import { recentInvites } from "@/lib/onboarding/invite-store";
import { planByKey } from "@/lib/onboarding/model";

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
export default async function AdminClientsPage() {
  const invites = await recentInvites(50);
  // Read once in the data phase, not during render — the page is
  // force-dynamic so this is per-request anyway.
  const now = new Date().getTime();

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Clients"
        description="Send a payment or set-up link at the client's own rate. Once they pay, they appear under Customers with a live subscription."
      />

      <SendPaymentLink />

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
              const rate = p.amountPence
                ? `${gbp(p.amountPence)}/mo — their rate`
                : plan
                  ? `${plan.display}/mo`
                  : "—";
              return (
                <li
                  key={inv.id}
                  className="rounded-xl border border-suth-border bg-suth-elevated p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-suth-text">
                        {p.name || "—"}
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                          {p.kind === "payment" ? "payment link" : "full set-up"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-suth-text-secondary">
                        {[p.email, p.phone].filter(Boolean).join(" · ") || "no contact stored"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-sm text-suth-text">{rate}</p>
                      <p
                        className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                          expired ? "text-suth-danger" : "text-suth-text-tertiary"
                        }`}
                      >
                        {expired
                          ? "expired"
                          : `sent ${new Date(inv.createdISO).toLocaleDateString("en-GB")}`}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
