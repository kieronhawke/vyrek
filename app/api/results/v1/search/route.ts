/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getServingSource, servingDegradation } from "@/lib/results/engine";
import { apiError, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    // Not an error: a one-character query is a person still typing.
    return apiResponse({ athletes: [], events: [] }, { cache: "live", tier: servingDegradation().tier });
  }
  try {
    return apiResponse(await getServingSource().searchAll(q), { cache: "entity", tier: servingDegradation().tier });
  } catch (error) {
    return apiError(error);
  }
}
