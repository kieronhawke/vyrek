/**
 * ROUGHLY WHERE A LEAD IS, FROM THE REQUEST ITSELF.
 *
 * Vercel resolves the client IP at the edge and hands the result over in
 * headers, so this needs no API key, no third-party call, and no lookup
 * table shipped in the bundle. Off Vercel the headers are simply absent and
 * everything below returns null, which the email is written to handle.
 *
 * WHAT THIS IS AND IS NOT. It is city-level, derived from the IP, and it is
 * frequently wrong — mobile networks route through a handful of gateways,
 * so a lead in Leeds on a phone can resolve to Manchester or London. It is
 * useful to Ben for one thing only: knowing roughly which end of the
 * country somebody is in before he rings them, so he does not offer an
 * in-person session to somebody four hours away. It is not a location, and
 * the email says so rather than presenting a pin as fact.
 *
 * The raw IP is deliberately not carried into the email. It is personal
 * data under UK GDPR, the city is what is actually useful, and an email
 * inbox is not where identifiers should accumulate.
 */

export type RequestLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

function header(h: Headers, name: string): string | null {
  const v = h.get(name);
  if (!v) return null;
  // Vercel percent-encodes city names with non-ASCII characters.
  try {
    const decoded = decodeURIComponent(v).trim();
    return decoded || null;
  } catch {
    return v.trim() || null;
  }
}

function coordinate(h: Headers, name: string): number | null {
  const raw = header(h, name);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function requestLocation(req: Request): RequestLocation {
  const h = req.headers;
  return {
    city: header(h, "x-vercel-ip-city"),
    region: header(h, "x-vercel-ip-country-region"),
    country: header(h, "x-vercel-ip-country"),
    latitude: coordinate(h, "x-vercel-ip-latitude"),
    longitude: coordinate(h, "x-vercel-ip-longitude"),
  };
}

/** "Leeds, England, GB" — whatever parts we actually have. */
export function describeLocation(loc: RequestLocation): string | null {
  const parts = [loc.city, loc.region, loc.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function hasCoordinates(
  loc: RequestLocation,
): loc is RequestLocation & { latitude: number; longitude: number } {
  return loc.latitude !== null && loc.longitude !== null;
}

/**
 * A Google Maps link, which is what Ben taps.
 *
 * Uses the search URL with coordinates rather than a place id: it opens the
 * native app on both phones and the website on a desktop, with no key.
 */
export function googleMapsUrl(loc: RequestLocation): string | null {
  if (hasCoordinates(loc)) {
    return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
  }
  const described = describeLocation(loc);
  return described
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(described)}`
    : null;
}

/**
 * A static map image for the email.
 *
 * OpenStreetMap's renderer rather than Google's, because Google Static Maps
 * requires a key and billing account and this is worth neither. The trade
 * is reliability: it is a community service and it sometimes does not
 * answer.
 *
 * That is survivable by design — the image sits inside a link with the
 * location as its alt text, so an email client that blocks images, or a
 * render that fails, still shows "Roughly: Leeds, England" and still opens
 * Google Maps when tapped. The map is the nicety; the link is the feature.
 */
export function staticMapUrl(
  loc: RequestLocation,
  { width = 560, height = 220, zoom = 9 } = {},
): string | null {
  if (!hasCoordinates(loc)) return null;
  const { latitude: lat, longitude: lon } = loc;
  return (
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${lat},${lon}&zoom=${zoom}&size=${width}x${height}` +
    `&maptype=mapnik&markers=${lat},${lon},red-pushpin`
  );
}

/* ── Session context ───────────────────────────────────────────────────── */

export type SessionContext = {
  /** The page they arrived on, not the one they submitted from. */
  landingPath?: string;
  /** Where they were before that, if the browser told us. */
  referrer?: string;
  /** Whole seconds between first page view and submitting. */
  secondsOnSite?: number;
  /** How many pages they looked at. */
  pageViews?: number;
};

/** "18 minutes" / "45 seconds" — a duration a person reads, not 1080. */
export function describeDuration(seconds: number | undefined): string | null {
  if (!seconds || seconds < 0 || !Number.isFinite(seconds)) return null;
  if (seconds < 90) return `${Math.round(seconds)} seconds`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours} hours`;
}

/**
 * Trim what the browser sent before it goes anywhere near an email.
 *
 * A path and a referrer both arrive from the client and both end up in
 * rendered HTML, so they are length-capped and stripped of anything that
 * is not a plausible URL.
 */
export function cleanSessionContext(raw: unknown): SessionContext {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;

  const path =
    typeof r.landingPath === "string" && r.landingPath.startsWith("/")
      ? r.landingPath.slice(0, 200)
      : undefined;

  const referrer =
    typeof r.referrer === "string" && /^https?:\/\//.test(r.referrer)
      ? r.referrer.slice(0, 200)
      : undefined;

  const seconds =
    typeof r.secondsOnSite === "number" && Number.isFinite(r.secondsOnSite)
      ? Math.max(0, Math.min(86400, Math.round(r.secondsOnSite)))
      : undefined;

  const pageViews =
    typeof r.pageViews === "number" && Number.isFinite(r.pageViews)
      ? Math.max(0, Math.min(999, Math.round(r.pageViews)))
      : undefined;

  return { landingPath: path, referrer, secondsOnSite: seconds, pageViews };
}
