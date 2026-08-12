import Link from "next/link";
import {
  listRealCoachClients,
  sortForCoachToday,
  type RealCoachClient,
} from "@/lib/coach/data";

export const dynamic = "force-dynamic";

/**
 * COACH MODE — TODAY, ON REAL DATA.
 *
 * Ben said it plainly: "I need to know when they've got programming up
 * until. From a logistical point of view, I need to know if they've paid
 * or not." That is the whole screen — now read from the same tables as
 * Mission Control instead of fixtures.
 *
 * No MRR, no churn, no graphs: spec/09 §0 says he never sees a financial
 * metric, and that constraint survives the wiring-up.
 */

const toneColor: Record<RealCoachClient["paymentTone"], string> = {
  ok: "var(--text-muted)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

function Count({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 96,
        padding: "var(--space-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: tone ?? "var(--text)",
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

export default async function CoachTodayPage() {
  const clients = sortForCoachToday(await listRealCoachClients());

  const needsPlan = clients.filter(
    (c) =>
      c.programmedDaysLeft === null ||
      c.programmedDaysLeft <= 2,
  ).length;
  const moneyTrouble = clients.filter((c) => c.paymentTone === "danger").length;

  return (
    <>
      <h1
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: "var(--text-xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-3)",
        }}
      >
        Today
      </h1>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Count n={clients.length} label="Clients" />
        <Count
          n={needsPlan}
          label="Need a plan"
          tone={needsPlan > 0 ? "var(--warn)" : undefined}
        />
        <Count
          n={moneyTrouble}
          label="Payment failed"
          tone={moneyTrouble > 0 ? "var(--danger)" : undefined}
        />
      </div>

      <ul
        role="list"
        style={{
          listStyle: "none",
          margin: "var(--space-3) 0 0",
          padding: 0,
          display: "grid",
          gap: "var(--space-2)",
        }}
      >
        {clients.length === 0 ? (
          <li style={{ color: "var(--text-muted)", fontSize: "var(--text-md)" }}>
            No clients yet. They appear here the moment somebody signs up.
          </li>
        ) : (
          clients.map((c) => (
            <li key={c.customerId}>
              <Link
                href={`/coach/plans/${c.customerId}`}
                style={{
                  display: "block",
                  padding: "var(--space-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--surface)",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "var(--space-2)",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: toneColor[c.planTone],
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.planLabel}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: "var(--text-sm)",
                    color: toneColor[c.paymentTone],
                  }}
                >
                  {c.paymentLabel}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
