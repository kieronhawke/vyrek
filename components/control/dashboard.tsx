"use client";

import Link from "next/link";
import { CLIENTS, LEADS, type CoachClient } from "@/lib/control/fixtures";
import { APPT_ROWS, MESSAGE_ROWS, PLAN_ROWS } from "@/lib/control/admin-fixtures";
import { useCollection } from "@/lib/control/store";
import { homeRaces, daysUntil, formatDates } from "@/lib/hyrox/races";

/**
 * THE DASHBOARD.
 *
 * What this replaces: four numbers, three bars, and two thirds of the screen
 * empty. It was called the worst dashboard the client had seen and that was
 * fair — it answered no question a coach opens a console to ask.
 *
 * What a coach actually opens this to find out, in order:
 *   1. Who am I letting down today.
 *   2. What is on.
 *   3. Is the money alright.
 *   4. What has happened since I last looked.
 *
 * So the first thing on the page is a work queue, not a metric. Every row is a
 * link to the place the problem gets fixed; a dashboard that reports a problem
 * and leaves you to go looking for it is a report, not a console.
 *
 * The client list reads through the same store the Clients module writes to, so
 * editing a client there changes what is due here.
 */

const money = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

function Panel({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          padding: "var(--space-2)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h2 className="eyebrow" style={{ margin: 0 }}>
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 650,
              color: "var(--accent-text)",
              textDecoration: "none",
            }}
          >
            {hrefLabel ?? "All"} →
          </Link>
        ) : null}
      </header>
      <div style={{ padding: "var(--space-1) var(--space-2) var(--space-2)", flex: 1 }}>
        {children}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: "var(--space-2)",
        display: "grid",
        gap: 2,
        minWidth: 0,
      }}
    >
      <span className="eyebrow">{label}</span>
      <span
        className="num"
        style={{
          fontSize: 30,
          lineHeight: 1.05,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: tone ?? "var(--text)",
        }}
      >
        {value}
      </span>
      {sub ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/** Twelve weeks of MRR, so the number has a shape rather than being a number. */
const MRR_SERIES = [2380, 2560, 2720, 2980, 3140, 3260, 3480, 3640, 3820, 3960, 4110, 4240];

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 30 - ((v - min) / (max - min || 1)) * 26;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      style={{ width: "100%", height: 44, display: "block" }}
      role="img"
      aria-label={`Monthly recurring revenue over twelve months, ${money(min)} to ${money(max)}`}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Dashboard({ base }: { base: string }) {
  const { items: clients } = useCollection<CoachClient>("clients", CLIENTS);

  const needsPlan = clients
    .filter((c) => c.programmedUntilDays <= 3)
    .sort((a, b) => a.programmedUntilDays - b.programmedUntilDays);
  const moneyProblems = clients.filter(
    (c) => c.payment === "late" || c.payment === "failed",
  );
  const flagged = clients.filter((c) => c.flags.length > 0);
  const noteMissing = PLAN_ROWS.filter((p) => !p.coachNote);

  // One queue, ordered by how much it costs to ignore.
  const queue = [
    ...moneyProblems.map((c) => ({
      id: `pay-${c.id}`,
      what: `${c.name} — ${c.paymentLabel}`,
      why: "Payment",
      href: `${base}/clients/${c.id}`,
      tone: "var(--danger)",
    })),
    ...needsPlan.map((c) => ({
      id: `plan-${c.id}`,
      what: `${c.name} — ${
        c.programmedUntilDays < 0
          ? `${Math.abs(c.programmedUntilDays)} days overdue`
          : `${c.programmedUntilDays} days left`
      }`,
      why: "Needs a plan",
      href: `${base}/plans/${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      tone: c.programmedUntilDays < 0 ? "var(--danger)" : "var(--warn)",
    })),
    ...noteMissing.map((p) => ({
      id: `note-${p.id}`,
      what: `${p.client} — coach's note not written`,
      why: "Blocks send",
      href: `${base}/plans`,
      tone: "var(--warn)",
    })),
    ...flagged
      .filter((c) => !moneyProblems.includes(c))
      .flatMap((c) =>
        c.flags.map((f, i) => ({
          id: `flag-${c.id}-${i}`,
          what: `${c.name} — ${f}`,
          why: "Flag",
          href: `${base}/clients/${c.id}`,
          tone: "var(--text-muted)",
        })),
      ),
  ];

  const mrr = MRR_SERIES[MRR_SERIES.length - 1];
  const prev = MRR_SERIES[MRR_SERIES.length - 2];
  const growth = Math.round(((mrr - prev) / prev) * 100);
  const nextRace = homeRaces()[0];

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* ── The queue ─────────────────────────────────────────────────── */}
      <Panel
        title={`Needs you today · ${queue.length}`}
        href={`${base}/clients`}
        hrefLabel="All clients"
      >
        {queue.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            Nothing outstanding. Every client is programmed and paid up.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
            {queue.slice(0, 8).map((row, i) => (
              <li
                key={row.id}
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <Link
                  href={row.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    minHeight: 48,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 3,
                      alignSelf: "stretch",
                      background: row.tone,
                      borderRadius: 2,
                      margin: "8px 0",
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)" }}>
                    {row.what}
                  </span>
                  <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>
                    {row.why}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Money ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: "var(--space-1)",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        <Metric label="MRR" value={money(mrr)} sub={`${growth >= 0 ? "+" : ""}${growth}% on last month`} />
        <Metric label="Active clients" value={String(clients.length)} sub="paying" />
        <Metric label="New leads" value={String(LEADS.length)} sub="this week" />
        <Metric
          label="Payment issues"
          value={String(moneyProblems.length)}
          tone={moneyProblems.length ? "var(--danger)" : undefined}
          sub={moneyProblems.length ? "chase today" : "all clear"}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: "var(--space-2)",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <Panel title="Revenue, twelve months" href={`${base}/finance`} hrefLabel="Finance">
          <Sparkline data={MRR_SERIES} />
          <p
            style={{
              margin: "var(--space-1) 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            {money(MRR_SERIES[0])} to {money(mrr)}. Sample figures until Stripe
            is connected.
          </p>
        </Panel>

        {/* ── What is on ──────────────────────────────────────────────── */}
        <Panel title="Diary, next up" href={`${base}/diary`} hrefLabel="Diary">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
            {APPT_ROWS.slice(0, 4).map((a, i) => (
              <li
                key={a.id}
                style={{
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {/* Stacked, not a three-column row: at panel width the type
                    label was clipping to "PLAN REVIE" and "CHECK-". */}
                <span
                  className="num"
                  style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}
                >
                  {a.when}
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 650 }}>{a.client}</p>
                <p className="eyebrow" style={{ margin: "1px 0 0" }}>
                  {a.type}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── Since you last looked ───────────────────────────────────── */}
        <Panel title="Latest messages" href={`${base}/messages`} hrefLabel="Messages">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
            {MESSAGE_ROWS.slice(0, 4).map((m, i) => (
              <li
                key={m.id}
                style={{
                  padding: "8px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <span style={{ fontWeight: 650 }}>{m.client}</span>{" "}
                <span className="eyebrow">{m.channel}</span>
                <p
                  style={{
                    margin: "2px 0 0",
                    color: "var(--text-muted)",
                    fontSize: "var(--text-xs)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.preview}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── The season ──────────────────────────────────────────────── */}
        <Panel title="Next UK race" href="/hyrox/events" hrefLabel="Calendar">
          {nextRace ? (
            <>
              <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
                {nextRace.name}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                }}
              >
                {formatDates(nextRace)} · {nextRace.city}
              </p>
              <p
                className="num"
                style={{ margin: "var(--space-1) 0 0", fontSize: 26, fontWeight: 700 }}
              >
                {daysUntil(nextRace)} days
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                A twelve-week block for it starts in{" "}
                {Math.max(0, Math.round(daysUntil(nextRace) / 7) - 12)} weeks.
              </p>
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
