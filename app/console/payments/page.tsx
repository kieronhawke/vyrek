import { redirect } from "next/navigation";
// The coaching console folded into one centralised Mission Control.
// Redirects keep any old link or bookmark working.
export default function ConsoleRedirect() {
  redirect("/admin/payments");
}
