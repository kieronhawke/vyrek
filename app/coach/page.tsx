import { Num } from "@/components/control/num";
import { SplitBar } from "@/components/control/split-bar";
import {
  listCoachClients,
  sortForToday,
  todayCounts,
  type CoachClient,
} from "@/lib/control/fixtures";

/**
 * COACH MODE — TODAY
 *
 * docs/build-pack/spec/10 §5. Ben said it plainly: "I need to know when
 * they've got programming up until. From a logistical point of view, I need
 * to know if they've paid or not." That is the whole screen.
 *
 * Three counts above, then one list. No MRR, no churn, no graphs — spec/09 §0
 * is explicit that he never sees a financial metric.
 *
 * Tables become cards below 768px (spec/14 §6), and this screen is designed
 * card-first because it is never used on a desktop.
 */

function paymentTone(c: CoachClient) {
  if (c.payment === "failed" || c.payment === "late") return "danger" as const;
  return undefined;
}

function programmingTone(c: CoachClient) {
  if (c.programmingStatus === "overdue") return "danger" as const;
  if (c.programmingStatus === "due_soon") return "warn" as const;
  return undefined;
}

/** Plain English, never a status enum. spec/14 §9. */
function programmingLabel(c: CoachClient): string {
  if (c.programmingStatus === "overdue") {
    return `Ran out ${Math.abs(c.programmedUntilDays)} days ago`;
  }
  if (c.programmingStatus === "awaiting_race_debrief") {
    return "Debrief due";
  }
  if (c.programmedUntilDays === 0) return "Runs out today";
  return `${c.programmedUntilDays} days left`;
}

export default function CoachTodayPage() {
  const clients = sortForToday(listCoachClients());
  const counts = todayCounts();

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

      {/* ── The only three numbers on the screen ───────────────────── */}
      <ul
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-1)",
          listStyle: "none",
          margin: "0 0 var(--space-4)",
          padding: 0,
        }}
      >
        {[
          { label: "Plans due", value: counts.plansDue, tone: counts.plansDue > 0 ? ("warn" as const) : undefined },
          { label: "Payments late", value: counts.paymentsLate, tone: counts.paymentsLate > 0 ? ("danger" as const) : undefined },
          { label: "Races < 14d", value: counts.racesSoon, tone: undefined },
        ].map((stat) => (
          <li
            key={stat.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
            }}
          >
            <Num align="left" tone={stat.tone} size="metric">
              {stat.value}
            </Num>
            <p className="eyebrow" style={{ marginTop: 4 }}>
              {stat.label}
            </p>
          </li>
        ))}
      </ul>

      {/* ── The list ───────────────────────────────────────────────── */}
      <h2 className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
        Who needs you
      </h2>

      <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}>
        {clients.map((c) => (
          <li
            key={c.id}
            id={c.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "var(--text-base)" }}>
                {c.name}
              </span>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color:
                    paymentTone(c) === "danger"
                      ? "var(--danger)"
                      : "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {c.payment === "paid" ? "Paid " : ""}
                <span className="num">{c.paymentLabel}</span>
              </span>
            </div>

            {/* Runway against their next billing date, which is exactly
                the example spec/14 §4 gives. The floor at zero is what
                separates "two days left" from "already run out" — without
                it both painted the same danger red. */}
            <SplitBar
              label="Programmed until"
              value={c.programmedUntilDays}
              target={c.billingInDays}
              max={30}
              criticalAtOrBelow={0}
              warnAtOrBelow={7}
              display={programmingLabel(c)}
              targetLabel="renewal"
            />

            {c.nextRace ? (
              <p
                style={{
                  marginTop: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                {c.nextRace.name} in <span className="num">{c.nextRace.inDays}</span> days
                {c.nextRace.priority === "A" ? " · A race" : null}
              </p>
            ) : null}

            {c.flags.length > 0 ? (
              <ul
                role="list"
                style={{
                  listStyle: "none",
                  margin: "var(--space-2) 0 0",
                  padding: 0,
                  display: "grid",
                  gap: 4,
                }}
              >
                {c.flags.map((flag) => (
                  <li
                    key={flag}
                    style={{
                      fontSize: "var(--text-xs)",
                      color:
                        programmingTone(c) === "danger"
                          ? "var(--danger)"
                          : "var(--text-muted)",
                    }}
                  >
                    {flag}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Sample records. Real clients appear once the database is connected.
      </p>
    </>
  );
}
