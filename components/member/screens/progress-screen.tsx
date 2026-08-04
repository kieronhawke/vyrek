import { DEMO_TODAY, DEMO_VOLUME, DEMO_RECENT_SESSIONS } from "@/lib/member/demo";
import { BENCHMARKS, PREDICTED } from "@/lib/client-app/member-fixtures";
import { VolumeChart } from "@/components/member/volume-chart";
import { RecentSessionList } from "@/components/member/recent-session-list";
import {
  Card,
  Chip,
  ChipRow,
  Eyebrow,
  PhotoHeader,
  StatTile,
  StatTiles,
} from "@/components/member/ui";
import Image from "next/image";
import { photoForStation, pickPhoto, HEROES, type StationSlug } from "@/lib/photo-library";

/**
 * PROGRESS — spec/11 §4 and §7.
 *
 * Station splits against the athlete's own history, and against the field.
 * spec/13 §4 calls the percentile "the thing no app has", and it is the reason
 * this screen is worth opening: a time means nothing until you know whether it
 * is the thing costing you the race.
 *
 * The old version rendered eight identical rows. Every station now carries the
 * photograph of Ben doing it, because a name and a number does not tell a
 * first-timer what a sled pull is.
 */

/** 1st, 2nd, 3rd, 4th... 31st, not "31th". */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Seconds saved reads as an improvement, so negative deltas are good. */
function delta(trend: number) {
  if (trend === 0) return { text: "no change", tone: "var(--text-muted)" };
  if (trend < 0) return { text: `${Math.abs(trend)}s faster`, tone: "var(--ok)" };
  return { text: `${trend}s slower`, tone: "var(--warn)" };
}

/** BENCHMARKS uses display names; the photo library keys on station slugs. */
const STATION_SLUG: Record<string, StationSlug> = {
  SkiErg: "ski-erg",
  "Sled push": "sled-push",
  "Sled pull": "sled-pull",
  "Burpee broad jump": "burpee-broad-jump",
  Row: "row",
  "Farmers carry": "farmers-carry",
  "Sandbag lunges": "sandbag-lunge",
  "Wall balls": "wall-balls",
};

export function ProgressScreen() {
  const hero = pickPhoto(HEROES, "progress");
  const improving = BENCHMARKS.filter((b) => b.trend < 0).length;
  const strongest = [...BENCHMARKS].sort((a, b) => b.percentile - a.percentile)[0];
  const weakest = [...BENCHMARKS].sort((a, b) => a.percentile - b.percentile)[0];

  return (
    <div className="progress-grid">
      <PhotoHeader
        photo={hero}
        eyebrow="Progress"
        title="Where the race is won."
      >
        <ChipRow>
          <Chip>Week {DEMO_TODAY.weekNumber} of 12</Chip>
          <Chip>{BENCHMARKS.length} stations tracked</Chip>
        </ChipRow>
      </PhotoHeader>

      {/* ── Predicted finish ─────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right="Based on your splits">Predicted finish</Eyebrow>
        <StatTiles>
          <StatTile label="Now" value={PREDICTED.current} sub="current form" />
          <StatTile label="Target" value={PREDICTED.target} sub="race goal" />
          <StatTile
            label="Block start"
            value={PREDICTED.startOfBlock}
            sub="12 weeks ago"
          />
        </StatTiles>
        <p
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          A projection from your station splits and run pace, not a promise.
          It moves every time you log a session.
        </p>
      </section>

      {/* ── The headline read ────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Card>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            <strong>{improving} of {BENCHMARKS.length} stations are faster</strong>{" "}
            than they were at the start of this block. Your strongest is{" "}
            <strong>{strongest.station}</strong> ({ordinal(strongest.percentile)}{" "}
            percentile), and the one costing you most time is{" "}
            <strong>{weakest.station}</strong> ({ordinal(weakest.percentile)}).
          </p>
        </Card>
      </section>

      {/* ── Station by station ───────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right="vs the field">Stations</Eyebrow>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--space-1)",
          }}
        >
          {BENCHMARKS.map((b) => {
            const d = delta(b.trend);
            const slug = STATION_SLUG[b.station];
            const photo = slug ? photoForStation(slug) : undefined;
            return (
              <Card key={b.station} padded={false} style={{ overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-2)",
                    padding: "var(--space-2)",
                    alignItems: "center",
                  }}
                >
                  {photo ? (
                    <div
                      style={{
                        position: "relative",
                        flex: "0 0 auto",
                        width: "var(--station-thumb, 52px)",
                        height: "var(--station-thumb, 52px)",
                        borderRadius: "var(--radius-card)",
                        overflow: "hidden",
                        background: "var(--bg)",
                      }}
                    >
                      {/*
                        52px thumbnails. As raw <img> these bypassed the
                        optimiser and pulled the full 1200x1800 originals —
                        about a megabyte of photography to draw eight postage
                        stamps, on a screen a member opens on mobile data.

                        `fill` rather than width/height because the parent is
                        already a fixed 52px box with `position: relative`,
                        and `sizes` tells the optimiser 52px is all it will
                        ever need to serve.

                        Not greyscaled any more either: at this size, a dark
                        photo desaturated is a black square, and eight
                        identical black squares tell the athlete nothing about
                        which station they are looking at.
                      */}
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes="72px"
                        /* Lifted a little. These are dark action frames and
                           at thumbnail size, unlifted, eight of them read as
                           eight identical black squares — which tells the
                           athlete nothing about which station a row is. */
                        style={{ objectFit: "cover", filter: "brightness(1.35) contrast(1.05)" }}
                      />
                    </div>
                  ) : null}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 650 }}>
                        {b.station}
                      </span>
                      <span
                        className="num"
                        style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}
                      >
                        {b.value}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: d.tone,
                        fontWeight: 600,
                      }}
                    >
                      {d.text}
                    </span>
                  </div>
                </div>

                {/* Percentile against the field. The bar is the point: a time
                    alone does not tell you whether it is the problem. */}
                <div
                  style={{
                    padding: "var(--space-2)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span className="eyebrow">Field percentile</span>
                    <span
                      className="num"
                      style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}
                    >
                      {b.percentile}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`${b.station}: ${b.percentile}th percentile, ${d.text}`}
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "var(--surface-raised)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${b.percentile}%`,
                        background:
                          b.percentile >= 60
                            ? "var(--ok)"
                            : b.percentile >= 40
                              ? "var(--text-muted)"
                              : "var(--warn)",
                      }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Volume ───────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }} data-wide>
        <Eyebrow right="8 weeks">Training load</Eyebrow>
        <VolumeChart data={DEMO_VOLUME} />
      </section>

      {/* ── Log ──────────────────────────────────────────────────────── */}
      <section>
        <Eyebrow right={`${DEMO_RECENT_SESSIONS.length} logged`}>
          Session log
        </Eyebrow>
        <RecentSessionList sessions={DEMO_RECENT_SESSIONS} />
      </section>
    </div>
  );
}
