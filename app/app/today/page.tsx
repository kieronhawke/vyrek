import { assertMember } from "@/lib/member/auth";
import {
  DEMO_TODAY,
  DEMO_RECENT_SESSIONS,
  DEMO_COMMUNITY,
  DEMO_VOLUME,
  programmeLabel,
} from "@/lib/member/demo";
import { TodayWorkoutCard } from "@/components/member/today-workout-card";
import { RecentSessionList } from "@/components/member/recent-session-list";
import { CommunityFeed } from "@/components/member/community-feed";
import { SectionEyebrow } from "@/components/member/section-eyebrow";
import { RaceCountdown } from "@/components/member/race-countdown";
import { VolumeChart } from "@/components/member/volume-chart";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const ctx = await assertMember("/app/today");
  const programme = programmeLabel(ctx.programme);
  const firstName = ctx.user.email
    .replace(/@.*/, "")
    .split(/[\W_]+/)[0]
    ?.replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      {/* Greeting */}
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          {todayLabel()}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          Morning, {firstName ?? "athlete"}.
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          Week {DEMO_TODAY.weekNumber} of 12 · {programme} programme
        </p>
      </header>

      <div className="mb-5">
        <RaceCountdown />
      </div>

      <TodayWorkoutCard workout={DEMO_TODAY} />

      <section className="mt-10">
        <SectionEyebrow title="Training load" right={`Week ${DEMO_TODAY.weekNumber}`} />
        <VolumeChart data={DEMO_VOLUME} />
      </section>

      <section className="mt-10">
        <SectionEyebrow title="This week" right={`${DEMO_TODAY.weekNumber} / 12`} />
        <RecentSessionList sessions={DEMO_RECENT_SESSIONS} />
      </section>

      <section className="mt-10">
        <SectionEyebrow title="Community" right="Live" />
        <CommunityFeed posts={DEMO_COMMUNITY.slice(0, 6)} />
      </section>
    </div>
  );
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}
