/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getResultsService } from "@/lib/results/engine";
import { apiError, apiNotFound, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const event = await getResultsService().getEvent(slug);
    if (!event) return apiNotFound("Event");
    // Live events revalidate in seconds; finished ones are effectively static.
    return apiResponse(event, { cache: event.status === "live" ? "live" : "entity" });
  } catch (error) {
    return apiError(error);
  }
}
