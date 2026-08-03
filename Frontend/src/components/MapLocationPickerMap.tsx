"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Brand-blue pin marker (avoids broken default Leaflet icon paths under Next). */
const mapPinIcon = L.divIcon({
  className: "buylands-map-pin",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#1c5fa8" stroke="#0e305d" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#fff" stroke="#0e305d"/></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

export type MapLocationPickerMapProps = {
  /** Map viewport center (not a selected pin). */
  center: [number, number];
  zoom: number;
  /** Selected pin — null until the user taps the map or uses current location. */
  markerPosition: [number, number] | null;
  onPick: (latitude: number, longitude: number) => void;
  /** Bumps recenter when user presses “use my location”. */
  recenterKey?: number;
};

/**
 * Imperative Leaflet map — avoids react-leaflet MapContainer’s
 * “Map container is already initialized” under React Strict Mode remounts.
 */
export function MapLocationPickerMap({
  center,
  zoom,
  markerPosition,
  onPick,
  recenterKey = 0,
}: MapLocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let map: L.Map | null = null;
    let ro: ResizeObserver | null = null;
    const timers: number[] = [];

    const clearStaleLeaflet = () => {
      const leafletEl = el as HTMLDivElement & { _leaflet_id?: number };
      if (leafletEl._leaflet_id != null) {
        delete leafletEl._leaflet_id;
        el.replaceChildren();
      }
    };

    const refreshSize = () => {
      map?.invalidateSize({ animate: false });
    };

    const init = () => {
      if (cancelled || mapRef.current) return;
      if (el.clientWidth < 32 || el.clientHeight < 32) {
        timers.push(window.setTimeout(init, 50));
        return;
      }

      clearStaleLeaflet();

      map = L.map(el, {
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: false,
      }).setView(initialCenterRef.current, initialZoomRef.current);

      L.tileLayer(OSM_TILE_URL, {
        attribution: "",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;

      for (const ms of [50, 150, 300, 500]) {
        timers.push(window.setTimeout(refreshSize, ms));
      }

      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => refreshSize());
        ro.observe(el);
      }
    };

    timers.push(
      window.setTimeout(() => {
        requestAnimationFrame(init);
      }, 0),
    );

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
      ro?.disconnect();
      if (map) {
        map.off();
        map.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!markerPosition) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const marker = L.marker(markerPosition, {
        draggable: true,
        icon: mapPinIcon,
      }).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onPickRef.current(lat, lng);
      });
      markerRef.current = marker;
      return;
    }

    const current = markerRef.current.getLatLng();
    if (
      Math.abs(current.lat - markerPosition[0]) > 1e-9 ||
      Math.abs(current.lng - markerPosition[1]) > 1e-9
    ) {
      markerRef.current.setLatLng(markerPosition);
    }
  }, [markerPosition?.[0], markerPosition?.[1], markerPosition == null]);

  useEffect(() => {
    if (recenterKey <= 0) return;
    const map = mapRef.current;
    if (!map) return;
    map.setView(center, zoom, { animate: true });
    if (markerPosition) {
      if (!markerRef.current) {
        const marker = L.marker(markerPosition, {
          draggable: true,
          icon: mapPinIcon,
        }).addTo(map);
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onPickRef.current(lat, lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(center);
      }
    }
    window.setTimeout(() => map.invalidateSize({ animate: false }), 50);
  }, [recenterKey, center[0], center[1], zoom, markerPosition?.[0], markerPosition?.[1]]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="buylands-leaflet-map rounded-xl" />
    </div>
  );
}
