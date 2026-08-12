import { redirect } from "next/navigation";

/**
 * The coach tracker was the same CLIENTS list as /clients, grouped by tier
 * and sorted by who needs a plan. Two destinations for one dataset, which is
 * why it was never obvious which to open.
 *
 * It is now a lens on the hub. This redirect keeps the nav item, the command
 * palette and any bookmark working, and lands on the view the page existed
 * to show.
 */
export default function TrackerPage() {
  redirect("/console/clients?lens=needs_plan");
}
