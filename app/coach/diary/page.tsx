import { CoachStub } from "@/components/control/coach-stub";

export default function CoachDiaryPage() {
  return (
    <CoachStub
      title="Diary"
      phase="Phase F"
      willDo={[
        "Today and this week, from your own calendar",
        "Tap to confirm or move a session",
        "A warning when a session lands in a race or travel block",
      ]}
    />
  );
}
