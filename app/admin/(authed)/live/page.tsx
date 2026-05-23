import { PageHeader, Card, Badge, NoticeCard } from "@/components/admin/ui";
import { LiveSessions } from "@/components/admin/live-sessions";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Session = {
  id: string;
  path: string;
  country: string | null;
  customer_email: string | null;
  user_agent: string | null;
  referrer: string | null;
  started_at: string;
  last_seen: string;
};

async function fetchLive(): Promise<
  { ok: true; sessions: Session[] } | { ok: false; reason: string }
> {
  try {
    const sb = supabaseAdmin();
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data, error } = await sb
      .from("live_sessions")
      .select("*")
      .gte("last_seen", cutoff)
      .order("last_seen", { ascending: false })
      .limit(500);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, sessions: (data ?? []) as Session[] };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

export default async function AdminLivePage() {
  const initial = await fetchLive();
  return (
    <>
      <PageHeader
        eyebrow="Right now"
        title="Live on Vyrek"
        description="Visitors active in the last 60 seconds. Polls every 5s."
      />
      {!initial.ok ? (
        <NoticeCard
          title="Presence unavailable"
          body={<>Detail: {initial.reason}. Apply migration 0005.</>}
        />
      ) : (
        <LiveSessions initial={initial.sessions} />
      )}
      <p className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        <Badge tone="accent">LIVE</Badge>
        Sessions older than 60s drop off automatically
      </p>
    </>
  );
}
