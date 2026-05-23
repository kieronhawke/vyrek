import { format } from "date-fns";
import { PageHeader, Stat, Card, Table, NoticeCard } from "@/components/admin/ui";
import { quizAnalytics } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const PROGRAMME_LABELS: Record<string, string> = {
  "first-race": "First Race",
  "sub-90": "Sub-90",
  doubles: "Doubles",
  pro: "Pro",
};

export default async function AdminQuizPage() {
  const res = await quizAnalytics();

  if (!res.ok) {
    return (
      <>
        <PageHeader eyebrow="Marketing" title="Quiz responses" />
        <NoticeCard
          title="Could not load quiz analytics"
          body={<>Detail: {res.reason}</>}
        />
      </>
    );
  }

  const total = res.data.total;
  const sortedProgrammes = Object.entries(res.data.byProgram).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Quiz responses"
        description="Aggregate signals from completed quiz funnels."
      />

      <section className="mb-8">
        <Stat label="Total responses" value={total.toLocaleString("en-GB")} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          By programme
        </h2>
        {sortedProgrammes.length === 0 ? (
          <Card>
            <p className="text-sm text-vyrek-text-tertiary">No data yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {sortedProgrammes.map(([p, n]) => {
              const pct = total ? Math.round((n / total) * 100) : 0;
              return (
                <Card key={p}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
                    {PROGRAMME_LABELS[p] ?? p}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.02em] text-vyrek-text tabular-nums">
                    {n}
                  </p>
                  <p className="mt-1 text-xs text-vyrek-text-tertiary">{pct}% of total</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Recent responses
        </h2>
        <Table
          headers={["Email", "Programme", "Submitted"]}
          empty="No responses yet."
          rows={res.data.recent.map((r) => [
            <span key="e">{r.email}</span>,
            PROGRAMME_LABELS[r.program] ?? r.program,
            format(new Date(r.created_at), "dd MMM yyyy, HH:mm"),
          ])}
        />
      </section>
    </>
  );
}
