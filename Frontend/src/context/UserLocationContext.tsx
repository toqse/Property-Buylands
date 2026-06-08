"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/api/useCatalog";

const STORAGE_KEY = "buylands_user_location";

export type UserCoords = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export type LocationStatus =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "loading";

type UserLocationContextValue = {
  coords: UserCoords | null;
  status: LocationStatus;
  radiusKm: number;
  requestLocation: () => void;
  clearLocation: () => void;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(
  null,
);

function readStoredCoords(): UserCoords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserCoords;
    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number" &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  // Only the admin area needs the (auth-only) site settings; the public site
  // falls back to the default radius without hitting the endpoint.
  const { data: siteSettings } = useSiteSettings(isAdminRoute);
  const defaultRadius = siteSettings?.filter_radius ?? 25;

  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const persistCoords = useCallback((latitude: number, longitude: number) => {
    const entry: UserCoords = {
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    setCoords(entry);
    setStatus("granted");
    toast.success("Showing properties near you first");
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persistCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setCoords(null);
        setStatus("denied");
      },
      // Reuse a recent device fix (up to 30 min old) so the position resolves
      // quickly instead of waiting for a fresh GPS lock; coarse accuracy is
      // enough for "near you" sorting and is faster than high accuracy.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 1800000 },
    );
  }, [persistCoords]);

  // On launch (public site), rely on the browser's native geolocation prompt
  // instead of a custom permission dialog. Stored coordinates are reused.
  useEffect(() => {
    const stored = readStoredCoords();
    if (stored) {
      setCoords(stored);
      setStatus("granted");
    } else if (!isAdminRoute) {
      requestLocation();
    } else {
      setStatus("idle");
    }
  }, [isAdminRoute, requestLocation]);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCoords(null);
    requestLocation();
  }, [requestLocation]);

  const value = useMemo(
    () => ({
      coords,
      status,
      radiusKm: defaultRadius,
      requestLocation,
      clearLocation,
    }),
    [coords, status, defaultRadius, requestLocation, clearLocation],
  );

  return (
    <UserLocationContext.Provider value={value}>
      {children}
    </UserLocationContext.Provider>
  );
}

export function useUserLocation() {
  const ctx = useContext(UserLocationContext);
  if (!ctx) {
    throw new Error("useUserLocation must be used within UserLocationProvider");
  }
  return ctx;
}
