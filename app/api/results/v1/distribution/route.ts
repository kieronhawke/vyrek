/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getServingSource, servingDegradation } from "@/lib/results/engine";
import { apiError, apiNotFound, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

import type { StationId } from "@/lib/results/model";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const station = params.get("station") as StationId | null;
  const division = params.get("division");
  if (!station || !division) return apiNotFound("Distribution");

  try {
    const distribution = await getServingSource().getStationDistribution(station, division);
    return apiResponse(distribution, { cache: "static", tier: servingDegradation().tier });
  } catch (error) {
    return apiError(error);
  }
}
