import Link from "next/link";
import { Num } from "@/components/control/num";
import { SessionCard } from "@/components/client-app/session-card";
import { MEMBER, todaySession, weekDots } from "@/lib/client-app/member-fixtures";

/**
 * HOME — spec/11 §4.
 *
 * A private client's home leads with Ben: his note, then today's session as
 * one large tappable card. "Same codebase, genuinely different first
 * impression, because the private client is paying for access to a person
 * and the product should feel like it."
 *
 * One contextual nudge maximum, and the streak framed gently (spec/11 §8).
 */
export default function MemberHome() {
  const today = todaySession();
  const dots = weekDots();
  const done = dots.filter((d) => d === "done").length;

  return (
    <>
      <p className="eyebrow">Week {MEMBER.weekNumber} of {MEMBER.totalWeeks}</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Morning, {MEMBER.firstName}
      </h1>

      {/* Ben first. This is what the tier is for. */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <p className="eyebrow">Ben&apos;s note · {MEMBER.coachNoteDate}</p>
        <p
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-base)",
            lineHeight: 1.6,
          }}
        >
          {MEMBER.coachNote}
        </p>
        <Link
          href="/app/account"
          style={{
            display: "inline-block",
            marginTop: "var(--space-2)",
            minHeight: 44,
            lineHeight: "44px",
            color: "var(--accent)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Message Ben →
        </Link>
      </section>

      {/* The signature element: today, as one unmissable object. */}
      <h2 className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>
        Today
      </h2>
      {today ? (
        <>
          <SessionCard session={today} hero />
          <Link
            href="/train"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 56,
              marginTop: "var(--space-2)",
              background: "var(--accent)",
              color: "#0A0A0A",
              borderRadius: "var(--radius-button)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Start session
          </Link>
        </>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>Nothing scheduled today.</p>
      )}

      {/* This week at a glance — seven dots. spec/11 §4. */}
      <h2 className="eyebrow" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        This week
      </h2>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {dots.map((d, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              flex: 1,
              height: 8,
              borderRadius: 2,
              background:
                d === "done"
                  ? "var(--accent)"
                  : d === "today"
                    ? "var(--accent-faint)"
                    : "var(--surface-raised)",
              outline: d === "today" ? "1px solid var(--accent)" : "none",
            }}
          />
        ))}
      </div>
      <p
        style={{
          marginTop: "var(--space-1)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
        }}
      >
        <Num align="left">{done}</Num> of <Num align="left">7</Num> done. Nice
        work so far.
      </p>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
        }}
      >
        {MEMBER.nextRace.name} in{" "}
        <Num align="left" tone="accent">
          {MEMBER.nextRace.inDays}
        </Num>{" "}
        days.
      </p>
    </>
  );
}
