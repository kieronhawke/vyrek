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
    const starters = await getServingSource().getStarters(slug);
    return starters ? apiResponse(starters, { cache: "entity", tier: servingDegradation().tier }) : apiNotFound("Start list");
  } catch (error) {
    return apiError(error);
  }
}
