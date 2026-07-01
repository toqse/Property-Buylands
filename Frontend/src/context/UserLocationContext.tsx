"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { LocationPromptDialog } from "@/components/LocationPromptDialog";
import {
  geolocationErrorMessage,
  requestGeolocationForFilter,
  requestGeolocationForPrompt,
  type GeolocationErrorCode,
} from "@/lib/geolocationRequest";
import { DEFAULT_PROPERTY_FILTER_RADIUS_KM } from "@/lib/locationFilter";
import { setNavbarToCurrentLocation } from "@/lib/navbarLocation";
import { useSiteSettings } from "@/hooks/api/useCatalog";

const PROMPT_SEEN_KEY = "buylands_location_prompt_seen";

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
  /** True briefly after first-visit popup Allow succeeds — views may auto-filter once. */
  firstVisitAutoFilterPending: boolean;
  consumeFirstVisitAutoFilter: () => void;
  requestLocation: () => void;
  requestLocationForFilter: () => Promise<UserCoords | null>;
  clearLocation: () => void;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(
  null,
);

function hasSeenLocationPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PROMPT_SEEN_KEY) === "1";
}

function markLocationPromptSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROMPT_SEEN_KEY, "1");
}

function toUserCoords(latitude: number, longitude: number): UserCoords {
  return {
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  };
}

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const { data: siteSettings } = useSiteSettings(isAdminRoute);
  const defaultRadius = siteSettings?.filter_radius ?? DEFAULT_PROPERTY_FILTER_RADIUS_KM;

  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [firstVisitAutoFilterPending, setFirstVisitAutoFilterPending] = useState(false);
  const firstVisitAllowRef = useRef(false);

  const setCoordsInMemory = useCallback((latitude: number, longitude: number) => {
    const entry = toUserCoords(latitude, longitude);
    setCoords(entry);
    setStatus("granted");
    return entry;
  }, []);

  const handleGeolocationFailure = useCallback((code: GeolocationErrorCode) => {
    setCoords(null);
    setStatus("denied");
    toast.error(geolocationErrorMessage(code));
  }, []);

  const requestLocation = useCallback(() => {
    setStatus("loading");
    requestGeolocationForPrompt()
      .then(({ latitude, longitude }) => {
        setCoordsInMemory(latitude, longitude);
        if (firstVisitAllowRef.current) {
          firstVisitAllowRef.current = false;
          setFirstVisitAutoFilterPending(true);
          setNavbarToCurrentLocation(defaultRadius, { latitude, longitude });
          toast.success("Showing properties near you first");
        }
      })
      .catch((err: unknown) => {
        firstVisitAllowRef.current = false;
        const code = (err instanceof Error ? err.message : "unavailable") as GeolocationErrorCode;
        handleGeolocationFailure(code);
      });
  }, [setCoordsInMemory, handleGeolocationFailure, defaultRadius]);

  const requestLocationForFilter = useCallback(async (): Promise<UserCoords | null> => {
    setStatus("loading");
    try {
      const { latitude, longitude } = await requestGeolocationForFilter();
      const entry = setCoordsInMemory(latitude, longitude);
      setNavbarToCurrentLocation(defaultRadius, { latitude, longitude });
      return entry;
    } catch (err: unknown) {
      const code = (err instanceof Error ? err.message : "unavailable") as GeolocationErrorCode;
      handleGeolocationFailure(code);
      return null;
    }
  }, [setCoordsInMemory, handleGeolocationFailure, defaultRadius]);

  const dismissLocationPrompt = useCallback(() => {
    markLocationPromptSeen();
    setStatus("denied");
  }, []);

  const allowLocationFromPrompt = useCallback(() => {
    markLocationPromptSeen();
    firstVisitAllowRef.current = true;
    requestLocation();
  }, [requestLocation]);

  const consumeFirstVisitAutoFilter = useCallback(() => {
    setFirstVisitAutoFilterPending(false);
  }, []);

  // First visit: custom popup only. Coords stay in memory for the session.
  useEffect(() => {
    if (isAdminRoute) {
      setStatus("idle");
      return;
    }
    if (!hasSeenLocationPrompt()) {
      setStatus("prompting");
    } else {
      setStatus("idle");
    }
  }, [isAdminRoute]);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setStatus("idle");
  }, []);

  const value = useMemo(
    () => ({
      coords,
      status,
      radiusKm: defaultRadius,
      firstVisitAutoFilterPending,
      consumeFirstVisitAutoFilter,
      requestLocation,
      requestLocationForFilter,
      clearLocation,
    }),
    [
      coords,
      status,
      defaultRadius,
      firstVisitAutoFilterPending,
      consumeFirstVisitAutoFilter,
      requestLocation,
      requestLocationForFilter,
      clearLocation,
    ],
  );

  const showLocationPrompt = !isAdminRoute && status === "prompting";

  return (
    <UserLocationContext.Provider value={value}>
      {children}
      <LocationPromptDialog
        open={showLocationPrompt}
        onOpenChange={(open) => {
          if (!open && showLocationPrompt) {
            dismissLocationPrompt();
          }
        }}
        onAllow={allowLocationFromPrompt}
        onDismiss={dismissLocationPrompt}
        loading={status === "loading"}
      />
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
