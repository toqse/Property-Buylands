"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import ReactSelect, {
  components as selectComponents,
  type InputActionMeta,
  type MenuListProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePropertyLocations } from "@/hooks/api/useProperties";
import { useUserLocation } from "@/context/UserLocationContext";
import {
  CURRENT_LOCATION_VALUE,
  buildLocationCoordsMap,
  getLocationSearchValue,
  uniqueLocationLabels,
} from "@/lib/locationFilter";
import {
  clearAllSectionLocationPrefs,
  readGlobalLocationPrefs,
  writeGlobalLocationPrefs,
} from "@/lib/listingFilterStorage";

type LocationSearchOption = {
  value: string;
  label: string;
  description?: string;
};

/** Sentinel option used to clear the location filter (show all locations). */
const ALL_LOCATIONS_VALUE = "__all_locations__";

const selectStyles: StylesConfig<LocationSearchOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 999,
    borderColor: state.isFocused ? "#1c5fa8" : "rgba(14,48,93,0.18)",
    backgroundColor: "#ffffff",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(28,95,168,0.14)" : "0 8px 22px -18px rgba(14,48,93,0.55)",
    cursor: "text",
    paddingLeft: 34,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    ":hover": { borderColor: "#1c5fa8" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 4px 0 0" }),
  input: (base) => ({ ...base, color: "#172033", fontSize: 13, margin: 0, padding: 0 }),
  placeholder: (base) => ({
    ...base,
    color: "hsl(30 8% 45%)",
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  singleValue: (base) => ({ ...base, color: "#172033", fontSize: 13, fontWeight: 600 }),
  indicatorsContainer: (base) => ({ ...base, paddingRight: 4 }),
  clearIndicator: (base) => ({ ...base, color: "#64748b", padding: 4, ":hover": { color: "#0e305d" } }),
  dropdownIndicator: (base) => ({ ...base, color: "#64748b", padding: 4, ":hover": { color: "#0e305d" } }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({
    ...base,
    zIndex: 80,
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 20px 55px -28px rgba(15,23,42,0.45)",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 90 }),
  menuList: (base) => ({
    ...base,
    maxHeight: 280,
    padding: 6,
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(100,116,139,0.35) transparent",
    "::-webkit-scrollbar": { width: 6, height: 6 },
    "::-webkit-scrollbar-track": { backgroundColor: "transparent" },
    "::-webkit-scrollbar-thumb": {
      backgroundColor: "rgba(100,116,139,0.32)",
      borderRadius: 999,
    },
    "::-webkit-scrollbar-thumb:hover": { backgroundColor: "rgba(100,116,139,0.5)" },
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: 12,
    backgroundColor: state.isSelected
      ? "rgba(15,23,42,0.08)"
      : state.isFocused
        ? "rgba(15,23,42,0.05)"
        : "transparent",
    color: "#172033",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: state.isSelected ? 700 : 500,
    ":active": { backgroundColor: "rgba(15,23,42,0.1)" },
  }),
};

type LocationSearchProps = {
  instanceId: string;
  className?: string;
  placeholder?: string;
  /** Target listings page to navigate to on select. Defaults to `/properties`. */
  basePath?: "/properties" | "/buy" | "/rent";
};

/**
 * Self-contained, searchable location picker for the navbar.
 *
 * Fetches the available property locations, fuzzy-filters them with Fuse.js,
 * and on selection navigates to the listings page with the matching geo / text
 * filters applied. Also supports "use my current location".
 */
export function LocationSearch({
  instanceId,
  className,
  placeholder = "Search city, area or location",
  basePath = "/properties",
}: LocationSearchProps) {
  const navigate = useNavigate();
  const { coords, radiusKm, requestLocation } = useUserLocation();
  const [locationSearch, setLocationSearch] = useState("");
  const [locationPage, setLocationPage] = useState(1);
  const locationPageSize = 20;
  const { data } = usePropertyLocations({
    page: locationPage,
    pageSize: locationPageSize,
    search: locationSearch.trim() || undefined,
  });
  const totalLocationPages = Math.max(1, Math.ceil((data?.count ?? 0) / locationPageSize));

  const labels = useMemo(() => uniqueLocationLabels(data?.results ?? []), [data?.results]);
  const coordsByLabel = useMemo(() => buildLocationCoordsMap(data?.results ?? []), [data?.results]);

  const options = useMemo<LocationSearchOption[]>(
    () => [
      {
        value: ALL_LOCATIONS_VALUE,
        label: "All Locations",
        description: "Clear location filter",
      },
      {
        value: CURRENT_LOCATION_VALUE,
        label: "Use my current location",
        description: "Detect nearby properties",
      },
      ...labels.map((label) => ({ value: label, label, description: "Location" })),
    ],
    [labels],
  );

  const [value, setValue] = useState<LocationSearchOption | null>(null);
  const [pendingCurrentLocation, setPendingCurrentLocation] = useState(false);
  const userInteractedRef = useRef(false);

  const currentLocationOption = options.find((o) => o.value === CURRENT_LOCATION_VALUE);

  useEffect(() => {
    setLocationPage(1);
  }, [locationSearch]);

  useEffect(() => {
    setLocationPage((page) => Math.min(page, totalLocationPages));
  }, [totalLocationPages]);

  const handleInputChange = useCallback((newValue: string, meta: InputActionMeta) => {
    if (meta.action === "input-change") {
      setLocationSearch(newValue);
    }
    return newValue;
  }, []);

  const paginatedComponents = useMemo(
    () => ({
      MenuList: (props: MenuListProps<LocationSearchOption, false>) => (
        <selectComponents.MenuList {...props}>
          {props.children}
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-200 px-2 py-2 text-[11px] text-slate-500">
            <span>
              Page {locationPage} of {totalLocationPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={locationPage <= 1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocationPage((page) => Math.max(1, page - 1));
                }}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={locationPage >= totalLocationPages}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocationPage((page) => Math.min(totalLocationPages, page + 1));
                }}
              >
                Next
              </button>
            </div>
          </div>
        </selectComponents.MenuList>
      ),
    }),
    [locationPage, totalLocationPages],
  );

  // Keep the dropdown's displayed value in sync with the website-wide (global)
  // location: show the saved global selection if any, otherwise fall back to
  // "Use my current location" once the browser grants coordinates. Display only
  // (no navigation), and never override a value the user has already picked.
  useEffect(() => {
    if (userInteractedRef.current || value) return;

    const globalPref = readGlobalLocationPrefs();
    if (globalPref && globalPref.location !== "Any") {
      const match = options.find((o) => o.value === globalPref.location);
      setValue(match ?? {
        value: globalPref.location,
        label: globalPref.location,
        description: "Location",
      });
      return;
    }

    // User explicitly chose "All Locations" — keep that label and do not snap
    // back to the cached current location.
    if (globalPref && globalPref.location === "Any" && globalPref.autoCurrentLocationDismissed) {
      const allOption = options.find((o) => o.value === ALL_LOCATIONS_VALUE);
      if (allOption) setValue(allOption);
      return;
    }

    if (coords && currentLocationOption) {
      setValue(currentLocationOption);
    }
  }, [coords, value, options, currentLocationOption]);

  const radius = String(radiusKm || 10);

  // Selecting from the navbar sets the website-wide (global) location and
  // resets every section's local override so the new choice applies everywhere.
  const applyGlobalLocation = useCallback(
    (location: string) => {
      if (location === "Any") {
        // Persist an explicit "All Locations" choice (rather than deleting the
        // pref) so switching sections doesn't re-apply the cached GPS location.
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
        });
      }
      clearAllSectionLocationPrefs();
    },
    [radius],
  );

  const goToResults = useCallback(
    (location: string) => {
      const params = new URLSearchParams();

      if (location === "Any") {
        params.set("location", "Any");
      } else if (location === CURRENT_LOCATION_VALUE && coords) {
        params.set("lat", String(coords.latitude));
        params.set("lng", String(coords.longitude));
        params.set("radius", radius);
      } else if (location && location !== CURRENT_LOCATION_VALUE) {
        const place = coordsByLabel.get(location);
        if (place) {
          params.set("lat", String(place.latitude));
          params.set("lng", String(place.longitude));
          params.set("radius", radius);
          params.set("location", location);
        } else {
          const locationQuery = getLocationSearchValue(location);
          if (locationQuery) {
            params.set("location", locationQuery);
            params.set("radius", radius);
          }
        }
      }

      const qs = params.toString();
      navigate(qs ? `${basePath}?${qs}` : basePath);
    },
    [basePath, coords, coordsByLabel, navigate, radius],
  );

  useEffect(() => {
    if (pendingCurrentLocation && coords) {
      setPendingCurrentLocation(false);
      applyGlobalLocation(CURRENT_LOCATION_VALUE);
      goToResults(CURRENT_LOCATION_VALUE);
    }
  }, [pendingCurrentLocation, coords, goToResults, applyGlobalLocation]);

  const handleChange = useCallback(
    (option: SingleValue<LocationSearchOption>) => {
      userInteractedRef.current = true;

      // "All Locations" → keep the explicit "All Locations" label visible in
      // the dropdown while resetting the global location to "Any".
      if (option && option.value === ALL_LOCATIONS_VALUE) {
        setValue(option);
        applyGlobalLocation("Any");
        goToResults("Any");
        return;
      }

      // Clear (X) button → de-select and reset the global location to "Any",
      // then show all results.
      if (!option) {
        setValue(null);
        applyGlobalLocation("Any");
        goToResults("Any");
        return;
      }

      setValue(option);

      // Picking current location before coords are available: request first,
      // then apply globally + navigate once permission resolves.
      if (option.value === CURRENT_LOCATION_VALUE && !coords) {
        setPendingCurrentLocation(true);
        requestLocation();
        return;
      }

      applyGlobalLocation(option.value);
      goToResults(option.value);
    },
    [coords, goToResults, requestLocation, applyGlobalLocation],
  );

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-[2] h-4 w-4 -translate-y-1/2 text-[#1c5fa8]" />
      <ReactSelect<LocationSearchOption, false>
        instanceId={instanceId}
        value={value}
        options={options}
        onChange={handleChange}
        inputValue={locationSearch}
        onInputChange={handleInputChange}
        filterOption={() => true}
        components={paginatedComponents}
        isClearable
        isSearchable
        placeholder={placeholder}
        noOptionsMessage={({ inputValue }) =>
          inputValue ? "No locations found" : "No locations available"
        }
        styles={selectStyles}
        menuPlacement="auto"
        menuPosition="fixed"
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        formatOptionLabel={(option, meta) => (
          <div className="min-w-0">
            <div className="truncate">{option.label}</div>
            {meta.context === "menu" && option.description && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {option.description}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
