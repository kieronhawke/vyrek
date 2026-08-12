import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { ResetTestData } from "@/components/admin/reset-test-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

function StatusLine({
  label,
  badge,
  detail,
}: {
  label: string;
  badge: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-suth-border-subtle py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-sm font-semibold text-suth-text">{label}</p>
        <p className="mt-1 text-xs text-suth-text-tertiary">{detail}</p>
      </div>
      <div className="shrink-0">{badge}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  // Read server-side only. STRIPE_SECRET_KEY never reaches the client; we
  // report only the mode it implies, not the key.
  const stripeLive = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
  const dataMode =
    process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo";

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Housekeeping for the admin. More will live here over time."
      />
      <div className="flex max-w-2xl flex-col gap-8">
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Site controls
          </h2>
          <Card>
            <p className="mb-2 text-sm text-suth-text-secondary">
              Status, not switches. These read the live configuration so you
              can see the state at a glance. The controls that aren&apos;t safe
              to flip from here are shown read-only on purpose.
            </p>
            <StatusLine
              label="Search engines"
              badge={<Badge tone="bad">blocked</Badge>}
              detail="The whole site is noindexed until launch. An X-Robots-Tag noindex, nofollow header in next.config.ts outranks every per-page tag, so nothing can opt back in while it is present. Removing it is a deliberate, hand-done step when Kieron says go."
            />
            <StatusLine
              label="Data mode"
              badge={
                dataMode === "live" ? (
                  <Badge tone="good">live</Badge>
                ) : (
                  <Badge tone="warn">demo</Badge>
                )
              }
              detail={
                dataMode === "live"
                  ? "NEXT_PUBLIC_DATA_MODE=live. Results read from the ingested database."
                  : "NEXT_PUBLIC_DATA_MODE=demo. Results read from the committed demo corpus."
              }
            />
            <StatusLine
              label="Stripe"
              badge={
                stripeLive ? (
                  <Badge tone="good">live mode</Badge>
                ) : (
                  <Badge tone="warn">test mode</Badge>
                )
              }
              detail={
                stripeLive
                  ? "The live Stripe key is in use. Real cards, real charges."
                  : "A test (sandbox) Stripe key is in use. No real money moves."
              }
            />
          </Card>
        </section>

        <ResetTestData />
      </div>
    </>
  );
}
