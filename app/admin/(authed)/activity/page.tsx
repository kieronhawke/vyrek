import { formatDistanceToNow, format } from "date-fns";
import { PageHeader, NoticeCard } from "@/components/admin/ui";
import { listRecentEvents, eventLabel } from "@/lib/admin/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Activity" };

/**
 * THE ACTIVITY FEED, from the real admin_events log. Every signup, payment
 * outcome, cancellation, plan sent and admin action, newest first — the
 * honest record of what has actually happened, not a mock.
 */
export default async function AdminActivityPage() {
  const res = await listRecentEvents(80);

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Activity"
        description="Everything that has happened across the business, newest first. Read straight from the log."
      />

      {!res.ok ? (
        <NoticeCard title="Couldn't load activity" body={<>Detail: {res.reason}.</>} />
      ) : res.data.length === 0 ? (
        <p className="text-sm text-suth-text-secondary">
          Nothing yet. Signups, payments, cancellations and plans appear here
          the moment they happen.
        </p>
      ) : (
        <ol role="list" className="relative space-y-0 border-l border-suth-border-subtle pl-5">
          {res.data.map((e) => {
            const meta = e.metadata ?? {};
            const detail =
              (meta.event as string | undefined) ??
              (meta.email as string | undefined) ??
              null;
            return (
              <li key={e.id} className="relative pb-5">
                <span className="absolute -left-[23px] top-1.5 size-2 rounded-full bg-suth-accent" aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <p className="text-sm text-suth-text">
                    {eventLabel(e.action)}
                    {detail ? (
                      <span className="text-suth-text-tertiary"> · {detail}</span>
                    ) : null}
                  </p>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary"
                    title={format(new Date(e.created_at), "d MMM yyyy, HH:mm")}
                  >
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-suth-text-tertiary">
                  {e.actor}
                  {e.target_kind ? ` · ${e.target_kind}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
