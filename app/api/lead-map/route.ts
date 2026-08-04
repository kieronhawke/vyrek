import { renderMap } from "@/lib/geo/static-map";

export const runtime = "nodejs";

/**
 * The map image in Ben's lead email.
 *
 * PUBLIC AND UNAUTHENTICATED, because an email client fetches it with no
 * cookies and no session — anything gated would render as a broken image
 * in the one email that matters. It leaks nothing: the coordinates are
 * already in the URL the requester constructed, so the endpoint tells a
 * caller only what they told it.
 *
 * Cached hard, at the edge and in the client. Tiles come from OSM's free
 * servers and their usage policy asks for exactly this.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const zoom = Number(searchParams.get("z") ?? 11);

  const valid =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 85 &&
    Math.abs(lon) <= 180 &&
    Number.isFinite(zoom) &&
    zoom >= 1 &&
    zoom <= 18;

  if (!valid) {
    return new Response("Bad coordinates", { status: 400 });
  }

  const png = await renderMap({ lat, lon, zoom: Math.round(zoom) });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // A day in the browser, a week at the edge. The map for a given point
      // never changes meaningfully, and re-rendering it costs OSM tiles.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
