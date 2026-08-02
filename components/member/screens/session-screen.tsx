import Link from "next/link";
import { DEMO_TODAY } from "@/lib/member/demo";
import type { DatedDay } from "@/lib/member/week";
import { SessionFeedback } from "@/components/member/session-feedback";
import {
  Card,
  Chip,
  ChipRow,
  Eyebrow,
  PhotoHeader,
  Prescription,
  PrimaryAction,
  RestBand,
} from "@/components/member/ui";
import { HEROES, photoForStation, pickPhoto, type StationSlug } from "@/lib/photo-library";

/**
 * ONE SESSION.
 *
 * The plan listed seven days and only expanded today, so an athlete could not
 * look at Thursday on Tuesday — which is when people actually plan their week
 * around work, childcare and the gym being busy. Every day is now a page.
 *
 * Rest days get a screen too, with the reason on it. A blank rest day reads as
 * an app that has forgotten about you; MarchOn writes a line of coach copy on
 * theirs and it is the difference between "nothing" and "deliberately nothing".
 */

/** Stations mentioned in a session, so the guide photo can be shown. */
const STATION_WORDS: [RegExp, StationSlug, string][] = [
  [/ski ?erg/i, "ski-erg", "SkiErg"],
  [/sled push/i, "sled-push", "Sled push"],
  [/sled pull/i, "sled-pull", "Sled pull"],
  [/burpee/i, "burpee-broad-jump", "Burpee broad jump"],
  [/\brow(ing)?\b/i, "row", "Row"],
  [/farmer/i, "farmers-carry", "Farmers carry"],
  [/sandbag|lunge/i, "sandbag-lunge", "Sandbag lunge"],
  [/wall ?ball/i, "wall-balls", "Wall balls"],
];

export function SessionScreen({
  day,
  base = "/app",
}: {
  day: DatedDay;
  base?: string;
}) {
  const rest = day.type === "rest";
  const hero = pickPhoto(HEROES, day.slug);

  // Today's session is the only one the fixtures describe block by block.
  const blocks = day.isToday ? DEMO_TODAY.blocks : [];

  const stations = rest
    ? []
    : STATION_WORDS.filter(([re]) => re.test(day.title)).map(([, slug, label]) => ({
        slug,
        label,
        photo: photoForStation(slug),
      }));

  return (
    <>
      <PhotoHeader
        photo={hero}
        eyebrow={`${day.day} ${day.date}${day.isToday ? " · Today" : ""}`}
        title={day.title}
        height={220}
      >
        <ChipRow>
          <Chip>{day.type}</Chip>
          {day.durationMin ? <Chip>{day.durationMin} min</Chip> : null}
          {day.done ? <Chip>Completed</Chip> : null}
        </ChipRow>
      </PhotoHeader>

      <p style={{ marginBottom: "var(--space-3)" }}>
        <Link
          href={`${base}/plan`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
          }}
        >
          ← Back to your plan
        </Link>
      </p>

      {rest ? (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Card>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>
              Why this is a rest day
            </p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
              Recovery is where the adaptation happens, not a gap in the plan.
              Walk, sleep, eat properly. If you feel like you have to do
              something, make it mobility rather than a session — training on
              top of a rest day is how a good week turns into a bad fortnight.
            </p>
          </Card>
        </section>
      ) : null}

      {blocks.length > 0 ? (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Eyebrow right={`${day.durationMin ?? 0} min`}>The session</Eyebrow>
          <Card padded={false}>
            {blocks.map((block, i) => (
              <div
                key={block.label}
                style={{
                  padding: "var(--space-2)",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <ChipRow>
                  <Chip tone={i === 0 ? "neutral" : "accent"}>
                    {i === 0 ? "W" : String.fromCharCode(64 + i)}
                  </Chip>
                  {block.duration ? <Chip>{block.duration}</Chip> : null}
                </ChipRow>
                <Prescription
                  quantity={block.duration ?? ""}
                  movement={block.label}
                  detail={block.detail}
                />
                {i < blocks.length - 1 ? (
                  <RestBand>Rest as needed before the next block</RestBand>
                ) : null}
              </div>
            ))}
          </Card>
        </section>
      ) : !rest ? (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Card>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
              Ben writes the detail for each session the week before. This one
              is scheduled but not yet written out block by block.
            </p>
          </Card>
        </section>
      ) : null}

      {stations.length > 0 ? (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Eyebrow right="Technique">Stations in this session</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "var(--space-1)",
            }}
          >
            {stations.map((s) => (
              <Link
                key={s.slug}
                href={`${base}/plan/stations`}
                style={{
                  display: "block",
                  borderRadius: "var(--radius-card)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--surface)",
                }}
              >
                {s.photo ? (
                  <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#14100f" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.photo.wide ?? s.photo.src}
                      alt=""
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "grayscale(1)",
                      }}
                    />
                  </div>
                ) : null}
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 44,
                    padding: "0 var(--space-2)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 650,
                  }}
                >
                  {s.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!rest && day.isToday ? (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <PrimaryAction href="/train">Start session</PrimaryAction>
        </div>
      ) : null}

      {!rest ? (
        <section>
          <Eyebrow>Feedback</Eyebrow>
          <SessionFeedback sessionTitle={day.title} />
        </section>
      ) : null}
    </>
  );
}
