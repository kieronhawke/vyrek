import { CoachStub } from "@/components/control/coach-stub";

export default function CoachClientsPage() {
  return (
    <CoachStub
      title="My clients"
      phase="Phase B"
      willDo={[
        "Photo, name, next race and last contact for everyone you coach",
        "One tap to message",
        "Filter by who has gone quiet",
      ]}
    />
  );
}
