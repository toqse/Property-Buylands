"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useNavigate, buildAppPath, isListingPagePath, normalizeListingPath } from "@/lib/router";
import { cn } from "@/lib/utils";
import { useUserLocation } from "@/context/UserLocationContext";
import { isBrowserReload } from "@/lib/browserReload";
import {
  CURRENT_LOCATION_VALUE,
  getLocationSearchValue,
  normalizeGeoPoint,
} from "@/lib/locationFilter";
import {
  clearAllSectionLocationPrefs,
  writeGlobalLocationPrefs,
} from "@/lib/listingFilterStorage";
import {
  hydrateNavbarLocationFromPrefs,
  NAVBAR_CURRENT_LOCATION_LABEL,
  NAVBAR_CURRENT_LOCATION_MENU_LABEL,
  setNavbarLocationSelection,
  useNavbarLocationSelection,
} from "@/lib/navbarLocation";
import {
  ALL_LOCATIONS_VALUE,
  LocationSearchSelect,
  locationStringToSelection,
  type LocationSelection,
} from "@/components/LocationSearchSelect";
import {
  MapLocationPicker,
  type MapLocationConfirm,
} from "@/components/MapLocationPicker";

type LocationSearchProps = {
  instanceId: string;
  className?: string;
  placeholder?: string;
  /** Target listings page to navigate to on select. Defaults to `/properties`. */
  basePath?: "/properties" | "/buy" | "/rent";
};

function toNavbarSelection(selection: LocationSelection): LocationSelection {
  if (selection.source === "current") {
    return locationStringToSelection(CURRENT_LOCATION_VALUE, {
      currentLocationLabel: NAVBAR_CURRENT_LOCATION_LABEL,
    })!;
  }
  return selection;
}

/**
 * Navbar location picker — uses the shared LocationSearchSelect and navigates
 * to listings with geo / text filters on selection.
 */
export function LocationSearch({
  instanceId,
  className,
  placeholder = "Search city, area or location",
  basePath = "/properties",
}: LocationSearchProps) {
  const navigate = useNavigate();
  const pathname = usePathname() ?? "/properties";
  const onListingPage = isListingPagePath(pathname);
  const listingBasePath = onListingPage
    ? normalizeListingPath(pathname)
    : normalizeListingPath(basePath);
  const { coords, radiusKm, requestLocationForFilter } = useUserLocation();
  const value = useNavbarLocationSelection();
  const [pendingCurrentLocation, setPendingCurrentLocation] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPortalReady, setMapPortalReady] = useState(false);
  const hydratedRef = useRef(false);

  const radius = String(radiusKm || 10);

  const pinActive =
    value != null &&
    value.source !== "all" &&
    value.latitude != null &&
    value.longitude != null &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude);

  const mapInitialCenter = useMemo(() => {
    if (pinActive && value) {
      return normalizeGeoPoint({
        latitude: value.latitude,
        longitude: value.longitude,
      });
    }
    if (
      value?.value === CURRENT_LOCATION_VALUE ||
      value?.source === "current"
    ) {
      return normalizeGeoPoint(coords);
    }
    return normalizeGeoPoint(coords);
  }, [pinActive, value, coords]);

  const preferMapCurrentLocation =
    value?.value === CURRENT_LOCATION_VALUE || value?.source === "current";

  useEffect(() => {
    setMapPortalReady(true);
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (isBrowserReload()) return;
    hydrateNavbarLocationFromPrefs();
  }, []);

  const applyGlobalLocation = useCallback(
    (location: string, geo?: { latitude: number; longitude: number } | null) => {
      if (location === "Any") {
        writeGlobalLocationPrefs({
          location: "Any",
          searchRadius: radius,
          autoCurrentLocationDismissed: true,
        });
      } else {
        writeGlobalLocationPrefs({
          location,
          searchRadius: radius,
          autoCurrentLocationDismissed: location !== CURRENT_LOCATION_VALUE,
          latitude: geo?.latitude,
          longitude: geo?.longitude,
        });
      }
      clearAllSectionLocationPrefs();
    },
    [radius],
  );

  const goToResults = useCallback(
    (selection: LocationSelection | null, geo?: { latitude: number; longitude: number } | null) => {
      const params = new URLSearchParams(
        typeof window !== "undefined" && onListingPage
          ? window.location.search.slice(1)
          : "",
      );
      params.delete("lat");
      params.delete("lng");
      params.delete("radius");
      params.delete("location");
      const activeCoords = geo ?? coords;

      if (!selection || selection.source === "all") {
        params.delete("lat");
        params.delete("lng");
        params.delete("radius");
        params.set("location", "Any");
      } else if (selection.source === "current" && activeCoords) {
        params.set("lat", String(activeCoords.latitude));
        params.set("lng", String(activeCoords.longitude));
        params.set("radius", radius);
        params.set("location", CURRENT_LOCATION_VALUE);
      } else if (selection.source === "current") {
        params.set("location", CURRENT_LOCATION_VALUE);
        params.set("radius", radius);
      } else if (
        selection.latitude != null &&
        selection.longitude != null &&
        Number.isFinite(selection.latitude) &&
        Number.isFinite(selection.longitude)
      ) {
        params.set("lat", String(selection.latitude));
        params.set("lng", String(selection.longitude));
        params.set("radius", radius);
        params.set("location", selection.label);
      } else if (selection.value && selection.value !== CURRENT_LOCATION_VALUE) {
        const locationQuery = getLocationSearchValue(selection.label);
        if (locationQuery) {
          params.set("location", locationQuery);
          params.set("radius", radius);
        }
      }

      const qs = params.toString();
      navigate(buildAppPath(listingBasePath, qs), { replace: true });
    },
    [listingBasePath, onListingPage, coords, navigate, radius],
  );

  useEffect(() => {
    if (pendingCurrentLocation && coords) {
      setPendingCurrentLocation(false);
      const sel = toNavbarSelection(
        locationStringToSelection(CURRENT_LOCATION_VALUE, {
          currentLocationLabel: NAVBAR_CURRENT_LOCATION_LABEL,
        })!,
      );
      setNavbarLocationSelection(sel);
      applyGlobalLocation(CURRENT_LOCATION_VALUE, coords);
      goToResults(sel, coords);
    }
  }, [pendingCurrentLocation, coords, goToResults, applyGlobalLocation]);

  const handleChange = useCallback(
    (selection: LocationSelection | null) => {
      if (!selection || selection.source === "all") {
        const allSel =
          selection ??
          locationStringToSelection("Any", {
            allValue: ALL_LOCATIONS_VALUE,
            allLabel: "All Locations",
          })!;
        setNavbarLocationSelection(allSel);
        applyGlobalLocation("Any");
        goToResults(allSel);
        return;
      }

      if (selection.source === "current") {
        const currentSel = toNavbarSelection(selection);
        setNavbarLocationSelection(currentSel);
        applyGlobalLocation(CURRENT_LOCATION_VALUE);

        if (coords) {
          applyGlobalLocation(CURRENT_LOCATION_VALUE, coords);
          goToResults(currentSel, coords);
          return;
        }

        goToResults(currentSel);
        setPendingCurrentLocation(true);
        void requestLocationForFilter().then((result) => {
          if (!result) {
            setPendingCurrentLocation(false);
            return;
          }
          applyGlobalLocation(CURRENT_LOCATION_VALUE, result);
          goToResults(currentSel, result);
        });
        return;
      }

      const storedSelection = toNavbarSelection(selection);
      setNavbarLocationSelection(storedSelection);

      const storedLocation = storedSelection.label;
      const storedGeo =
        storedSelection.latitude != null &&
        storedSelection.longitude != null &&
        Number.isFinite(storedSelection.latitude) &&
        Number.isFinite(storedSelection.longitude)
          ? { latitude: storedSelection.latitude, longitude: storedSelection.longitude }
          : null;

      applyGlobalLocation(storedLocation, storedGeo);
      goToResults(storedSelection);
    },
    [coords, goToResults, requestLocationForFilter, applyGlobalLocation],
  );

  const handleMapConfirm = useCallback(
    (result: MapLocationConfirm) => {
      handleChange({
        value: result.label,
        label: result.label,
        latitude: result.latitude,
        longitude: result.longitude,
        source: "map",
      });
    },
    [handleChange],
  );

  const openMapPicker = useCallback(() => {
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    setMapOpen(true);
  }, []);

  return (
    <>
      <LocationSearchSelect
        instanceId={instanceId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("min-w-0", className)}
        variant="navbar"
        allValue={ALL_LOCATIONS_VALUE}
        allLabel="All Locations"
        currentLocationLabel={NAVBAR_CURRENT_LOCATION_MENU_LABEL}
        selectedCurrentLocationLabel={NAVBAR_CURRENT_LOCATION_LABEL}
        onMapPickClick={openMapPicker}
        mapPinActive={pinActive}
      />
      {mapPortalReady
        ? createPortal(
            <MapLocationPicker
              open={mapOpen}
              onOpenChange={setMapOpen}
              initialCenter={mapInitialCenter}
              preferCurrentLocation={preferMapCurrentLocation}
              onConfirm={handleMapConfirm}
            />,
            document.body,
          )
        : null}
    </>
  );
}
