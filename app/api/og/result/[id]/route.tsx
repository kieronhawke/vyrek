import { ImageResponse } from "next/og";
import { getResultsSource } from "@/lib/results";
import { STATION_IDS } from "@/lib/results/model";
import { buildDistribution, percentileOf } from "@/lib/results/percentiles";
import { formatTime, formatOrdinal, nationCode } from "@/lib/results/format";

/**
 * Share card for a single race — brief §6.3.
 *
 * The thing that makes this worth sharing rather than just correct: the race
 * strip is on the card. Every segment of the actual race, proportional, with
 * chartreuse where the athlete beat the division average. A PB post becomes a
 * picture of *how* the race went, not just a number.
 *
 * Follows the existing blog OG route's conventions (nodejs runtime, 1200×630,
 * no custom font loading).
 */

export const runtime = "nodejs";

const BG = "#0A0A0A";
const ELEVATED = "#141414";
const ACCENT = "#A3E635";
const TEXT = "#F5F5F3";
const DIM = "#8A8A88";
const RUN = "#2F3A44";
const STATION = "#3D3A2E";
const ROX = "#262626";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const source = getResultsSource();
  const result = await source.getResult(id);

  if (!result) {
    return new ImageResponse(<Fallback />, { width: 1200, height: 630 });
  }

  const ranking = await source.getRanking(result.eventSlug, result.division, {
    limit: Number.MAX_SAFE_INTEGER,
  });
  const times = (ranking?.rows ?? []).map((r) => r.finishSeconds);
  const percentile = times.length ? percentileOf(buildDistribution(times), result.finishSeconds) : 0;

  // Build the strip segments in race order.
  const segments: { seconds: number; faster: boolean; kind: "run" | "station" }[] = [];
  STATION_IDS.forEach((station, i) => {
    const run = result.runs[i] ?? 0;
    segments.push({
      seconds: run,
      faster: run > 0 && run < (result.divisionAverage.runs[i] ?? Infinity),
      kind: "run",
    });
    const s = result.stations[station] ?? 0;
    segments.push({
      seconds: s,
      faster: s > 0 && s < (result.divisionAverage.stations[station] ?? Infinity),
      kind: "station",
    });
  });
  const total = segments.reduce((sum, s) => sum + s.seconds, 0) + result.roxzoneSeconds;

  const division = result.divisionLabel.replace("HYROX ", "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: BG,
        }}
      >
        {/* Eyebrow */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: ACCENT, fontSize: 22, letterSpacing: "0.18em" }}>
            {result.eventName.toUpperCase()} · {division.toUpperCase()}
          </div>
          <div style={{ display: "flex", color: DIM, fontSize: 20, letterSpacing: "0.14em" }}>
            {nationCode(result.countryIso)} · {result.ageGroup}
          </div>
        </div>

        {/* Name and time */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: TEXT,
              fontSize: result.athleteName.length > 22 ? 60 : 76,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {result.athleteName}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                color: ACCENT,
                fontSize: 128,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {formatTime(result.finishSeconds)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 12 }}>
              <div style={{ display: "flex", color: TEXT, fontSize: 34, fontWeight: 700 }}>
                {formatOrdinal(result.rank)}
              </div>
              <div style={{ display: "flex", color: DIM, fontSize: 20 }}>
                of {result.fieldSize.toLocaleString("en-GB")}
              </div>
            </div>
          </div>
        </div>

        {/* The race strip — the reason this card is worth posting. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", height: 46, width: "100%", background: ELEVATED }}>
            {segments.map((segment, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: `${(segment.seconds / total) * 100}%`,
                  height: segment.kind === "run" ? 46 : 32,
                  marginTop: segment.kind === "run" ? 0 : 14,
                  background: segment.faster ? ACCENT : segment.kind === "run" ? RUN : STATION,
                  borderRight: "1px solid #0A0A0A",
                }}
              />
            ))}
            <div
              style={{
                display: "flex",
                width: `${(result.roxzoneSeconds / total) * 100}%`,
                height: 46,
                background: ROX,
              }}
            />
          </div>
          <div style={{ display: "flex", marginTop: 12, color: DIM, fontSize: 18 }}>
            Faster than {Math.round(percentile)}% of {division} · chartreuse beat the division average
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #1F1F1F",
            paddingTop: 22,
          }}
        >
          <div style={{ display: "flex", color: DIM, fontSize: 20 }}>
            suthperformance.com/results
          </div>
          <div
            style={{
              display: "flex",
              color: TEXT,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.06em",
            }}
          >
            SUTH PERFORMANCE
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: BG,
      }}
    >
      <div style={{ display: "flex", color: ACCENT, fontSize: 28, letterSpacing: "0.18em" }}>
        HYROX RESULTS
      </div>
      <div style={{ display: "flex", color: TEXT, fontSize: 64, fontWeight: 900, marginTop: 16 }}>
        SUTH PERFORMANCE
      </div>
    </div>
  );
}
