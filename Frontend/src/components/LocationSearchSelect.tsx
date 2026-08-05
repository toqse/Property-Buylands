"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactSelect, {
  components as selectComponents,
  type InputActionMeta,
  type IndicatorsContainerProps,
  type MenuListProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { MapPin } from "lucide-react";
import { LocationMapIcon } from "@/components/LocationMapIcon";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePropertyLocations } from "@/hooks/api/useProperties";
import {
  CURRENT_LOCATION_VALUE,
  buildLocationCoordsMap,
  uniqueLocationLabels,
} from "@/lib/locationFilter";
import { useOsmPlaceSearch } from "@/lib/osmSearch";

export const ALL_LOCATIONS_VALUE = "__all_locations__";

export type LocationSelection = {
  value: string;
  label: string;
  latitude?: number;
  longitude?: number;
  source: "all" | "current" | "catalog" | "osm" | "map";
  description?: string;
};

type LocationSearchOption = LocationSelection;

export type LocationSearchSelectProps = {
  instanceId: string;
  value: LocationSelection | null;
  onChange: (selection: LocationSelection | null) => void;
  onSearchCandidateChange?: (selection: LocationSelection | null) => void;
  propertyFor?: "rent" | "sell";
  includeAll?: boolean;
  includeCurrentLocation?: boolean;
  /** Value used for the "clear / all" sentinel. Defaults to ALL_LOCATIONS_VALUE. */
  allValue?: string;
  allLabel?: string;
  currentLocationLabel?: string;
  /** Label shown in the control after current location is selected (defaults to currentLocationLabel). */
  selectedCurrentLocationLabel?: string;
  placeholder?: string;
  className?: string;
  /** When true, use rounded pill styling (navbar). When false, use modal field styling. */
  variant?: "navbar" | "modal";
  showMapPin?: boolean;
  /** Renders a map-pin control inside the field (right side) to open the map picker. */
  onMapPickClick?: () => void;
  mapPinActive?: boolean;
  isLoading?: boolean;
};

const CATALOG_PAGE_SIZE = 20;

const navbarSelectStyles: StylesConfig<LocationSearchOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 999,
    borderColor: state.isFocused ? "#1c5fa8" : "rgba(14,48,93,0.18)",
    backgroundColor: "#ffffff",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(28,95,168,0.14)"
      : "0 8px 22px -18px rgba(14,48,93,0.55)",
    cursor: "text",
    paddingLeft: 34,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    ":hover": { borderColor: "#1c5fa8" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 4px 0 0" }),
  input: (base) => ({
    ...base,
    color: "#172033",
    fontSize: 13,
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: "hsl(30 8% 45%)",
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#172033",
    fontSize: 13,
    fontWeight: 600,
  }),
  indicatorsContainer: (base) => ({ ...base, paddingRight: 4 }),
  clearIndicator: (base) => ({
    ...base,
    color: "#64748b",
    padding: 4,
    ":hover": { color: "#0e305d" },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#64748b",
    padding: 4,
    ":hover": { color: "#0e305d" },
  }),
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
    "::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "rgba(100,116,139,0.5)",
    },
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

/** Tighter control chrome so "All Locations" fits on narrow phones. */
const navbarMobileSelectStyles: StylesConfig<LocationSearchOption, false> = {
  ...navbarSelectStyles,
  control: (base, state) => ({
    ...navbarSelectStyles.control!(base, state),
    minHeight: 36,
    paddingLeft: 28,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 2px 0 0" }),
  input: (base) => ({
    ...base,
    color: "#172033",
    fontSize: 12,
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: "hsl(30 8% 45%)",
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#172033",
    fontSize: 12,
    fontWeight: 600,
  }),
  indicatorsContainer: (base) => ({ ...base, paddingRight: 2 }),
  clearIndicator: (base) => ({
    ...base,
    color: "#64748b",
    padding: 2,
    ":hover": { color: "#0e305d" },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#64748b",
    padding: 2,
    ":hover": { color: "#0e305d" },
  }),
};

const modalSelectStyles: StylesConfig<LocationSearchOption, false> = {
  ...navbarSelectStyles,
  control: (base, state) => ({
    ...base,
    minHeight: 48,
    borderRadius: 12,
    borderColor: state.isFocused ? "#1c5fa8" : "hsl(var(--border))",
    backgroundColor: "#ffffff",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(28,95,168,0.14)" : "none",
    cursor: "text",
    paddingLeft: 36,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    ":hover": { borderColor: "#1c5fa8" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 80,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 20px 55px -28px rgba(15,23,42,0.45)",
  }),
};

/** Map a stored location string back to a picker selection. */
export function locationStringToSelection(
  location: string,
  opts?: {
    allValue?: string;
    allLabel?: string;
    currentLocationLabel?: string;
    latitude?: number;
    longitude?: number;
    source?: LocationSelection["source"];
  },
): LocationSelection | null {
  const allValue = opts?.allValue ?? ALL_LOCATIONS_VALUE;
  const allLabel = opts?.allLabel ?? "No location filter";

  if (!location || location === "Any" || location === allValue) {
    return {
      value: allValue,
      label: allLabel,
      source: "all",
      description: "Clear location filter",
    };
  }

  if (location === CURRENT_LOCATION_VALUE) {
    return {
      value: CURRENT_LOCATION_VALUE,
      label: opts?.currentLocationLabel ?? "My current location",
      source: "current",
      description: "Detect nearby properties",
    };
  }

  return {
    value: location,
    label: location,
    latitude: opts?.latitude,
    longitude: opts?.longitude,
    source: opts?.source ?? "catalog",
    description:
      opts?.source === "osm" || opts?.source === "map" ? undefined : "Location",
  };
}

/**
 * Shared searchable location picker.
 * Empty input → catalog locations from the location endpoint.
 * Typed keyword → OpenStreetMap Nominatim results.
 */
export function LocationSearchSelect({
  instanceId,
  value,
  onChange,
  onSearchCandidateChange,
  propertyFor,
  includeAll = true,
  includeCurrentLocation = true,
  allValue = ALL_LOCATIONS_VALUE,
  allLabel = "All Locations",
  currentLocationLabel = "Use my current location",
  selectedCurrentLocationLabel,
  placeholder = "Search city, area or location",
  className,
  variant = "navbar",
  showMapPin = true,
  onMapPickClick,
  mapPinActive = false,
  isLoading: externalLoading,
}: LocationSearchSelectProps) {
  const isMobile = useIsMobile();
  const [inputValue, setInputValue] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const trimmedInput = inputValue.trim();
  const isOsmMode = trimmedInput.length > 0;

  const { data: catalogData, isLoading: catalogLoading } = usePropertyLocations(
    {
      page: catalogPage,
      pageSize: CATALOG_PAGE_SIZE,
      propertyFor,
      search: undefined,
    },
  );

  const { results: osmResults, loading: osmLoading } = useOsmPlaceSearch(
    trimmedInput,
    {
      enabled: isOsmMode,
    },
  );

  const totalCatalogPages = Math.max(
    1,
    Math.ceil((catalogData?.count ?? 0) / CATALOG_PAGE_SIZE),
  );

  const catalogCoordsByLabel = useMemo(
    () => buildLocationCoordsMap(catalogData?.results ?? []),
    [catalogData?.results],
  );

  const catalogLabels = useMemo(
    () => uniqueLocationLabels(catalogData?.results ?? []),
    [catalogData?.results],
  );

  const options = useMemo<LocationSearchOption[]>(() => {
    if (isOsmMode) {
      return osmResults.map((place) => ({
        value: place.label,
        label: place.label,
        latitude: place.latitude,
        longitude: place.longitude,
        source: "osm" as const,
      }));
    }

    const items: LocationSearchOption[] = [];
    if (includeAll) {
      items.push({
        value: allValue,
        label: allLabel,
        source: "all",
        description: "Clear location filter",
      });
    }
    if (includeCurrentLocation) {
      items.push({
        value: CURRENT_LOCATION_VALUE,
        label: currentLocationLabel,
        source: "current",
        description: "Detect nearby properties",
      });
    }
    for (const label of catalogLabels) {
      const coords = catalogCoordsByLabel.get(label);
      items.push({
        value: label,
        label,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        source: "catalog",
        description: "Location",
      });
    }
    return items;
  }, [
    isOsmMode,
    osmResults,
    includeAll,
    includeCurrentLocation,
    allValue,
    allLabel,
    currentLocationLabel,
    catalogLabels,
    catalogCoordsByLabel,
  ]);

  useEffect(() => {
    if (!isOsmMode) setCatalogPage(1);
  }, [isOsmMode]);

  useEffect(() => {
    setCatalogPage((page) => Math.min(page, totalCatalogPages));
  }, [totalCatalogPages]);

  useEffect(() => {
    if (!onSearchCandidateChange) return;
    const first = isOsmMode
      ? (options.find((option) => option.source === "osm") ?? null)
      : null;
    onSearchCandidateChange(first);
  }, [isOsmMode, onSearchCandidateChange, options]);

  const handleInputChange = useCallback(
    (newValue: string, meta: InputActionMeta) => {
      if (meta.action === "input-change") {
        setInputValue(newValue);
      }
      return newValue;
    },
    [],
  );

  const paginatedComponents = useMemo(
    () => ({
      MenuList: (props: MenuListProps<LocationSearchOption, false>) => (
        <selectComponents.MenuList {...props}>
          {props.children}
          {!isOsmMode && totalCatalogPages > 1 ? (
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-200 px-2 py-2 text-[11px] text-slate-500">
              <span>
                Page {catalogPage} of {totalCatalogPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={catalogPage <= 1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCatalogPage((page) => Math.max(1, page - 1));
                  }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={catalogPage >= totalCatalogPages}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCatalogPage((page) =>
                      Math.min(totalCatalogPages, page + 1),
                    );
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </selectComponents.MenuList>
      ),
    }),
    [isOsmMode, catalogPage, totalCatalogPages],
  );

  const reactSelectComponents = useMemo(() => {
    const IndicatorsContainer = (
      props: IndicatorsContainerProps<LocationSearchOption, false>,
    ) => (
      <selectComponents.IndicatorsContainer {...props}>
        {onMapPickClick ? (
          <button
            type="button"
            aria-label="Pick location on map"
            title="Pick location on map"
            className={cn(
              "mr-0.5 flex shrink-0 items-center justify-center rounded-full transition",
              isMobile ? "h-6 w-6" : "h-7 w-7",
              "hover:bg-[#1c5fa8]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c5fa8]/35",
              mapPinActive && "bg-[#1c5fa8]/10 ring-1 ring-[#1c5fa8]/25",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMapPickClick();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMapPickClick();
            }}
          >
            <LocationMapIcon
              className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")}
            />
          </button>
        ) : null}
        {props.children}
      </selectComponents.IndicatorsContainer>
    );

    return {
      ...paginatedComponents,
      IndicatorsContainer,
    };
  }, [paginatedComponents, onMapPickClick, mapPinActive, isMobile]);

  const reactSelectValue = useMemo(() => {
    if (!value) return null;
    if (value.source === "all" && value.value !== allValue) {
      return { ...value, value: allValue };
    }
    if (value.source === "current") {
      return {
        ...value,
        label: selectedCurrentLocationLabel ?? currentLocationLabel,
      };
    }
    return value;
  }, [value, allValue, selectedCurrentLocationLabel, currentLocationLabel]);

  const handleChange = useCallback(
    (option: SingleValue<LocationSearchOption>) => {
      setInputValue("");
      onSearchCandidateChange?.(null);
      onChange(option ?? null);
    },
    [onChange, onSearchCandidateChange],
  );

  const loading = externalLoading || (isOsmMode ? osmLoading : catalogLoading);
  const styles =
    variant === "navbar"
      ? isMobile
        ? navbarMobileSelectStyles
        : navbarSelectStyles
      : modalSelectStyles;
  const useMenuPortal = variant === "navbar";

  return (
    <div className={cn("relative", className)}>
      {showMapPin ? (
        variant === "modal" ? (
          <LocationMapIcon className="pointer-events-none absolute left-3 top-1/2 z-[2] h-5 w-5 -translate-y-1/2" />
        ) : (
          <MapPin
            className={cn(
              "pointer-events-none absolute top-1/2 z-[2] -translate-y-1/2 text-[#1c5fa8]",
              isMobile ? "left-2.5 h-3.5 w-3.5" : "left-3 h-4 w-4",
            )}
          />
        )
      ) : null}
      <ReactSelect<LocationSearchOption, false>
        instanceId={instanceId}
        value={reactSelectValue}
        options={options}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        filterOption={() => true}
        components={reactSelectComponents}
        isClearable={!!value && value.source !== "all"}
        isSearchable
        isLoading={loading}
        placeholder={placeholder}
        noOptionsMessage={({ inputValue: typed }) =>
          typed.trim()
            ? loading
              ? "Searching…"
              : "No locations found"
            : "No locations available"
        }
        styles={styles}
        menuPlacement="auto"
        menuPosition={useMenuPortal ? "fixed" : "absolute"}
        menuPortalTarget={
          useMenuPortal && typeof document !== "undefined"
            ? document.body
            : undefined
        }
        formatOptionLabel={(option, meta) => {
          const showMenuPin =
            meta.context === "menu" && option.value === allValue;
          return (
            <div className="flex min-w-0 items-start gap-2">
              {showMenuPin ? (
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1c5fa8]" />
              ) : null}
              <div className="min-w-0">
                <div className="truncate">{option.label}</div>
                {meta.context === "menu" && option.description ? (
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {option.description}
                  </div>
                ) : null}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
