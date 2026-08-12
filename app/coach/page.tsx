import { redirect } from "next/navigation";

// Coach Mode is no longer a separate app. Everything lives in one
// centralised, responsive Mission Control now, so this sends Ben straight
// there. Kept as a redirect so any old bookmark or link still works.
export default function CoachRedirect() {
  redirect("/admin");
}
