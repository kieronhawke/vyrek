import Link from "next/link";
import { notFound } from "next/navigation";
import { assertMember } from "@/lib/member/auth";
import { findRace } from "@/lib/member/demo";

export const dynamic = "force-dynamic";

const PREP_CHECKLIST = [
  "Trim training volume by ~40% in race week",
  "Two short race-pace efforts, no longer than 8 minutes",
  "Carb load 90 minutes pre-race: 60-80g, mostly liquid",
  "Pack: trainers, two pairs of socks, gloves, kit tape, ID",
  "Arrive 90 minutes before your wave for a 20-minute warm-up",
  "Plan the wall ball pacing strategy before you walk in",
];

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await assertMember(`/app/analysis/race/${slug}`);
  const race = findRace(slug);
  if (!race) notFound();

  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(race.date));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <Link
        href="/app/analysis"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary hover:text-vyrek-text"
      >
        ← Races
      </Link>

      <header className="mt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Hyrox event ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          {race.event}
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          {race.city}, {race.country}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-vyrek-border bg-vyrek-border-subtle">
        <Stat label="Race date" value={shortDate(race.date)} />
        <Stat label="Weeks away" value={String(race.weeksFromNow)} accent />
        <Stat
          label="Registration"
          value={race.registrationOpen ? "Open" : "Soon"}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-vyrek-border-subtle bg-vyrek-elevated/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Date
        </p>
        <p className="mt-1 text-base text-vyrek-text">{dateFmt}</p>
      </section>

      <section className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Categories ]
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {race.categories.map((c) => (
            <span
              key={c}
              className="rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 py-1 text-xs font-medium text-vyrek-text"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Race-week prep ]
        </p>
        <ul role="list" className="mt-3 space-y-2">
          {PREP_CHECKLIST.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 px-4 py-3"
            >
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent"
              />
              <p className="text-sm text-vyrek-text">{item}</p>
            </li>
          ))}
        </ul>
      </section>

      {race.registrationOpen && race.registrationUrl ? (
        <div className="mt-10">
          <a
            href={race.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.98]"
          >
            Enter on hyrox.com →
          </a>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Registration is handled by Hyrox, not Vyrek.
          </p>
        </div>
      ) : (
        <div className="mt-10 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 py-3 text-center text-sm text-vyrek-text-secondary">
          Registration opens closer to the date.
        </div>
      )}
    </div>
  );
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-vyrek-elevated p-4 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-black tabular-nums md:text-2xl ${
          accent ? "text-vyrek-accent" : "text-vyrek-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
