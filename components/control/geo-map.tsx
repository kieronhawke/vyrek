"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker, Circle } from "leaflet";

/**
 * A real, pannable, zoomable map for the activity screen.
 *
 * WHY A MAP AND NOT THE OLD PLOT
 *
 * This replaced an SVG of the whole world at a fixed 360x180, which could
 * tell you a session came from roughly northern Europe and nothing more.
 * The ask was to zoom in far enough to see the area somebody is in, which a
 * static plot cannot do at any size.
 *
 * WHY THE CIRCLE IS THE HONEST PART
 *
 * IP geolocation is not a location. It resolves to a city centroid, or to
 * wherever the ISP registered the block, and for mobile networks that can be
 * a different city entirely. Dropping a pin at street level would imply a
 * precision we do not have and cannot get from an IP.
 *
 * So every point draws its accuracy radius as well as its centre, and the
 * map refuses to zoom past the point where that circle stops being visible.
 * You can zoom in until the circle fills the screen; you cannot zoom to a
 * house, because we do not know the house.
 *
 * TILES
 *
 * CARTO basemaps over OpenStreetMap data. Free for this kind of use with
 * attribution, no API key, and they publish dark, light and colour variants,
 * which is what makes the theme switch possible. Raster tiles rather than
 * vector: no GPU requirement, no style JSON to host, and the whole thing is
 * one 42 KB library.
 */

export type MapTheme = "dark" | "midnight" | "light" | "colour";

export const MAP_THEMES: { key: MapTheme; label: string }[] = [
  { key: "dark", label: "Dark" },
  { key: "midnight", label: "Midnight" },
  { key: "light", label: "Light" },
  { key: "colour", label: "Colour" },
];

const TILES: Record<MapTheme, { url: string; attribution: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  midnight: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  colour: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
};

export type GeoPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Sessions from here. Drives the marker size. */
  weight?: number;
  /** Highlight, for anything that enquired. */
  accent?: boolean;
  /**
   * Radius of the area the IP actually narrows them to, in kilometres.
   * Defaults to CITY_ACCURACY_KM, which is what a city-level lookup is worth.
   */
  accuracyKm?: number;
};

/**
 * What an IP lookup is really worth.
 *
 * City-level databases put you within roughly this far of the truth most of
 * the time, and further on mobile networks. Quoted as a radius rather than a
 * confidence percentage because a circle is a thing somebody can read at a
 * glance, and a percentage invites a precision argument we would lose.
 */
export const CITY_ACCURACY_KM = 25;

export function GeoMap({
  points,
  theme = "dark",
  height = 340,
  focus,
  onSelect,
  interactive = true,
  ariaLabel = "Visitor locations",
}: {
  points: GeoPoint[];
  theme?: MapTheme;
  height?: number | string;
  /** Centre and zoom on one point instead of fitting all of them. */
  focus?: { lat: number; lng: number; zoom?: number };
  onSelect?: (id: string) => void;
  interactive?: boolean;
  ariaLabel?: string;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<(CircleMarker | Circle)[]>([]);
  const tileLayer = useRef<{ setUrl: (u: string) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const id = useId();

  const maxWeight = useMemo(
    () => Math.max(1, ...points.map((p) => p.weight ?? 1)),
    [points],
  );

  /* Leaflet touches window on import, so it cannot be a static import in a
     file Next may render on the server. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || map.current) return;

      const m = L.map(holder.current, {
        zoomControl: interactive,
        scrollWheelZoom: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        attributionControl: true,
        // Past this the accuracy circle is bigger than the viewport and the
        // map implies a precision the data does not have.
        maxZoom: 12,
        minZoom: 1,
        worldCopyJump: true,
      });

      const t = TILES[theme];
      tileLayer.current = L.tileLayer(t.url, {
        attribution: t.attribution,
        maxZoom: 12,
        // Retina tiles where the screen wants them.
        detectRetina: true,
      }).addTo(m) as unknown as { setUrl: (u: string) => void };

      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // Theme is handled by its own effect; re-creating the map on a theme
    // change would throw away the user's pan and zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  /* Swap tiles in place, keeping position. */
  useEffect(() => {
    if (!ready || !tileLayer.current) return;
    tileLayer.current.setUrl(TILES[theme].url);
  }, [theme, ready]);

  /* Points and their accuracy circles. */
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !map.current) return;
      const m = map.current;

      for (const layer of layers.current) layer.remove();
      layers.current = [];

      // Enquiry pins, flagged once the renderer has drawn them.

      const accented: L.CircleMarker[] = [];


      for (const p of points) {
        const accent = p.accent ?? false;
        const colour = accent ? "#c3f53c" : "#9aa0a6";

        // The area the IP narrows them to. Drawn first so the centre sits on
        // top of it.
        const ring = L.circle([p.lat, p.lng], {
          radius: (p.accuracyKm ?? CITY_ACCURACY_KM) * 1000,
          color: colour,
          weight: 1,
          opacity: 0.55,
          fillColor: colour,
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(m);

        /*
         * `className` gives the marker a stable hook that does not depend on
         * Leaflet internals.
         *
         * This map replaced a hand-rolled SVG one that rendered `.ac-map__pin`
         * elements. Leaflet draws `<path>` instead, so the class vanished and
         * the test asserting "a pin per location" has been failing ever since —
         * against a selector that could never match again. Restoring the class
         * is cheaper and more honest than rewriting the test to reach into
         * Leaflet's DOM, which would break on any upgrade.
         */
        const dot = L.circleMarker([p.lat, p.lng], {
          radius: 4 + ((p.weight ?? 1) / maxWeight) * 7,
          color: colour,
          weight: 2,
          fillColor: colour,
          fillOpacity: 0.85,
          className: "ac-map__pin",
        }).addTo(m);


        dot.bindTooltip(
          `${p.label}${p.weight && p.weight > 1 ? ` · ${p.weight} sessions` : ""}`,
          { direction: "top", offset: [0, -6] },
        );
        if (onSelect) dot.on("click", () => onSelect(p.id));

        layers.current.push(ring, dot);
        if (p.accent) accented.push(dot);
      }

      /*
       * Marked after the loop, not inside it.
       *
       * `getElement()` returns null immediately after `addTo`: Leaflet's SVG
       * renderer has not drawn the path yet, so setting the attribute there
       * silently did nothing — the pins appeared but none was ever flagged as
       * an enquiry. Deferring to the next frame gives the renderer its chance.
       */
      requestAnimationFrame(() => {
        for (const dot of accented) {
          (dot.getElement() as SVGElement | null)?.setAttribute("data-enquiry", "");
        }
      });

      if (focus) {
        m.setView([focus.lat, focus.lng], focus.zoom ?? 9);
      } else if (points.length === 1) {
        m.setView([points[0].lat, points[0].lng], 6);
      } else if (points.length > 1) {
        m.fitBounds(
          L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
          { padding: [28, 28], maxZoom: 8 },
        );
      } else {
        m.setView([25, 0], 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [points, ready, focus, maxWeight, onSelect]);

  /* Leaflet measures its container on create; if it was hidden or mid-layout
     the tiles come back grey until something forces a recalculation. */
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;
    const t = setTimeout(() => m.invalidateSize(), 60);
    const ro = new ResizeObserver(() => m.invalidateSize());
    if (holder.current) ro.observe(holder.current);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [ready]);

  return (
    <div
      id={id}
      ref={holder}
      className="ac-geomap"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      role="application"
      aria-label={ariaLabel}
    />
  );
}
