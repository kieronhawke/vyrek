/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getServingSource, servingDegradation } from "@/lib/results/engine";
import { apiError, apiNotFound, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    // An anonymised athlete 404s here, not just in the UI: erasure has to hold
    // at the API or it has not happened.
    const athlete = await getServingSource().getAthlete(slug);
    return athlete ? apiResponse(athlete, { cache: "entity", tier: servingDegradation().tier }) : apiNotFound("Athlete");
  } catch (error) {
    return apiError(error);
  }
}
