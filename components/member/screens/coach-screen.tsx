import { CoachThread } from "@/components/member/coach-thread";
import { Card, Chip, ChipRow, Eyebrow } from "@/components/member/ui";
import { BEN_PHOTOS, pickPhoto } from "@/lib/photo-library";
import { BEN } from "@/lib/ben";

/**
 * ASK BEN.
 *
 * The athlete could answer back to a session but could not ask a question,
 * which is the thing people actually pay a coach for. One thread, his face on
 * it, and his credentials at the top so it is clear who is answering.
 */
export function CoachScreen() {
  const portrait = pickPhoto(BEN_PHOTOS, "coach-thread");

  return (
    <>
      <p className="eyebrow">Your coach</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Ask Ben
      </h1>

      <Card style={{ marginBottom: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
          {BEN.beginnerPromise}
        </p>
        <div style={{ marginTop: "var(--space-1)" }}>
          <ChipRow>
            {BEN.racing.slice(0, 2).map((r) => (
              <Chip key={r} tone="accent">
                {r}
              </Chip>
            ))}
          </ChipRow>
        </div>
      </Card>

      <Eyebrow right="One thread">Messages</Eyebrow>
      <CoachThread coachPhoto={portrait} />
    </>
  );
}
