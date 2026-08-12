import sharp from "sharp";

/**
 * THE MAP IN BEN'S LEAD EMAIL.
 *
 * Composed here, from OpenStreetMap tiles, and served from our own domain.
 *
 * WHY NOT A STATIC-MAP SERVICE. The obvious ones all want an API key and a
 * billing account (Google, Mapbox, MapTiler, Geoapify) for one small image
 * per lead. The keyless one everybody links to, staticmap.openstreetmap.de,
 * does not resolve at all any more — I pointed the email at it first and
 * the DNS lookup fails outright, which would have shipped a permanently
 * broken image into the one email Ben actually acts on.
 *
 * Tiles come from tile.openstreetmap.org, which is free, has no key, and
 * asks two things in its usage policy: a real User-Agent identifying the
 * application, and no bulk downloading. One map per lead, cached for a day
 * and rounded to three decimal places so repeats hit the cache, is well
 * inside that.
 *
 * IT NEVER RETURNS AN ERROR. If the tiles do not come back, the caller gets
 * a plain dark panel the same size. A missing image in an email is a broken
 * icon and a hole in the layout; a flat panel with the place name printed
 * beside it in the HTML still reads as intended.
 */

const TILE = 256;
const UA = "SuthPerformance/1.0 (+https://www.suthperformance.com; hello@suthperformance.com)";

/** Slippy-map pixel coordinates of a lat/lon at a zoom level. */
export function project(
  lat: number,
  lon: number,
  zoom: number,
): { x: number; y: number } {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const x = ((lon + 180) / 360) * n * TILE;
  const y =
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n * TILE;
  return { x, y };
}

async function fetchTile(
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  const n = 2 ** z;
  // Wrap horizontally, clamp vertically — the world repeats east-west but
  // not north-south, and a request for tile -1 is a 404 rather than a wrap.
  const tx = ((x % n) + n) % n;
  if (y < 0 || y >= n) return null;
  try {
    const res = await fetch(`https://tile.openstreetmap.org/${z}/${tx}/${y}.png`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** A flat panel, so a tile outage is a plain map rather than a broken image. */
async function fallback(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 23, g: 23, b: 23 },
    },
  })
    .png()
    .toBuffer();
}

/**
 * A PNG centred on the point, with a marker on it.
 *
 * The marker is drawn rather than fetched: an overlay that depends on a
 * second network call is a second thing that can fail.
 */
export async function renderMap({
  lat,
  lon,
  zoom = 11,
  width = 600,
  height = 240,
  marker: drawMarker = true,
}: {
  lat: number;
  lon: number;
  zoom?: number;
  width?: number;
  height?: number;
  /** False for overview maps whose pins are drawn by the caller. */
  marker?: boolean;
}): Promise<Buffer> {
  try {
    const centre = project(lat, lon, zoom);
    const left = Math.round(centre.x - width / 2);
    const top = Math.round(centre.y - height / 2);

    const firstX = Math.floor(left / TILE);
    const lastX = Math.floor((left + width - 1) / TILE);
    const firstY = Math.floor(top / TILE);
    const lastY = Math.floor((top + height - 1) / TILE);

    const wanted: { x: number; y: number }[] = [];
    for (let ty = firstY; ty <= lastY; ty++) {
      for (let tx = firstX; tx <= lastX; tx++) wanted.push({ x: tx, y: ty });
    }

    const tiles = await Promise.all(
      wanted.map(async (t) => ({ ...t, buf: await fetchTile(zoom, t.x, t.y) })),
    );
    // Every tile failing means the service is down, and a blank grid is
    // indistinguishable from the sea. Bail to the flat panel instead.
    if (tiles.every((t) => t.buf === null)) return fallback(width, height);

    /* Composited onto a canvas of WHOLE tiles, then cropped to the window.
       Sharp rejects a negative composite offset outright — and the leftmost
       tile almost always starts before the left edge of the window, because
       the point is centred rather than tile-aligned. Compositing straight
       onto a width×height canvas therefore threw for nearly every real
       coordinate, and the catch below turned that into a flat grey panel:
       an image that looked deliberate and was in fact a total failure. */
    const canvasW = (lastX - firstX + 1) * TILE;
    const canvasH = (lastY - firstY + 1) * TILE;

    const composites: sharp.OverlayOptions[] = tiles
      .filter((t): t is typeof t & { buf: Buffer } => t.buf !== null)
      .map((t) => ({
        input: t.buf,
        left: (t.x - firstX) * TILE,
        top: (t.y - firstY) * TILE,
      }));

    const stitched = await sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 3,
        background: { r: 23, g: 23, b: 23 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    const cropped = await sharp(stitched)
      .extract({
        left: left - firstX * TILE,
        top: top - firstY * TILE,
        width,
        height,
      })
      .png()
      .toBuffer();

    // A pin at the exact centre, plus a soft ring for the accuracy this
    // genuinely has. See the caption in the email: it is a region.
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    const marker = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
         <circle cx="${cx}" cy="${cy}" r="46" fill="#A3E635" fill-opacity="0.16"
                 stroke="#A3E635" stroke-opacity="0.5" stroke-width="1.5"/>
         <circle cx="${cx}" cy="${cy}" r="8" fill="#A3E635"
                 stroke="#0A0A0A" stroke-width="2.5"/>
       </svg>`,
    );

    if (!drawMarker) {
      return await sharp(cropped).png({ compressionLevel: 9 }).toBuffer();
    }
    return await sharp(cropped)
      .composite([{ input: marker, left: 0, top: 0 }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return fallback(width, height);
  }
}

/** Rounded so two leads in the same place share a cache entry. */
export function mapImagePath(
  lat: number,
  lon: number,
  zoom = 11,
): string {
  return `/api/lead-map?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&z=${zoom}`;
}
