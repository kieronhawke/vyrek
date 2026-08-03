/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getResultsService } from "@/lib/results/engine";
import { apiError, apiNotFound, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const event = params.get("event");
  const division = params.get("division");
  if (!event || !division) return apiNotFound("Division");

  try {
    const times = await getResultsService().getDivisionFinishTimes(event, division);
    return apiResponse(times, { cache: "static" });
  } catch (error) {
    return apiError(error);
  }
}
