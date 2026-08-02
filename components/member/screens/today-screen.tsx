import Link from "next/link";
import {
  DEMO_TODAY,
  DEMO_RECENT_SESSIONS,
  DEMO_COMMUNITY,
  DEMO_VOLUME,
} from "@/lib/member/demo";
import { RecentSessionList } from "@/components/member/recent-session-list";
import { CommunityFeed } from "@/components/member/community-feed";
import { VolumeChart } from "@/components/member/volume-chart";
import { WeekStrip } from "@/components/member/week-strip";
import {
  Card,
  Chip,
  ChipRow,
  Eyebrow,
  PhotoHeader,
  PrimaryAction,
} from "@/components/member/ui";
import { SessionBlocks } from "@/components/member/session-blocks";
import { DEMO_BLOCKS, countIntervals, peakEffort } from "@/lib/member/session-structure";
import { HEROES, pickPhoto } from "@/lib/photo-library";
import { weekFor } from "@/lib/member/week";

/**
 * TODAY, as markup.
 *
 * Presentation is split from the auth boundary so the ungated preview mount at
 * /control-preview/app can render the real screen without a bypass in shipped
 * auth code. Previously the preview re-exported the page itself, which calls
 * assertMember and therefore redirected to /login — the preview could not
 * preview the thing it existed to preview.
 *
 * It also means the visual suite can cover these screens without standing up
 * Supabase, which is why /control-preview/admin exists for the operator side.
 */
export function TodayScreen({
  firstName,
  programme,
  base = "/app",
}: {
  firstName: string;
  programme: string;
  base?: string;
}) {
  // Stable per training week: the hero does not reshuffle on every build, but
  // it does change as the block progresses.
  const hero = pickPhoto(HEROES, `week-${DEMO_TODAY.weekNumber}`);
  const week = weekFor();
  const done = week.filter((d) => d.done).length;
  const peak = peakEffort(DEMO_BLOCKS);

  return (
    <>
      <PhotoHeader
        photo={hero}
        eyebrow={todayLabel()}
        title={`${greeting()}, ${firstName}.`}
      >
        <ChipRow>
          <Chip>Week {DEMO_TODAY.weekNumber} of 12</Chip>
          <Chip>{programme}</Chip>
        </ChipRow>
      </PhotoHeader>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right={`${done} of 7 done`}>This week</Eyebrow>
        <WeekStrip days={week} base={base} />
      </section>

      {/* The session, as one unmissable object. */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right={`${DEMO_TODAY.durationMin} min`}>Today</Eyebrow>
        <Card padded={false} style={{ marginBottom: "var(--space-2)" }}>
          <div style={{ padding: "var(--space-2)" }}>
            <ChipRow>
              <Chip tone="accent">{DEMO_TODAY.type}</Chip>
              <Chip>{countIntervals(DEMO_BLOCKS)} intervals</Chip>
              {peak ? <Chip tone="warn">Peak {peak}/10</Chip> : null}
            </ChipRow>
            <h3
              style={{
                margin: "var(--space-1) 0 0",
                fontSize: "var(--text-xl)",
                lineHeight: 1.15,
                fontWeight: 750,
                letterSpacing: "-0.02em",
              }}
            >
              {DEMO_TODAY.title}
            </h3>
          </div>

          {DEMO_TODAY.notes ? (
            <div
              style={{
                padding: "var(--space-2)",
                borderTop: "1px solid var(--border)",
                background: "var(--surface-raised)",
              }}
            >
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>
                Ben&apos;s note
              </p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
                {DEMO_TODAY.notes}
              </p>
            </div>
          ) : null}
        </Card>

        <SessionBlocks blocks={DEMO_BLOCKS} />

        <div style={{ marginTop: "var(--space-2)" }}>
          <PrimaryAction href="/train">Start session</PrimaryAction>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right={`Week ${DEMO_TODAY.weekNumber}`}>Training load</Eyebrow>
        <VolumeChart data={DEMO_VOLUME} />
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow
          right={
            <Link
              href={`${base}/progress`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
                padding: "0 4px",
                margin: "0 -4px",
                color: "var(--accent-text)",
                textDecoration: "none",
              }}
            >
              Progress →
            </Link>
          }
        >
          Recent
        </Eyebrow>
        <RecentSessionList sessions={DEMO_RECENT_SESSIONS.slice(0, 4)} />
      </section>

      <section>
        <Eyebrow right="Live">Community</Eyebrow>
        <CommunityFeed posts={DEMO_COMMUNITY.slice(0, 5)} />
      </section>
    </>
  );
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

/** Time of day, so the greeting is not wrong for two thirds of the day. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}
