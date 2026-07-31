import { CoachStub } from "@/components/control/coach-stub";

export default function CoachPlansPage() {
  return (
    <CoachStub
      title="Plans"
      phase="Phase D"
      willDo={[
        "Next block already drafted from their last one, ready to adjust",
        "Your saved blocks, in your own language",
        "Race conflicts flagged before you send, with the trade-offs spelled out",
        "Your note, dictated or typed, in your words",
      ]}
    />
  );
}
