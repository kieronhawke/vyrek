import Link from "next/link";
import { assertMember } from "@/lib/member/auth";
import { DEMO_WEEKS, DEMO_WEEK, DEMO_VIDEOS_ALL, DEMO_STATIONS, programmeLabel } from "@/lib/member/demo";
import { SectionEyebrow } from "@/components/member/section-eyebrow";

export const dynamic = "force-dynamic";

const PHASE_TONE: Record<string, string> = {
  base: "border-suth-border-subtle bg-suth-elevated text-suth-text-secondary",
  build: "border-suth-accent/30 bg-suth-accent/10 text-suth-accent",
  peak: "border-red-500/30 bg-red-500/10 text-red-300",
  taper: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const TYPE_ICON: Record<string, string> = {
  rest: "-",
  run: "🏃",
  intervals: "⚡",
  strength: "🏋️",
  stations: "🎯",
  simulation: "🏁",
  recovery: "🧘",
};

export default async function PlanPage() {
  const ctx = await assertMember("/app/plan");
  const programme = programmeLabel(ctx.programme);
  const currentWeek = 4;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ {programme.toUpperCase()} · 12 WEEKS ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-3xl">
          Your programme
        </h1>
        <p className="mt-1 text-sm text-suth-text-secondary">
          Week {currentWeek} of 12 · recalibrates every Sunday based on what you log.
        </p>
      </header>

      {/* This week */}
      <section className="mb-8">
        <SectionEyebrow title="This week" right={`${DEMO_WEEK.filter((d) => d.done).length} / ${DEMO_WEEK.length}`} />
        <ol role="list" className="grid grid-cols-7 gap-1.5">
          {DEMO_WEEK.map((d) => (
            <li key={d.day}>
              <div
                className={`flex flex-col items-center gap-1 rounded-md border p-2 text-center ${
                  d.done
                    ? "border-suth-accent/40 bg-suth-accent/10"
                    : d.type === "rest"
                      ? "border-suth-border-subtle bg-suth-elevated/40"
                      : "border-suth-border-subtle bg-suth-elevated"
                }`}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  {d.day}
                </p>
                <p
                  className="text-sm"
                  aria-label={d.title}
                  title={d.title}
                >
                  {TYPE_ICON[d.type] ?? "·"}
                </p>
                {d.durationMin ? (
                  <p className="font-mono text-[9px] tabular-nums text-suth-text-tertiary">
                    {d.durationMin}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <ul role="list" className="mt-4 space-y-2">
          {DEMO_WEEK.filter((d) => d.type !== "rest").map((d) => (
            <li
              key={d.day}
              className="flex items-center justify-between gap-3 rounded-md border border-suth-border-subtle bg-suth-elevated/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent shrink-0 w-12">
                  {d.day}
                </span>
                <p className="truncate text-sm text-suth-text">{d.title}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                {d.durationMin}m
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 12-week roadmap */}
      <section className="mb-8">
        <SectionEyebrow title="12-week roadmap" />
        <ol role="list" className="space-y-2">
          {DEMO_WEEKS.map((w) => {
            const isCurrent = w.number === currentWeek;
            const isPast = w.number < currentWeek;
            return (
              <li key={w.number}>
                <div
                  className={`flex items-center gap-3 rounded-lg border bg-suth-elevated px-4 py-3 ${
                    isCurrent
                      ? "border-suth-accent"
                      : isPast
                        ? "border-suth-border-subtle opacity-70"
                        : "border-suth-border-subtle"
                  }`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-suth-border-subtle bg-suth-base font-mono text-xs tabular-nums text-suth-text">
                    {w.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-suth-text">
                      {w.focus}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      {w.sessionCount} sessions
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                      PHASE_TONE[w.phase]
                    }`}
                  >
                    {w.phase}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Hyrox stations library */}
      <section className="mb-8">
        <SectionEyebrow title="Hyrox stations" right={`${DEMO_STATIONS.length} stations`} />
        <Link
          href="/app/plan/stations"
          className="group block rounded-2xl border border-suth-border bg-suth-elevated/60 p-5 transition-colors hover:border-suth-border-strong"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-suth-text">
                Stations playbook
              </p>
              <p className="mt-1 text-sm text-suth-text-secondary">
                Spec, technique, failure pattern for every station. Tap to drill in.
              </p>
            </div>
            <span className="shrink-0 text-suth-accent">→</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {DEMO_STATIONS.map((s) => (
              <span
                key={s.slug}
                className="rounded-md border border-suth-border-subtle bg-suth-base/60 px-1.5 py-1 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-suth-text-tertiary"
              >
                {String(s.number).padStart(2, "0")}
              </span>
            ))}
          </div>
        </Link>
      </section>

      {/* Coach videos */}
      <section className="mb-2">
        <SectionEyebrow title="Coach library" right={`${DEMO_VIDEOS_ALL.length} videos`} />
        <ul role="list" className="grid grid-cols-2 gap-3">
          {DEMO_VIDEOS_ALL.map((v) => (
            <li key={v.id}>
              <Link
                href="#"
                className="group block overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-elevated transition-colors hover:border-suth-border-strong"
              >
                <div className="relative aspect-[4/3] bg-suth-overlay">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="h-full w-full object-cover grayscale transition-transform group-hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-suth-base/80 via-transparent to-transparent"
                  />
                  <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-pill bg-suth-base/80 px-2 py-0.5 font-mono text-[10px] text-suth-text">
                    {formatDuration(v.durationSec)}
                  </div>
                  <div
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex size-12 items-center justify-center rounded-full bg-suth-accent text-[#0A0A0A]">
                      ▶
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-suth-accent">
                    {v.category}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug text-suth-text">
                    {v.title}
                  </p>
                  <p className="mt-1 text-xs text-suth-text-tertiary">
                    {v.coach}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return `${m}:${String(s).padStart(2, "0")}`;
  return `${Math.floor(m / 60)}h${m % 60}`;
}
