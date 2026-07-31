import { CoachStub } from "@/components/control/coach-stub";

export default function CoachMessagesPage() {
  return (
    <CoachStub
      title="Messages"
      phase="Phase E"
      willDo={[
        "One inbox. Texts and emails look the same to you",
        "Replies to session comments, against the session they are about",
        "Prompts when someone hits a PB or has a race coming up",
      ]}
    />
  );
}
