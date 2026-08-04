import Image from "next/image";
import Link from "next/link";
import { DEMO_WEEKS, DEMO_TODAY } from "@/lib/member/demo";
import { weekFor } from "@/lib/member/week";
import { PhaseBar } from "@/components/member/phase-bar";
import { WeekGrid } from "@/components/member/week-grid";
import { SessionFeedback } from "@/components/member/session-feedback";
import {
  Card,
  Chip,
  ChipRow,
  Eyebrow,
  Row,
  RowGroup,
  StatTile,
  StatTiles,
} from "@/components/member/ui";
import { BEN_PHOTOS, pickPhoto } from "@/lib/photo-library";

/**
 * PLAN — what Ben has programmed, and where this week sits inside it.
 *
 * This is the screen the whole product hangs off: the athlete is paying for
 * someone else to decide what they do, so the plan has to read as authored
 * rather than generated. Three things carry that, and none of them were here
 * before:
 *
 *   1. The block, whole, as a phase strip. Not "week 4" in isolation — week 4
 *      of a twelve-week arc that ramps and then tapers into a race.
 *   2. Ben's note on the phase, attributed and dated, above the sessions.
 *   3. A way to answer back. A plan the athlete cannot respond to is a
 *      broadcast, and the only signal a session was too heavy becomes that it
 *      quietly stops getting done.
 */

const TYPE_TONE: Record<string, "neutral" | "accent" | "ok" | "warn"> = {
  rest: "neutral",
  run: "ok",
  strength: "accent",
  intervals: "warn",
  simulation: "warn",
};

export function PlanScreen({
  programme,
  base = "/app",
}: {
  programme: string;
  base?: string;
}) {
  const currentWeek = DEMO_TODAY.weekNumber;
  const week = DEMO_WEEKS.find((w) => w.number === currentWeek) ?? DEMO_WEEKS[0];
  const coach = pickPhoto(BEN_PHOTOS, "plan-coach");
  const week7 = weekFor();
  const totalMin = week7.reduce((a, d) => a + (d.durationMin ?? 0), 0);
  const sessions = week7.filter((d) => d.type !== "rest").length;

  return (
    <>
      <p className="eyebrow">{programme} programme</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Your plan
      </h1>

      {/* ── The block, whole ─────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right={`Week ${currentWeek} of ${DEMO_WEEKS.length}`}>
          The block
        </Eyebrow>
        <Card>
          <PhaseBar weeks={DEMO_WEEKS} currentWeek={currentWeek} />
          <p
            style={{
              margin: "var(--space-2) 0 0",
              fontSize: "var(--text-sm)",
              lineHeight: 1.5,
            }}
          >
            <strong>{week.label} · {week.focus}.</strong>{" "}
            <span style={{ color: "var(--text-muted)" }}>
              {DEMO_WEEKS.length - currentWeek} weeks until race week.
            </span>
          </p>
        </Card>
      </section>

      {/* ── Ben's note on the phase ──────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>From your coach</Eyebrow>
        <Card padded={false} style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-2)" }}>
            <div
              style={{
                position: "relative",
                flex: "0 0 auto",
                width: 44,
                height: 44,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <Image
                src={coach.src}
                alt={coach.alt}
                fill
                sizes="44px"
                style={{ objectFit: "cover", filter: "grayscale(1)" }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700 }}>
                Ben Sutherland
              </p>
              <p
                className="eyebrow"
                style={{ margin: "1px 0 var(--space-1)" }}
              >
                Set this block · Sunday 26 July
              </p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
                We move into build this week. The runs get faster, not longer —
                threshold means uncomfortable but repeatable, not a race. Sled
                work is technique under fatigue, so if the push turns into a
                grind, drop the weight rather than the standard. Tell me how
                Thursday feels; that is the session I will adjust first.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── This week's numbers ──────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>This week</Eyebrow>
        <StatTiles>
          <StatTile label="Sessions" value={sessions} sub={`${7 - sessions} rest`} />
          <StatTile label="Time" value={`${Math.round(totalMin / 60)}h`} sub={`${totalMin} min`} />
          <StatTile label="Phase" value={week.phase} sub={week.focus} />
        </StatTiles>
      </section>

      {/* ── The week, as Ben wrote it ────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right="Tap a session to tick it off">This week</Eyebrow>
        <WeekGrid base={base} />
      </section>

      {/* ── Take it with you ─────────────────────────────────────────── */}
      <section>
        <Eyebrow>Take it with you</Eyebrow>
        <RowGroup>
          {/* v2 is the designed one: branded masthead, day cards two-up, an
              icon and a set quantity on every line. v1 still exists as the
              ink-saver and the admin week builder offers both — but the member
              was being sent to the plain version, which is why the PDF looked
              like the old format. It was. */}
          <Row
            label="Print or save as PDF"
            value="Open →"
            tone="var(--accent-text)"
            href="/print/plan/haseeb/v2"
          />
          {/* v2, for the same reason as the PDF above: it carries the brand
              masthead, the black-and-chartreuse header and banded days, and
              it is a row per line of work so the file can be sorted and
              filtered. v1 is Ben's plain seven-column sheet and is still what
              the builder offers as the alternative. */}
          <Row
            label="Spreadsheet"
            value="Download .xlsx →"
            tone="var(--accent-text)"
            href="/api/export/haseeb/xlsx-v2"
          />
          <Row label="Add this week to your calendar" value="Download .ics →" tone="var(--accent-text)" href="/api/member/week.ics" />
          <Row label="Station technique guides" value="Open →" href={`${base}/plan/stations`} />
          <Row label="Your splits and benchmarks" value="Open →" href={`${base}/progress`} />
        </RowGroup>
        <p
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          Downloads generate once the plan is stored in the database. The
          sessions above are sample data.
        </p>
      </section>
    </>
  );
}
