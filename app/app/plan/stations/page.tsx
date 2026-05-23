import Link from "next/link";
import { assertMember } from "@/lib/member/auth";
import { DEMO_STATIONS, DEMO_VIDEOS_ALL } from "@/lib/member/demo";

export const dynamic = "force-dynamic";

export default async function StationsLibraryPage() {
  await assertMember("/app/plan/stations");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <Link
        href="/app/plan"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary hover:text-vyrek-text"
      >
        ← Plan
      </Link>

      <header className="mt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Stations library ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          The 8 Hyrox stations
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          Spec, technique, common failure pattern. Tap a station to drill in.
        </p>
      </header>

      <nav aria-label="Stations" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DEMO_STATIONS.map((s) => (
          <a
            key={s.slug}
            href={`#${s.slug}`}
            className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 p-3 text-center transition-colors hover:border-vyrek-border-strong"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-vyrek-accent">
              [{String(s.number).padStart(2, "0")}]
            </p>
            <p className="mt-1 text-sm font-semibold text-vyrek-text">
              {s.name}
            </p>
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-8">
        {DEMO_STATIONS.map((s) => {
          const vid = s.videoId
            ? DEMO_VIDEOS_ALL.find((v) => v.id === s.videoId)
            : null;
          return (
            <section
              key={s.slug}
              id={s.slug}
              className="scroll-mt-24 rounded-2xl border border-vyrek-border bg-vyrek-elevated/60 p-5 md:p-6"
            >
              <header className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                  [ Station {String(s.number).padStart(2, "0")} ]
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  {s.spec}
                </span>
              </header>
              <h2 className="mt-2 text-xl font-black tracking-[-0.02em] text-vyrek-text md:text-2xl">
                {s.name}
              </h2>

              <div className="mt-4 rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                  Gold standard
                </p>
                <p className="mt-1 font-mono text-sm tabular-nums text-vyrek-text">
                  {s.goldStandard}
                </p>
              </div>

              <div className="mt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                  Technique
                </p>
                <ul role="list" className="mt-2 space-y-2">
                  {s.technique.map((t, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent"
                      />
                      <p className="text-sm leading-relaxed text-vyrek-text">
                        {t}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-300">
                  Failure pattern
                </p>
                <p className="mt-1 text-sm leading-relaxed text-vyrek-text-secondary">
                  {s.failurePattern}
                </p>
              </div>

              {vid ? (
                <div className="mt-5 flex items-center gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-3">
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center rounded-full bg-vyrek-accent text-base text-[#0A0A0A]"
                  >
                    ▶
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-vyrek-text">
                      {vid.title}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {vid.coach} · {Math.round(vid.durationSec / 60)} min
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
