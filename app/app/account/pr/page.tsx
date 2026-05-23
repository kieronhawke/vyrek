import Link from "next/link";
import { assertMember } from "@/lib/member/auth";
import { DEMO_PRS } from "@/lib/member/demo";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Strength", "Cardio", "Hyrox"] as const;

export default async function PersonalRecordsPage() {
  await assertMember("/app/account/pr");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <Link
        href="/app/account"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary hover:text-vyrek-text"
      >
        ← Account
      </Link>

      <header className="mt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Personal records ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          Your numbers
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          Lifetime bests across strength, cardio, and race stations. New PRs are
          flagged when you log a session that beats your last best.
        </p>
      </header>

      {CATEGORIES.map((cat) => {
        const items = DEMO_PRS.filter((p) => p.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
              [ {cat} ]
            </p>
            <ul role="list" className="mt-3 space-y-2">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-vyrek-text">
                      {p.lift}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {dateFmt(p.date)}
                      {p.previous ? ` · was ${p.previous}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-lg tabular-nums text-vyrek-accent">
                      {p.value}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {p.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-10 rounded-2xl border border-vyrek-border-subtle bg-vyrek-elevated/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Logging a new PR
        </p>
        <p className="mt-2 text-sm leading-relaxed text-vyrek-text-secondary">
          When you mark a session complete and beat your best, the PR appears
          here automatically. No separate form. Manual entry is coming for
          lifts you do outside the programme.
        </p>
      </section>
    </div>
  );
}

function dateFmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
