import Link from "next/link";
import { PageHeader, Card, Badge, Stat, NoticeCard, Table } from "@/components/admin/ui";
import { LiveSessions } from "@/components/admin/live-sessions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { visitorStats, enquiryPins } from "@/lib/admin/live-stats";
import { project } from "@/lib/geo/static-map";

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

// The UK-wide frame every pin is projected into. One static base image,
// pins positioned with the same Web Mercator maths the renderer uses, so
// they land exactly where the tiles say they should.
const MAP = { lat: 54.2, lon: -3.4, zoom: 5, w: 900, h: 560 };

function pinPosition(lat: number, lon: number) {
  const centre = project(MAP.lat, MAP.lon, MAP.zoom);
  const p = project(lat, lon, MAP.zoom);
  const x = p.x - centre.x + MAP.w / 2;
  const y = p.y - centre.y + MAP.h / 2;
  if (x < 8 || x > MAP.w - 8 || y < 8 || y > MAP.h - 8) return null;
  return { leftPct: (x / MAP.w) * 100, topPct: (y / MAP.h) * 100 };
}

export default async function AdminLivePage() {
  const [initial, stats, pins] = await Promise.all([
    fetchLive(),
    visitorStats(),
    enquiryPins(60),
  ]);

  const placedPins = pins
    .map((p) => ({ ...p, pos: pinPosition(p.latitude, p.longitude) }))
    .filter((p) => p.pos !== null);

  return (
    <>
      <PageHeader
        eyebrow="Right now"
        title="Live on Suth Performance"
        description="Who's on the site now, how the week is going, and where enquiries are coming from."
      />

      {stats ? (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="On the site now" value={String(stats.liveNow)} />
          <Stat label="Visits today" value={String(stats.today)} />
          <Stat label="Visits · 7 days" value={String(stats.last7Days)} />
          <Stat
            label="Enquiries mapped"
            value={String(placedPins.length)}
            hint="Last 60 days, with a location."
          />
        </div>
      ) : null}

      {!initial.ok ? (
        <NoticeCard
          title="Presence unavailable"
          body={<>Detail: {initial.reason}.</>}
        />
      ) : (
        <LiveSessions initial={initial.sessions} />
      )}

      {/* ── Where enquiries come from ─────────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Where enquiries come from
        </h2>
        {placedPins.length === 0 ? (
          <Card>
            <p className="text-sm text-suth-text-tertiary">
              No located enquiries in the last 60 days yet. Pins appear here
              as people get in touch.
            </p>
          </Card>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-suth-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/lead-map?lat=${MAP.lat}&lon=${MAP.lon}&z=${MAP.zoom}&w=${MAP.w}&h=${MAP.h}&marker=0`}
              alt="Map of the UK showing where recent enquiries came from"
              width={MAP.w}
              height={MAP.h}
              className="block h-auto w-full"
            />
            {placedPins.map((p) => (
              <Link
                key={p.id}
                href={`/l/${p.id}`}
                title={`${p.name}${p.place ? ` · ${p.place}` : ""}`}
                className="absolute block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0A0A0A] bg-suth-accent transition-transform hover:scale-150"
                style={{
                  left: `${p.pos!.leftPct}%`,
                  top: `${p.pos!.topPct}%`,
                }}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-suth-text-tertiary">
          Each dot is an enquiry from the last 60 days; tap one to open it.
          Locations come from IP addresses, so read them as areas.
        </p>
      </section>

      {/* ── Top pages and countries ───────────────────────────────── */}
      {stats && (stats.topPages.length > 0 || stats.topCountries.length > 0) ? (
        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Busiest pages · 7 days
            </h2>
            <Table
              headers={["Page", "Visits"]}
              empty="Nothing yet this week."
              rows={stats.topPages.map((p) => [
                <span key="p" className="font-mono text-xs">{p.path}</span>,
                String(p.count),
              ])}
            />
          </div>
          <div>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Countries · 7 days
            </h2>
            <Table
              headers={["Country", "Visits"]}
              empty="Nothing yet this week."
              rows={stats.topCountries.map((c) => [
                c.country,
                String(c.count),
              ])}
            />
          </div>
        </section>
      ) : null}

      <p className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
        <Badge tone="accent">LIVE</Badge>
        Sessions older than 60s drop off automatically
      </p>
    </>
  );
}
