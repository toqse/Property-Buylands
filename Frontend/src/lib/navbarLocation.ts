"use client";

import { useSyncExternalStore } from "react";
import {
  ALL_LOCATIONS_VALUE,
  locationStringToSelection,
  type LocationSelection,
} from "@/components/LocationSearchSelect";
import { isBrowserReload } from "@/lib/browserReload";
import { CURRENT_LOCATION_VALUE } from "@/lib/locationFilter";
import { readGlobalLocationPrefs, writeGlobalLocationPrefs } from "@/lib/listingFilterStorage";

export const NAVBAR_CURRENT_LOCATION_LABEL = "My current location";
export const NAVBAR_CURRENT_LOCATION_MENU_LABEL = "Use my current location";

/** Stable default — required by useSyncExternalStore getServerSnapshot. */
const DEFAULT_NAVBAR_SELECTION: LocationSelection =
  locationStringToSelection("Any", {
    allValue: ALL_LOCATIONS_VALUE,
    allLabel: "All Locations",
  }) ?? {
    value: ALL_LOCATIONS_VALUE,
    label: "All Locations",
    source: "all",
  };

function getServerNavbarSelection(): LocationSelection {
  return DEFAULT_NAVBAR_SELECTION;
}

function selectionFromGlobalPrefs(): LocationSelection {
  if (typeof window === "undefined" || isBrowserReload()) {
    return DEFAULT_NAVBAR_SELECTION;
  }
  const globalPref = readGlobalLocationPrefs();
  if (!globalPref || globalPref.location === "Any") {
    return DEFAULT_NAVBAR_SELECTION;
  }
  return (
    locationStringToSelection(globalPref.location, {
      allValue: ALL_LOCATIONS_VALUE,
      allLabel: "All Locations",
      currentLocationLabel: NAVBAR_CURRENT_LOCATION_LABEL,
      latitude: globalPref.latitude,
      longitude: globalPref.longitude,
      source:
        globalPref.latitude != null && globalPref.longitude != null
          ? "map"
          : undefined,
    }) ?? DEFAULT_NAVBAR_SELECTION
  );
}

let navbarSelection: LocationSelection = DEFAULT_NAVBAR_SELECTION;
const listeners = new Set<() => void>();

function emitNavbarLocationChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getNavbarLocationSelection(): LocationSelection {
  return navbarSelection;
}

export function setNavbarLocationSelection(selection: LocationSelection): void {
  navbarSelection = selection;
  emitNavbarLocationChange();
}

/** Re-read persisted global prefs into the navbar display (e.g. on first client mount). */
export function hydrateNavbarLocationFromPrefs(): void {
  const next = selectionFromGlobalPrefs();
  if (
    next.value === navbarSelection.value &&
    next.label === navbarSelection.label &&
    next.source === navbarSelection.source
  ) {
    return;
  }
  navbarSelection = next;
  emitNavbarLocationChange();
}

/** Persist + display current location in the navbar (first-visit popup, page filters, etc.). */
export function setNavbarToCurrentLocation(
  radiusKm: number,
  geo?: { latitude: number; longitude: number },
): void {
  writeGlobalLocationPrefs({
    location: CURRENT_LOCATION_VALUE,
    searchRadius: String(radiusKm),
    autoCurrentLocationDismissed: false,
    latitude: geo?.latitude,
    longitude: geo?.longitude,
  });
  const selection =
    locationStringToSelection(CURRENT_LOCATION_VALUE, {
      currentLocationLabel: NAVBAR_CURRENT_LOCATION_LABEL,
    }) ?? DEFAULT_NAVBAR_SELECTION;
  setNavbarLocationSelection(selection);
}

/** Persist + display "All Locations" in the navbar. */
export function setNavbarToAllLocations(radiusKm: number): void {
  writeGlobalLocationPrefs({
    location: "Any",
    searchRadius: String(radiusKm),
    autoCurrentLocationDismissed: true,
  });
  setNavbarLocationSelection(DEFAULT_NAVBAR_SELECTION);
}

export function subscribeNavbarLocation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNavbarLocationSelection(): LocationSelection {
  return useSyncExternalStore(
    subscribeNavbarLocation,
    getNavbarLocationSelection,
    getServerNavbarSelection,
  );
}
