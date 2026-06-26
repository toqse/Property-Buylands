"use client";

import { useEffect, useState } from "react";

import { display_console_logs } from "@/lib/config";

export const OPENSTREETMAP_ATTRIBUTION_BODY =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export type OsmPlace = {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
};

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  county?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
};

function extractCityName(result: NominatimResult): string {
  const addr = result.address;
  return (
    addr?.city ||
    addr?.town ||
    addr?.village ||
    addr?.suburb ||
    addr?.county ||
    result.name ||
    result.display_name.split(",")[0]?.trim() ||
    ""
  );
}

function nominatimToPlace(result: NominatimResult): OsmPlace {
  return {
    label: result.display_name,
    city: extractCityName(result),
    latitude: Number.parseFloat(result.lat),
    longitude: Number.parseFloat(result.lon),
  };
}

function logOsmRequest(
  label: string,
  url: string,
  extra?: Record<string, unknown>,
): void {
  if (!display_console_logs) return;
  console.group(`[OpenStreetMap] ${label}`);
  console.log("Attribution:", OPENSTREETMAP_ATTRIBUTION_BODY);
  console.log("URL:", url);
  if (extra) console.log("Context:", extra);
}

function logOsmResponse(status: number, data: unknown): void {
  if (!display_console_logs) return;
  console.log("Status:", status);
  console.log("Response:", data);
  console.groupEnd();
}

function logOsmError(message: string, err?: unknown): void {
  if (!display_console_logs) return;
  console.log(message, err ?? "");
  console.groupEnd();
}

/**
 * Search OpenStreetMap Nominatim for places within India.
 */
export async function searchOsmPlaces(
  query: string,
  signal?: AbortSignal,
  options?: { districtName?: string; stateName?: string },
): Promise<OsmPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const parts = [trimmed];
  if (options?.districtName?.trim()) parts.push(options.districtName.trim());
  if (options?.stateName?.trim()) parts.push(options.stateName.trim());
  parts.push("India");

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "in",
    limit: "8",
    q: parts.filter(Boolean).join(", "),
  });
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  logOsmRequest("Nominatim search", url, {
    query: trimmed,
    districtName: options?.districtName,
    stateName: options?.stateName,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (display_console_logs) console.groupEnd();
      throw err;
    }
    logOsmError("Network error:", err);
    throw err;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    logOsmError("Parse error:", err);
    return [];
  }

  logOsmResponse(res.status, data);

  if (!res.ok) return [];

  if (!Array.isArray(data)) return [];
  return (data as NominatimResult[])
    .map(nominatimToPlace)
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

export type BrowserCoordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Format a coordinate for the property API (DecimalField: max 13 digits total, 10 decimal places).
 * Browser GPS values often exceed this when stringified verbatim.
 */
export function formatCoordinateForApi(value: number | string): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return "";

  const abs = Math.abs(n);
  const intDigits = abs < 1 ? 1 : Math.floor(Math.log10(abs)) + 1;
  const decimalPlaces = Math.min(10, Math.max(0, 13 - intDigits));
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round(n * factor) / factor;
  return rounded.toFixed(decimalPlaces);
}

export type GeolocationErrorCode =
  | "unsupported"
  | "denied"
  | "timeout"
  | "unavailable";

/** Read the browser's current position (reuses a recent fix when available). */
export function getBrowserCoordinates(): Promise<BrowserCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === 1) {
          reject(new Error("denied"));
        } else if (err.code === 3) {
          reject(new Error("timeout"));
        } else {
          reject(new Error("unavailable"));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 1800000 },
    );
  });
}

/**
 * Reverse-geocode GPS coordinates via OpenStreetMap Nominatim.
 * Returns null on network/parse failure.
 */
export async function reverseGeocodeOsm(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<OsmPlace | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: String(latitude),
    lon: String(longitude),
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params}`;
  logOsmRequest("Nominatim reverse", url, { latitude, longitude });

  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch (err) {
      logOsmError("Parse error:", err);
      return null;
    }

    logOsmResponse(res.status, data);

    if (!res.ok) return null;

    const result = data as NominatimResult;
    if (!result?.lat || !result?.lon) return null;

    const place = nominatimToPlace(result);
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      return null;
    }
    return place;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (display_console_logs) console.groupEnd();
      throw err;
    }
    logOsmError("Network error:", err);
    return null;
  }
}

const OSM_DEBOUNCE_MS = 450;

/** Debounced Nominatim search for typeahead pickers. */
export function useOsmPlaceSearch(
  query: string,
  options?: { districtName?: string; stateName?: string; enabled?: boolean },
) {
  const [results, setResults] = useState<OsmPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const enabled = options?.enabled !== false;
  const trimmed = query.trim();

  useEffect(() => {
    if (!enabled || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = window.setTimeout(() => {
      searchOsmPlaces(trimmed, controller.signal, {
        districtName: options?.districtName,
        stateName: options?.stateName,
      })
        .then((places) => {
          setResults(places);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
          setLoading(false);
        });
    }, OSM_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, enabled, options?.districtName, options?.stateName]);

  return { results, loading };
}
