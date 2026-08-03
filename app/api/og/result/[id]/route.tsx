import { ImageResponse } from "next/og";
import { getResultsSource } from "@/lib/results";
import { STATION_IDS, STATION_LABEL } from "@/lib/results/model";
import { buildDistribution, percentileOf } from "@/lib/results/percentiles";
import { formatTime, formatSplit, formatOrdinal, nationCode } from "@/lib/results/format";

/**
 * Share card for a single race.
 *
 * This is a poster, not a data dump. Someone pastes this link into a group
 * chat the evening after a race — it has one job, which is to make the time
 * look like an achievement and make it obvious where it came from.
 *
 * The design decisions that matter:
 *
 * - **The time is the hero**, at a size that survives a feed thumbnail.
 * - **The race strip runs edge to edge** across the bottom. It is the thing
 *   nobody else can show, and at poster scale it reads as graphic texture even
 *   before you understand it.
 * - **Three supporting numbers only** — position, percentile, and the standout
 *   split. More would be a table, and nobody reads a table in a feed.
 * - **The brand sits bottom-right, small.** A card that shouts the brand over
 *   the athlete's result does not get shared.
 */

export const runtime = "nodejs";

const BG = "#0A0A0A";
const PANEL = "#111111";
const ACCENT = "#A3E635";
const TEXT = "#F5F5F3";
const DIM = "#8A8A88";
const FAINT = "#5C5C5A";
const RUN = "#2F3A44";
const STATION = "#3D3A2E";
const ROX = "#242424";
const LINE = "#1F1F1F";

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

  const fieldTimes = await source.getDivisionFinishTimes(result.eventSlug, result.division);
  const percentile = fieldTimes.length
    ? percentileOf(buildDistribution(fieldTimes), result.finishSeconds)
    : 0;

  // Segments in race order, for the strip.
  const segments: { seconds: number; faster: boolean; kind: "run" | "station" }[] = [];
  STATION_IDS.forEach((station, i) => {
    const run = result.runs[i] ?? 0;
    segments.push({
      seconds: run,
      faster: run > 0 && run < (result.divisionAverage.runs[i] ?? Infinity),
      kind: "run",
    });
    const seconds = result.stations[station] ?? 0;
    segments.push({
      seconds,
      faster: seconds > 0 && seconds < (result.divisionAverage.stations[station] ?? Infinity),
      kind: "station",
    });
  });
  const total = segments.reduce((sum, s) => sum + s.seconds, 0) + result.roxzoneSeconds;

  // The one split worth naming: biggest gain against the division.
  let standout: { label: string; delta: number } | null = null;
  for (const station of STATION_IDS) {
    const seconds = result.stations[station] ?? 0;
    const average = result.divisionAverage.stations[station] ?? 0;
    if (!seconds || !average) continue;
    const delta = seconds - average;
    if (!standout || delta < standout.delta) {
      // Full name, not the strip's short code: "WALL" is legible inside a
      // labelled bar chart and meaningless as a standalone figure in a feed.
      standout = { label: STATION_LABEL[station], delta };
    }
  }

  const division = result.divisionLabel.replace("HYROX ", "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          position: "relative",
        }}
      >
        {/* A single chartreuse rule at the top: enough brand to be recognisable
            in a feed without becoming the subject of the image. */}
        <div style={{ display: "flex", height: 6, background: ACCENT }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "38px 56px 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", color: DIM, fontSize: 21, letterSpacing: "0.2em" }}>
              {result.eventName.toUpperCase()}
            </div>
            <div style={{ display: "flex", color: FAINT, fontSize: 19, letterSpacing: "0.16em" }}>
              {division.toUpperCase()} · {nationCode(result.countryIso)} · {result.ageGroup}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              color: TEXT,
              fontSize: result.athleteName.length > 24 ? 52 : 64,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              marginTop: 22,
            }}
          >
            {result.athleteName}
          </div>

          {/* The time, at poster scale. */}
          <div
            style={{
              display: "flex",
              color: ACCENT,
              fontSize: 168,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 0.94,
              marginTop: 4,
            }}
          >
            {formatTime(result.finishSeconds)}
          </div>

          {/* Three supporting figures. Any more and it stops being a poster. */}
          <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
            <Stat
              label="POSITION"
              value={formatOrdinal(result.rank)}
              note={`of ${result.fieldSize.toLocaleString("en-GB")}`}
            />
            <Stat
              label="FASTER THAN"
              value={`${Math.round(percentile)}%`}
              note={`of ${division}`}
            />
            {standout ? (
              <Stat
                label="STANDOUT"
                value={standout.label}
                note={`${standout.delta <= 0 ? "−" : "+"}${formatSplit(Math.abs(standout.delta))} vs field`}
                accent={standout.delta <= 0}
              />
            ) : null}
          </div>
        </div>

        {/* The race, edge to edge. Nobody else can show this. */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
          <div style={{ display: "flex", height: 54, width: "100%" }}>
            {segments.map((segment, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: `${(segment.seconds / total) * 100}%`,
                  height: segment.kind === "run" ? 54 : 36,
                  marginTop: segment.kind === "run" ? 0 : 18,
                  background: segment.faster ? ACCENT : segment.kind === "run" ? RUN : STATION,
                  borderRight: `1px solid ${BG}`,
                }}
              />
            ))}
            <div
              style={{
                display: "flex",
                width: `${(result.roxzoneSeconds / total) * 100}%`,
                height: 54,
                background: ROX,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `1px solid ${LINE}`,
              background: PANEL,
              padding: "16px 56px",
            }}
          >
            <div style={{ display: "flex", color: FAINT, fontSize: 17 }}>
              Every segment against the {division} field · chartreuse beat the average
            </div>
            <div
              style={{
                display: "flex",
                color: TEXT,
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: "0.1em",
              }}
            >
              SUTHPERFORMANCE.COM
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function Stat({
  label, value, note, accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: PANEL,
        border: `1px solid ${LINE}`,
        borderRadius: 4,
        padding: "12px 20px",
        minWidth: 208,
      }}
    >
      <div style={{ display: "flex", color: FAINT, fontSize: 14, letterSpacing: "0.2em" }}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          color: accent ? ACCENT : TEXT,
          fontSize: value.length > 12 ? 27 : value.length > 8 ? 32 : 38,
          fontWeight: 800,
          marginTop: 4,
        }}
      >
        {value}
      </div>
      <div style={{ display: "flex", color: DIM, fontSize: 15, marginTop: 2 }}>{note}</div>
    </div>
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
      <div style={{ display: "flex", color: ACCENT, fontSize: 28, letterSpacing: "0.2em" }}>
        HYROX RESULTS
      </div>
      <div style={{ display: "flex", color: TEXT, fontSize: 64, fontWeight: 900, marginTop: 16 }}>
        SUTH PERFORMANCE
      </div>
    </div>
  );
}
