import { ImageResponse } from "next/og";
import { getResultsSource } from "@/lib/results";
import { formatTime } from "@/lib/results/format";

/**
 * Share card for an automated race report — brief §5.9, §6.3.
 *
 * Carries the same label the page does: "Automated race report, generated from
 * race data". The house rule is that nothing machine-written may look like a
 * person's opinion, and a share card is the surface most likely to be seen
 * without its page — so the label travels with it.
 */

export const runtime = "nodejs";

const BG = "#0A0A0A";
const ACCENT = "#A3E635";
const TEXT = "#F5F5F3";
const DIM = "#8A8A88";

export async function GET(
  _req: Request,
  context: { params: Promise<{ event: string }> },
) {
  const { event: slug } = await context.params;
  const event = await getResultsSource().getEvent(slug);

  if (!event) {
    return new ImageResponse(
      (
        <div style={{ ...frame, alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: DIM, fontSize: 34 }}>HYROX Race Report</div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const headline = event.divisions
    .filter((d) => d.headline && d.leaderAthleteName)
    .slice(0, 2);

  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: ACCENT, fontSize: 20, letterSpacing: 4, textTransform: "uppercase" }}>
            Race report
          </div>
          <div style={{ color: TEXT, fontSize: 68, marginTop: 14, lineHeight: 1.05, maxWidth: 900 }}>
            {event.name}
          </div>
          <div style={{ color: DIM, fontSize: 26, marginTop: 12 }}>
            {event.venue ? `${event.venue} · ` : ""}
            {event.totalAthletes.toLocaleString("en-GB")} athletes
          </div>
        </div>

        <div style={{ display: "flex", gap: 56 }}>
          {headline.map((division) => (
            <div key={division.divisionCode} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: DIM, fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>
                {division.label.replace("HYROX ", "")}
              </div>
              <div style={{ color: TEXT, fontSize: 34, marginTop: 8 }}>
                {division.leaderAthleteName}
              </div>
              <div style={{ color: ACCENT, fontSize: 52, fontFamily: "monospace", marginTop: 4 }}>
                {division.leaderTimeSeconds ? formatTime(division.leaderTimeSeconds) : "—"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: DIM, fontSize: 18 }}>
            Automated race report, generated from race data
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: DIM, fontSize: 20 }}>
            <div>suthperformance.com</div>
            <div>Timing: mika:Timing</div>
          </div>
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
