/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getServingSource, servingDegradation } from "@/lib/results/engine";
import { apiError, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return apiResponse(await getServingSource().getRecords(), { cache: "static", tier: servingDegradation().tier });
  } catch (error) {
    return apiError(error);
  }
}
