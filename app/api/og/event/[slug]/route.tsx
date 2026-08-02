import { ImageResponse } from "next/og";
import { getResultsSource } from "@/lib/results";
import { formatTime } from "@/lib/results/format";

/**
 * Share card for an event — the podium of the headline divisions.
 *
 * Sized and weighted so the winners are legible as a thumbnail in a feed,
 * which is the only size most people will ever see it at.
 */

export const runtime = "nodejs";

const BG = "#0A0A0A";
const ACCENT = "#A3E635";
const TEXT = "#F5F5F3";
const DIM = "#8A8A88";
const LINE = "#1F1F1F";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const event = await getResultsSource().getEvent(slug);

  const statusLabel = event?.status === "live" ? "LIVE"
    : event?.status === "upcoming" ? "UPCOMING" : "FINAL";
  const winners = (event?.divisions ?? [])
    .filter((d) => d.headline && d.leaderTimeSeconds)
    .slice(0, 4);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: ACCENT, fontSize: 22, letterSpacing: "0.18em" }}>
            {statusLabel}
          </div>
          <div style={{ display: "flex", color: DIM, fontSize: 20 }}>
            {event ? `${event.totalAthletes.toLocaleString("en-GB")} athletes` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: TEXT,
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {event ? `HYROX ${event.city} ${event.year}` : "HYROX Results"}
          </div>
          {event ? (
            <div style={{ display: "flex", color: DIM, fontSize: 24, marginTop: 8 }}>
              {event.venue}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {winners.map((division) => (
            <div
              key={division.divisionCode}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${LINE}`,
                paddingTop: 10,
              }}
            >
              <div style={{ display: "flex", color: DIM, fontSize: 22, width: 260 }}>
                {division.label.replace("HYROX ", "").toUpperCase()}
              </div>
              <div style={{ display: "flex", flex: 1, color: TEXT, fontSize: 28 }}>
                {division.leaderAthleteName ?? ""}
              </div>
              <div style={{ display: "flex", color: ACCENT, fontSize: 34, fontWeight: 700 }}>
                {formatTime(division.leaderTimeSeconds ?? 0)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${LINE}`,
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
