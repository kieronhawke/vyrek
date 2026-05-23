import Link from "next/link";
import { notFound } from "next/navigation";
import { assertMember } from "@/lib/member/auth";
import { findAthlete } from "@/lib/member/demo";

export const dynamic = "force-dynamic";

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await assertMember(`/app/analysis/athlete/${slug}`);
  const athlete = findAthlete(slug);
  if (!athlete) notFound();

  const initials = athlete.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <Link
        href="/app/analysis"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary hover:text-vyrek-text"
      >
        ← Athletes
      </Link>

      <header className="mt-4 flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-elevated text-lg font-black uppercase text-vyrek-text">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
            {athlete.name}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            {athlete.category} · {athlete.city}
          </p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-vyrek-border bg-vyrek-border-subtle">
        <Stat label="Personal best" value={athlete.pb} accent />
        <Stat label="Total races" value={String(athlete.raceCount)} />
        <Stat label="Best finish" value={athlete.recentRaces[0]?.rank ?? "-"} />
      </div>

      <section className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Station splits · PB race ]
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Split label="SkiErg" v={athlete.splits.skiErg} slug="ski-erg" />
          <Split label="Sled push" v={athlete.splits.sledPush} slug="sled-push" />
          <Split label="Sled pull" v={athlete.splits.sledPull} slug="sled-pull" />
          <Split label="Burpees" v={athlete.splits.burpee} slug="burpee-broad-jump" />
          <Split label="Rower" v={athlete.splits.rower} slug="rowing" />
          <Split label="Farmer's" v={athlete.splits.farmers} slug="farmers-carry" />
          <Split label="Sandbag" v={athlete.splits.sandbag} slug="sandbag-lunges" />
          <Split label="Wall ball" v={athlete.splits.wallBall} slug="wall-balls" />
        </div>
      </section>

      <section className="mt-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Race history ]
        </p>
        <ul role="list" className="mt-3 space-y-2">
          {athlete.recentRaces.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-vyrek-text">
                  {r.event}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  {r.date}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-base tabular-nums text-vyrek-text">
                  {r.time}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-accent">
                  {r.rank}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-vyrek-border-subtle bg-vyrek-elevated/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          What you can borrow
        </p>
        <p className="mt-2 text-sm leading-relaxed text-vyrek-text-secondary">
          Compare your own splits side by side. The biggest gain for most
          athletes at this level is the {weakestStation(athlete)}, that&apos;s
          where {athlete.name.split(" ")[0]} spends the most time relative to
          the front of the pack.
        </p>
      </section>
    </div>
  );
}

function weakestStation(a: ReturnType<typeof findAthlete>): string {
  if (!a) return "wall ball";
  const list: Array<[string, string]> = [
    ["SkiErg", a.splits.skiErg],
    ["sled push", a.splits.sledPush],
    ["sled pull", a.splits.sledPull],
    ["burpee broad jump", a.splits.burpee],
    ["rower", a.splits.rower],
    ["farmer's carry", a.splits.farmers],
    ["sandbag lunge", a.splits.sandbag],
    ["wall ball", a.splits.wallBall],
  ];
  return list.sort((x, y) => toSec(y[1]) - toSec(x[1]))[0][0];
}

function toSec(mmss: string): number {
  const [m, s] = mmss.split(":").map((n) => parseInt(n, 10));
  return (m || 0) * 60 + (s || 0);
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

function Split({
  label,
  v,
  slug,
}: {
  label: string;
  v: string;
  slug: string;
}) {
  return (
    <Link
      href={`/app/plan/stations#${slug}`}
      className="block rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-2 text-center transition-colors hover:border-vyrek-border-strong"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-vyrek-text">{v}</p>
    </Link>
  );
}
