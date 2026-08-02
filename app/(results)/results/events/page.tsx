import { permanentRedirect } from "next/navigation";

/**
 * Sprint 1 shipped the events index at /results/events. The Results IA now
 * puts it at /events (DECISIONS.md D7). Permanent redirect so anything
 * already indexed or bookmarked lands in the right place and passes its
 * ranking signal on, rather than 404ing.
 */
export default function LegacyEventsIndex(): never {
  permanentRedirect("/events");
}
