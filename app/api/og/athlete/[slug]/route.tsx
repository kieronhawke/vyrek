import { ImageResponse } from "next/og";
import { getResultsSource } from "@/lib/results";
import { formatTime, nationCode } from "@/lib/results/format";

/**
 * Share card for an athlete — brief §6.3.
 *
 * The card an athlete would actually post is not "here is my profile", it is
 * "here is my personal best and here is the line going down". So the PB is the
 * hero and the progression is a sparkline of every race, in order, with the
 * fastest marked. A profile with one race still works: the sparkline degrades
 * to a single dot rather than an empty box.
 */

export const runtime = "nodejs";

const BG = "#0A0A0A";
const ACCENT = "#A3E635";
const TEXT = "#F5F5F3";
const DIM = "#8A8A88";
const LINE = "#2A2A28";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const athlete = await getResultsSource().getAthlete(slug);

  if (!athlete) {
    return new ImageResponse(
      (
        <div style={{ ...frame, alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: DIM, fontSize: 34 }}>HYROX Results</div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Oldest first, so the line reads left to right like a season.
  const races = [...athlete.races].reverse().filter((r) => r.finishSeconds > 0);
  const times = races.map((r) => r.finishSeconds);
  const fastest = times.length ? Math.min(...times) : 0;
  const slowest = times.length ? Math.max(...times) : 0;
  const span = Math.max(1, slowest - fastest);

  const CHART_W = 1000;
  const CHART_H = 150;
  const points = races.map((race, i) => ({
    x: races.length === 1 ? CHART_W / 2 : (i / (races.length - 1)) * CHART_W,
    // Faster is higher: the y axis is inverted on purpose, because a chart of
    // improvement that slopes downwards reads as decline at a glance.
    y: CHART_H - ((slowest - race.finishSeconds) / span) * CHART_H,
    isPb: race.finishSeconds === fastest,
  }));

  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: ACCENT, fontSize: 20, letterSpacing: 4, textTransform: "uppercase" }}>
              HYROX Results
            </div>
            <div style={{ color: TEXT, fontSize: 64, marginTop: 14, lineHeight: 1.05, maxWidth: 820 }}>
              {athlete.name}
            </div>
            <div style={{ color: DIM, fontSize: 26, marginTop: 12 }}>
              {nationCode(athlete.countryIso)} · {athlete.races.length} race
              {athlete.races.length === 1 ? "" : "s"} · {athlete.seasonsActive.join(", ")}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ color: DIM, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>
              Personal best
            </div>
            <div style={{ color: ACCENT, fontSize: 92, fontFamily: "monospace", lineHeight: 1.05 }}>
              {athlete.pbSeconds ? formatTime(athlete.pbSeconds) : "—"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
          <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            {points.length > 1 && (
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={LINE}
                strokeWidth={3}
              />
            )}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.isPb ? 9 : 6}
                fill={p.isPb ? ACCENT : DIM}
              />
            ))}
          </svg>
          <div style={{ color: DIM, fontSize: 18, marginTop: 10 }}>
            {races.length > 1 ? "Every race, oldest first. Chartreuse is the PB." : "First race."}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: DIM, fontSize: 20 }}>
          <div>suthperformance.com</div>
          <div>Timing: mika:Timing</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between" as const,
  background: BG,
  padding: 64,
};
