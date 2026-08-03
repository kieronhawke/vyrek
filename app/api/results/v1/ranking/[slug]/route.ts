/**
 * Part of our own results API (engine brief §7). Reads only from our database;
 * there is no code path from here to the source, which is why the site keeps
 * serving when the source is down.
 */
import { getResultsService } from "@/lib/results/engine";
import { apiError, apiNotFound, apiResponse } from "@/lib/results/engine/serve/http";

export const runtime = "nodejs";

import { parseRankingSlug } from "@/lib/results/slugs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = parseRankingSlug(slug);
  if (!parsed) return apiNotFound("Ranking");

  const query = new URL(request.url).searchParams;
  try {
    // Cursor-paginated by default. Never return thousands of rows in one
    // payload just because a caller forgot a limit.
    const page = await getResultsService().getRanking(parsed.eventSlug, parsed.division, {
      cursor: query.get("cursor") ?? undefined,
      ageGroup: query.get("ageGroup") ?? undefined,
      q: query.get("q") ?? undefined,
      limit: Math.min(Number(query.get("limit") ?? 100), 500),
    });
    if (!page) return apiNotFound("Ranking");
    return apiResponse(page, { cache: "live" });
  } catch (error) {
    return apiError(error);
  }
}
