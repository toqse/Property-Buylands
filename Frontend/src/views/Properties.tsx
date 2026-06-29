"use client";

import { useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate, buildAppPath } from "@/lib/router";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PropertyCard } from "@/components/PropertyCard";
import { MobilePropertyCard } from "@/components/MobilePropertyCard";
import { PropertyCardSkeleton, MobilePropertyCardSkeleton } from "@/components/PropertyCardSkeleton";
import { MobileAdvertisementCard } from "@/components/MobileAdvertisementCard";
import { AdvertisementCard } from "@/components/AdvertisementCard";
import { usePropertyList, usePropertyLocations } from "@/hooks/api/useProperties";
import { usePropertyTypes, useFeatures } from "@/hooks/api/useCatalog";
import { useUserLocation } from "@/context/UserLocationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { isBrowserReload } from "@/lib/browserReload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, Check, LocateFixed, X } from "lucide-react";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { cn } from "@/lib/utils";
import {
  CURRENT_LOCATION_VALUE,
  RADIUS_OPTIONS,
  buildLocationCoordsMap,
  getLocationSearchValue,
} from "@/lib/locationFilter";
import {
  LocationSearchSelect,
  locationStringToSelection,
  type LocationSelection,
} from "@/components/LocationSearchSelect";
import { setNavbarToAllLocations, setNavbarToCurrentLocation } from "@/lib/navbarLocation";
import {
  getListingSection,
  readGlobalLocationPrefs,
  readSectionLocationPrefs,
  writeSectionLocationPrefs,
  type SectionLocationPrefs,
} from "@/lib/listingFilterStorage";
import {
  clearSearchFiltersForFlags,
  DEFAULT_PROPERTY_TYPE_FLAGS,
  DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
  findPropertyTypeFlags,
  propertyTypeSearchListParams,
  readTypeSearchFiltersFromUrlParams,
  replaceTypeSearchFiltersInUrlParams,
  type PropertyTypeSearchFilterState,
} from "@/lib/api/propertyForm";
import {
  PropertyTypeRoomSearchFields,
  PropertyTypeSearchFields,
} from "@/components/PropertyTypeSearchFields";
import { ActiveListingFiltersBar } from "@/components/ActiveListingFiltersBar";
import { buildActiveListingFilterChips } from "@/lib/listingActiveFilters";

const PRICE_RANGES: { value: string; label: string; min: number; max: number }[] = [
  { value: "any", label: "Any price", min: 0, max: 5000000 },
  { value: "0-1000000", label: "Under ₹10 Lakh", min: 0, max: 1000000 },
  { value: "1000000-2500000", label: "₹10 – 25 Lakh", min: 1000000, max: 2500000 },
  { value: "2500000-5000000", label: "₹25 – 50 Lakh", min: 2500000, max: 5000000 },
  { value: "5000000-10000000", label: "₹50 Lakh – 1 Crore", min: 5000000, max: 10000000 },
  { value: "10000000-100000000", label: "₹1 Crore+", min: 10000000, max: 100000000 },
];

type FeatureOption = { id: number; name: string };

const PROPERTY_FOR_PILLS: { value: string; label: string }[] = [
  { value: "Any", label: "All" },
  { value: "For Sale", label: "Sale" },
  { value: "For Rent", label: "Rent" },
];

function urlHasNonLocationFilters(params: URLSearchParams): boolean {
  return [...params.keys()].some((k) => !["lat", "lng", "radius", "location"].includes(k));
}

/** Prefer the live browser URL — React `searchParams` can lag behind `navigate()`. */
function readLiveSearchParams(fallback: URLSearchParams): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams(fallback.toString());
  const live = window.location.search.slice(1);
  if (live) return new URLSearchParams(live);
  return new URLSearchParams(fallback.toString());
}

/** Merge live URL, React params, and a pending apply-navigate query (router may lag). */
function mergeNavigationSearchParams(
  reactParams: URLSearchParams,
  pendingQuery: string | null,
): URLSearchParams {
  const merged = readLiveSearchParams(reactParams);
  if (pendingQuery) {
    const pending = new URLSearchParams(pendingQuery);
    for (const [key, value] of pending.entries()) {
      if (!merged.has(key)) merged.set(key, value);
    }
  }
  return merged;
}

function normalizePropertyForType(value: string): string {
  if (value === "Sale") return "For Sale";
  return value;
}

const mobileFilterLabelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(30_10%_38%)]";

/** Pill toggle used by the mobile filter sheet (Property For / Bedrooms / Bathrooms). */
function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-10 rounded-xl border px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
        active
          ? "border-transparent bg-gradient-to-br from-[#0e305d] to-[#2f7bc4] text-white shadow-[0_10px_20px_-12px_rgba(14,48,93,0.9)]"
          : "border-border bg-white text-foreground/75 hover:border-foreground/30 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Inline multi-select for property features. Rendered in-DOM (not a portaled
 * popover) so it never conflicts with the drawer's drag/outside-press handling.
 */
function FeaturesField({
  options,
  selected,
  onToggle,
}: {
  options: FeatureOption[];
  selected: number[];
  onToggle: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedNames = selected
    .map((id) => options.find((o) => o.id === id)?.name)
    .filter((x): x is string => !!x);

  const label =
    selected.length === 0 ? "All features" : selected.length === 1 ? selectedNames[0] ?? "1 feature" : `${selected.length} features selected`;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-white px-3.5 text-left text-sm text-[hsl(30_14%_20%)]"
      >
        <span className={cn("min-w-0 truncate", selected.length === 0 && "text-muted-foreground")}>{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-sm">
          {options.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No features available</div>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onToggle(opt.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
                      checked ? "border-[#1c5fa8] bg-[#1c5fa8] text-white" : "border-foreground/30 bg-white",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 break-words">{opt.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const Properties = ({ defaultType }: { defaultType?: "For Sale" | "For Rent" } = {}) => {
  const [searchParams] = useSearchParams();
  const pathname = usePathname() ?? "/buy";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    coords,
    radiusKm: defaultRadiusKm,
    status: locationStatus,
    requestLocationForFilter,
    firstVisitAutoFilterPending,
    consumeFirstVisitAutoFilter,
  } = useUserLocation();
  const listingSection = getListingSection(pathname);
  const skipUrlHydrationRef = useRef(isBrowserReload());
  /** Holds filter URL from Apply until router + window.location catch up. */
  const pendingFilterParamsRef = useRef<string | null>(null);

  const readInitialParam = (key: string, fallback: string) => {
    if (skipUrlHydrationRef.current) return fallback;
    return searchParams.get(key) || fallback;
  };

  // Lazy-initialize state directly from the URL so first render already shows
  // the correct filtered list (no flash of "All" before useEffect catches up).
  const initialQ = readInitialParam("q", "");
  const initialCategory = readInitialParam("category", "All");
  const initialType = readInitialParam("type", defaultType || "Any");
  const initialMinPriceRaw = skipUrlHydrationRef.current ? null : searchParams.get("minPrice");
  const initialMaxPriceRaw = skipUrlHydrationRef.current ? null : searchParams.get("maxPrice");
  const initialMin = initialMinPriceRaw ? Math.max(0, Number(initialMinPriceRaw) || 0) : 0;
  const initialMax = initialMaxPriceRaw ? Math.max(initialMin, Number(initialMaxPriceRaw) || 5000000) : 5000000;

  const [q, setQ] = useState(initialQ);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [location, setLocation] = useState<string>("Any");
  const [searchRadius, setSearchRadius] = useState<string>(String(defaultRadiusKm));
  /** Per-section: do not auto-apply GPS on Buy/Rent independently */
  const [autoCurrentLocationDismissed, setAutoCurrentLocationDismissed] = useState(true);
  /** User chose "Any" — do not auto-apply saved GPS on listings */
  const [pendingCurrentLocation, setPendingCurrentLocation] = useState(false);
  const [category, setCategory] = useState<string>(initialCategory);
  const [type, setType] = useState<string>(initialType);
  const [typeFilters, setTypeFilters] = useState<PropertyTypeSearchFilterState>(() => ({
    ...DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
    ...(skipUrlHydrationRef.current
      ? {}
      : readTypeSearchFiltersFromUrlParams(searchParams)),
  }));
  const [price, setPrice] = useState<number[]>([initialMin, initialMax]);
  const [priceRange, setPriceRange] = useState<string>("any");
  const [features, setFeatures] = useState<number[]>(() => {
    if (skipUrlHydrationRef.current) return [];
    const f = searchParams.get("features");
    return f
      ? f
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : [];
  });

  /** Draft filter state — edited in the modal; committed to applied state on "Apply filters". */
  const [draftCategory, setDraftCategory] = useState(initialCategory);
  const [draftType, setDraftType] = useState(initialType);
  const [draftTypeFilters, setDraftTypeFilters] = useState<PropertyTypeSearchFilterState>(() => ({
    ...DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
    ...(skipUrlHydrationRef.current
      ? {}
      : readTypeSearchFiltersFromUrlParams(searchParams)),
  }));
  const [draftPrice, setDraftPrice] = useState<number[]>([initialMin, initialMax]);
  const [draftPriceRange, setDraftPriceRange] = useState("any");
  const [draftFeatures, setDraftFeatures] = useState<number[]>(() => {
    if (skipUrlHydrationRef.current) return [];
    const f = searchParams.get("features");
    return f
      ? f
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : [];
  });
  const [draftLocation, setDraftLocation] = useState("Any");
  const [draftSearchRadius, setDraftSearchRadius] = useState(String(defaultRadiusKm));
  const [draftSelectedPlaceGeo, setDraftSelectedPlaceGeo] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const draftPlaceGeoRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const draftLocationSearchCandidateRef = useRef<LocationSelection | null>(null);

  /** Drives the property list API — updated on Apply/Reset and when the URL changes. */
  const stableFilterKeyRef = useRef(searchParams.toString());
  const [filterKeyOverride, setFilterKeyOverride] = useState<string | null>(null);

  const [sort, setSort] = useState("newest");
  const isMobile = useIsMobile();
  const { data: propertyTypesData } = usePropertyTypes();
  const { data: featuresData } = useFeatures();
  const featureOptions = useMemo(
    () => (featuresData?.results ?? []).map((f) => ({ id: f.id, name: f.name })),
    [featuresData],
  );
  const propertyForFilter =
    type === "For Rent"
      ? ("rent" as const)
      : type === "For Sale"
        ? ("sell" as const)
        : defaultType === "For Rent"
          ? ("rent" as const)
          : defaultType === "For Sale"
            ? ("sell" as const)
            : undefined;
  const { data: locationData } = usePropertyLocations({
    pageSize: 100,
    propertyFor: propertyForFilter,
  });
  const locationCoordsByLabel = useMemo(
    () => buildLocationCoordsMap(locationData?.results ?? []),
    [locationData?.results],
  );
  const [selectedPlaceGeo, setSelectedPlaceGeo] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const selectedPlaceGeoRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const locationSearchCandidateRef = useRef<LocationSelection | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const persistSectionLocationPrefs = useCallback(
    (prefs: SectionLocationPrefs) => {
      writeSectionLocationPrefs(listingSection, prefs);
    },
    [listingSection],
  );

  const syncDraftFromApplied = useCallback(() => {
    setDraftCategory(category);
    setDraftType(type);
    setDraftTypeFilters({ ...typeFilters });
    setDraftPrice([...price]);
    setDraftPriceRange(priceRange);
    setDraftFeatures([...features]);
    setDraftLocation(location);
    setDraftSearchRadius(searchRadius);
    draftPlaceGeoRef.current = selectedPlaceGeoRef.current;
    setDraftSelectedPlaceGeo(selectedPlaceGeo);
    draftLocationSearchCandidateRef.current = locationSearchCandidateRef.current;
  }, [
    category,
    type,
    typeFilters,
    price,
    priceRange,
    features,
    location,
    searchRadius,
    selectedPlaceGeo,
  ]);

  useEffect(() => {
    syncDraftFromApplied();
  }, [showFilters, syncDraftFromApplied]);

  // Re-sync filters whenever the URL query string changes (e.g. user clicks a
  // category chip after already being on /buy). Depend on the stringified
  // search params so the effect actually re-runs on URL change.
  const searchKey = searchParams.toString();

  useEffect(() => {
    const key = searchParams.toString();
    if (key) {
      stableFilterKeyRef.current = key;
      if (filterKeyOverride !== null && key === filterKeyOverride) {
        setFilterKeyOverride(null);
      }
    }
  }, [searchKey, searchParams, filterKeyOverride]);

  const effectiveFilterKey =
    filterKeyOverride ?? (searchKey || stableFilterKeyRef.current);

  const prevListingPathRef = useRef(pathname);
  useEffect(() => {
    if (prevListingPathRef.current !== pathname) {
      window.scrollTo(0, 0);
      prevListingPathRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (skipUrlHydrationRef.current) {
      skipUrlHydrationRef.current = false;
      return;
    }
    if (!searchParams.toString() && stableFilterKeyRef.current) {
      return;
    }
    const qParam = searchParams.get("q") || "";
    const categoryParam = searchParams.get("category") || "All";
    const typeParam = searchParams.get("type") || defaultType || "Any";
    const minPriceRaw = searchParams.get("minPrice");
    const maxPriceRaw = searchParams.get("maxPrice");
    setQ(qParam);
    setSearchInput(qParam);
    setCategory(categoryParam);
    setType(typeParam);
    setTypeFilters({
      ...DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
      ...readTypeSearchFiltersFromUrlParams(searchParams),
    });
    const featuresRaw = searchParams.get("features");
    setFeatures(
      featuresRaw
        ? featuresRaw
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n))
        : [],
    );
    if (minPriceRaw !== null || maxPriceRaw !== null) {
      const min = minPriceRaw !== null ? Math.max(0, Number(minPriceRaw) || 0) : 0;
      const max = maxPriceRaw !== null ? Math.max(min, Number(maxPriceRaw) || 5000000) : 5000000;
      setPrice([min, max]);
    }
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const locParam = searchParams.get("location");
    const r = searchParams.get("radius");

    if (locParam) {
      // URL-driven (e.g. navbar global selection) — reflect it, but do NOT
      // persist a section override; the global pref already carries it.
      if (r) setSearchRadius(r);
      setLocation(locParam);
      if (locParam === CURRENT_LOCATION_VALUE) {
        setAutoCurrentLocationDismissed(false);
        if (!latParam || !lngParam) {
          setPendingCurrentLocation(true);
        }
      } else {
        setAutoCurrentLocationDismissed(true);
      }
      if (latParam && lngParam) {
        const lat = Number(latParam);
        const lng = Number(lngParam);
        const geo =
          Number.isFinite(lat) && Number.isFinite(lng)
            ? { latitude: lat, longitude: lng }
            : null;
        selectedPlaceGeoRef.current = geo;
        setSelectedPlaceGeo(geo);
      } else {
        selectedPlaceGeoRef.current = null;
        setSelectedPlaceGeo(null);
      }
    } else if (latParam && lngParam) {
      if (r) setSearchRadius(r);
      setLocation(CURRENT_LOCATION_VALUE);
      setAutoCurrentLocationDismissed(false);
    } else if (urlHasNonLocationFilters(searchParams)) {
      setLocation("Any");
      setSearchRadius(r || String(defaultRadiusKm));
      setAutoCurrentLocationDismissed(true);
      selectedPlaceGeoRef.current = null;
      setSelectedPlaceGeo(null);
    } else {
      // Bare page visit — restore this section's saved location preference.
      const resolved =
        readSectionLocationPrefs(listingSection) ?? readGlobalLocationPrefs();
      if (resolved) {
        setLocation(resolved.location);
        setSearchRadius(resolved.searchRadius);
        setAutoCurrentLocationDismissed(resolved.autoCurrentLocationDismissed);
        const geo =
          resolved.latitude != null && resolved.longitude != null
            ? { latitude: resolved.latitude, longitude: resolved.longitude }
            : null;
        selectedPlaceGeoRef.current = geo;
        setSelectedPlaceGeo(geo);
        const hasGeoInUrl =
          searchParams.get("lat") &&
          searchParams.get("lng") &&
          searchParams.get("location");
        if (
          geo &&
          resolved.location !== "Any" &&
          !hasGeoInUrl &&
          !pendingFilterParamsRef.current
        ) {
          const params = mergeNavigationSearchParams(searchParams, null);
          params.set("lat", String(geo.latitude));
          params.set("lng", String(geo.longitude));
          params.set("radius", resolved.searchRadius);
          params.set("location", resolved.location);
          const qs = params.toString();
          stableFilterKeyRef.current = qs;
          setFilterKeyOverride(qs);
          pendingFilterParamsRef.current = qs;
          skipUrlHydrationRef.current = true;
          navigate(buildAppPath(pathname, qs), { replace: true });
        }
      } else {
        setLocation("Any");
        setSearchRadius(String(defaultRadiusKm));
        setAutoCurrentLocationDismissed(true);
        selectedPlaceGeoRef.current = null;
        setSelectedPlaceGeo(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, defaultType, listingSection]);

  const syncLocationToUrl = useCallback(
    (
      geo: { latitude: number; longitude: number } | null,
      options?: { locationLabel?: string; locationQuery?: string; radius?: string },
      baseParams?: URLSearchParams,
    ) => {
      if (!baseParams && pendingFilterParamsRef.current) return;
      const params = new URLSearchParams(
        mergeNavigationSearchParams(
          baseParams ?? searchParams,
          pendingFilterParamsRef.current,
        ).toString(),
      );
      const nextRadius = options?.radius ?? searchRadius;
      if (geo) {
        params.set("lat", String(geo.latitude));
        params.set("lng", String(geo.longitude));
        params.set("radius", nextRadius);
        if (options?.locationLabel) {
          params.set("location", options.locationLabel);
        } else {
          params.delete("location");
        }
      } else {
        params.delete("lat");
        params.delete("lng");
        params.delete("radius");
        if (options?.locationQuery) {
          params.set("location", options.locationQuery);
        } else {
          params.delete("location");
        }
      }
      const qs = params.toString();
      pendingFilterParamsRef.current = qs || null;
      stableFilterKeyRef.current = qs;
      setFilterKeyOverride(qs);
      navigate(buildAppPath(pathname, qs), { replace: true });
    },
    [searchParams, searchRadius, pathname, navigate],
  );

  useEffect(() => {
    if (!pendingCurrentLocation || !coords || pendingFilterParamsRef.current) return;
    setLocation(CURRENT_LOCATION_VALUE);
    setAutoCurrentLocationDismissed(false);
    persistSectionLocationPrefs({
      location: CURRENT_LOCATION_VALUE,
      searchRadius,
      autoCurrentLocationDismissed: false,
    });
    setPendingCurrentLocation(false);
    const liveParams = mergeNavigationSearchParams(searchParams, pendingFilterParamsRef.current);
    if (!liveParams.get("lat") || !liveParams.get("lng")) {
      syncLocationToUrl(
        { latitude: coords.latitude, longitude: coords.longitude },
        undefined,
        liveParams,
      );
    }
  }, [pendingCurrentLocation, coords, persistSectionLocationPrefs, searchRadius, searchParams, syncLocationToUrl]);

  useEffect(() => {
    if (location !== CURRENT_LOCATION_VALUE || coords || !pendingCurrentLocation) return;
    if (locationStatus === "loading") return;
    void requestLocationForFilter().then((result) => {
      if (!result) setPendingCurrentLocation(false);
    });
  }, [location, coords, pendingCurrentLocation, locationStatus, requestLocationForFilter]);

  useEffect(() => {
    if (!firstVisitAutoFilterPending || !coords || pendingFilterParamsRef.current) return;
    if (urlHasNonLocationFilters(mergeNavigationSearchParams(searchParams, pendingFilterParamsRef.current))) {
      consumeFirstVisitAutoFilter();
      return;
    }
    const nextRadius = String(defaultRadiusKm);
    setLocation(CURRENT_LOCATION_VALUE);
    setSearchRadius(nextRadius);
    setAutoCurrentLocationDismissed(false);
    persistSectionLocationPrefs({
      location: CURRENT_LOCATION_VALUE,
      searchRadius: nextRadius,
      autoCurrentLocationDismissed: false,
    });
    setNavbarToCurrentLocation(defaultRadiusKm, {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    syncLocationToUrl(
      { latitude: coords.latitude, longitude: coords.longitude },
      { radius: nextRadius },
      mergeNavigationSearchParams(searchParams, null),
    );
    consumeFirstVisitAutoFilter();
  }, [
    firstVisitAutoFilterPending,
    coords,
    defaultRadiusKm,
    persistSectionLocationPrefs,
    syncLocationToUrl,
    consumeFirstVisitAutoFilter,
  ]);

  const typeFlags = useMemo(
    () =>
      category === "All"
        ? DEFAULT_PROPERTY_TYPE_FLAGS
        : findPropertyTypeFlags(propertyTypesData?.results, category),
    [category, propertyTypesData?.results],
  );

  const draftPropertyForFilter =
    normalizePropertyForType(draftType) === "For Rent"
      ? ("rent" as const)
      : normalizePropertyForType(draftType) === "For Sale"
        ? ("sell" as const)
        : defaultType === "For Rent"
          ? ("rent" as const)
          : defaultType === "For Sale"
            ? ("sell" as const)
            : undefined;

  const draftCategoryOptions = useMemo(() => {
    const names = propertyTypesData?.results?.map((t) => t.name) ?? [];
    const options = ["All", ...names];
    if (draftCategory !== "All" && !names.includes(draftCategory)) options.push(draftCategory);
    return options;
  }, [propertyTypesData, draftCategory]);

  const draftTypeFlags = useMemo(
    () =>
      draftCategory === "All"
        ? DEFAULT_PROPERTY_TYPE_FLAGS
        : findPropertyTypeFlags(propertyTypesData?.results, draftCategory),
    [draftCategory, propertyTypesData?.results],
  );

  const handleDraftCategoryChange = useCallback(
    (value: string) => {
      setDraftCategory(value);
      const flags =
        value === "All"
          ? DEFAULT_PROPERTY_TYPE_FLAGS
          : findPropertyTypeFlags(propertyTypesData?.results, value);
      setDraftTypeFilters((prev) => ({ ...prev, ...clearSearchFiltersForFlags(flags) }));
    },
    [propertyTypesData?.results],
  );

  const patchDraftTypeFilters = useCallback(
    (patch: Partial<PropertyTypeSearchFilterState>) => {
      setDraftTypeFilters((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const clearDraftLocation = useCallback(() => {
    draftPlaceGeoRef.current = null;
    setDraftSelectedPlaceGeo(null);
    draftLocationSearchCandidateRef.current = null;
    setDraftLocation("Any");
    setDraftSearchRadius(String(defaultRadiusKm));
  }, [defaultRadiusKm]);

  const handleDraftLocationSelect = useCallback(
    (selection: LocationSelection | null) => {
      draftLocationSearchCandidateRef.current = null;
      if (!selection || selection.source === "all") {
        clearDraftLocation();
        return;
      }
      if (selection.source === "current") {
        setDraftLocation(CURRENT_LOCATION_VALUE);
        void requestLocationForFilter();
        return;
      }
      setDraftLocation(selection.label);
      let geo: { latitude: number; longitude: number } | null = null;
      if (
        selection.latitude != null &&
        selection.longitude != null &&
        Number.isFinite(selection.latitude) &&
        Number.isFinite(selection.longitude)
      ) {
        geo = { latitude: selection.latitude, longitude: selection.longitude };
      } else {
        geo = locationCoordsByLabel.get(selection.label) ?? null;
      }
      draftPlaceGeoRef.current = geo;
      setDraftSelectedPlaceGeo(geo);
    },
    [clearDraftLocation, requestLocationForFilter, locationCoordsByLabel],
  );

  const handleDraftLocationSearchCandidateChange = useCallback((selection: LocationSelection | null) => {
    draftLocationSearchCandidateRef.current = selection;
  }, []);

  const draftLocationSelection = useMemo(
    () =>
      locationStringToSelection(draftLocation, {
        allValue: "Any",
        allLabel: "No location filter",
        currentLocationLabel: "My current location",
        latitude: draftSelectedPlaceGeo?.latitude,
        longitude: draftSelectedPlaceGeo?.longitude,
        source: draftSelectedPlaceGeo ? "osm" : undefined,
      }),
    [draftLocation, draftSelectedPlaceGeo],
  );

  const draftShowRadiusFilter = draftLocation !== "Any";
  const draftIsCurrentLocationFilter = draftLocation === CURRENT_LOCATION_VALUE;
  const draftHasPlaceCoordinates =
    draftLocation !== "Any" &&
    !draftIsCurrentLocationFilter &&
    (locationCoordsByLabel.has(draftLocation) || draftSelectedPlaceGeo != null);

  const queryFilterParams = useMemo(
    () => new URLSearchParams(effectiveFilterKey),
    [effectiveFilterKey],
  );

  const queryCategory = queryFilterParams.get("category") || "All";
  const queryType = normalizePropertyForType(
    queryFilterParams.get("type") || defaultType || "Any",
  );
  const queryTypeFlags = useMemo(
    () =>
      queryCategory === "All"
        ? DEFAULT_PROPERTY_TYPE_FLAGS
        : findPropertyTypeFlags(propertyTypesData?.results, queryCategory),
    [queryCategory, propertyTypesData?.results],
  );
  const queryTypeFilters = useMemo(
    () => ({
      ...DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
      ...readTypeSearchFiltersFromUrlParams(queryFilterParams),
    }),
    [effectiveFilterKey, queryFilterParams],
  );
  const queryTypeApiParams = useMemo(
    () => propertyTypeSearchListParams(queryTypeFlags, queryTypeFilters),
    [queryTypeFlags, queryTypeFilters],
  );
  const queryPropertyTypeId = useMemo(() => {
    if (queryCategory === "All") return undefined;
    const match = propertyTypesData?.results?.find(
      (t) => t.name.toLowerCase() === queryCategory.toLowerCase(),
    );
    return match?.id;
  }, [queryCategory, propertyTypesData]);
  const queryPrice = useMemo(() => {
    const minPriceRaw = queryFilterParams.get("minPrice");
    const maxPriceRaw = queryFilterParams.get("maxPrice");
    const min = minPriceRaw !== null ? Math.max(0, Number(minPriceRaw) || 0) : 0;
    const max =
      maxPriceRaw !== null ? Math.max(min, Number(maxPriceRaw) || 5000000) : 5000000;
    return [min, max] as const;
  }, [effectiveFilterKey, queryFilterParams]);
  const queryFeatures = useMemo(() => {
    const featuresRaw = queryFilterParams.get("features");
    return featuresRaw
      ? featuresRaw
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : [];
  }, [effectiveFilterKey, queryFilterParams]);
  const querySearch = queryFilterParams.get("q")?.trim() || "";

  const queryGeo = useMemo(() => {
    const loc = queryFilterParams.get("location");
    if (!loc || loc === "Any") return null;
    const lat = Number(queryFilterParams.get("lat"));
    const lng = Number(queryFilterParams.get("lng"));
    const radius = Number(queryFilterParams.get("radius")) || defaultRadiusKm;
    const radiusKm = Number.isFinite(radius) ? radius : defaultRadiusKm;
    if (loc === CURRENT_LOCATION_VALUE) {
      const source =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? { latitude: lat, longitude: lng }
          : coords
            ? { latitude: coords.latitude, longitude: coords.longitude }
            : null;
      if (!source) return null;
      return { ...source, radius: radiusKm };
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng, radius: radiusKm };
    }
    const place = locationCoordsByLabel.get(loc);
    if (place) {
      return { latitude: place.latitude, longitude: place.longitude, radius: radiusKm };
    }
    return null;
  }, [effectiveFilterKey, queryFilterParams, coords, defaultRadiusKm, locationCoordsByLabel]);

  const queryTextLocation = queryGeo
    ? undefined
    : getLocationSearchValue(queryFilterParams.get("location") || "");

  const listFilters = useMemo(
    () => ({
      page,
      pageSize,
      search: querySearch || undefined,
      propertyFor:
        queryType === "For Rent"
          ? ("rent" as const)
          : queryType === "For Sale"
            ? ("sell" as const)
            : defaultType === "For Rent"
              ? ("rent" as const)
              : defaultType === "For Sale"
                ? ("sell" as const)
                : undefined,
      priceMin: queryPrice[0] > 0 ? queryPrice[0] : undefined,
      priceMax: queryPrice[1] < 5000000 ? queryPrice[1] : undefined,
      propertyType: queryPropertyTypeId,
      bedroomsMin: queryTypeApiParams.bedrooms_min as number | undefined,
      bedroomsMax: queryTypeApiParams.bedrooms_max as number | undefined,
      bathroomsMin: queryTypeApiParams.bathrooms_min as number | undefined,
      bathroomsMax: queryTypeApiParams.bathrooms_max as number | undefined,
      areaMin: queryTypeApiParams.area_min as string | number | undefined,
      areaMax: queryTypeApiParams.area_max as string | number | undefined,
      areaUnit: queryTypeApiParams.area_unit as string | undefined,
      areaCentMin: queryTypeApiParams.area_cent_min as string | number | undefined,
      areaCentMax: queryTypeApiParams.area_cent_max as string | number | undefined,
      furnishing: queryTypeApiParams.furnishing as string | undefined,
      parkingSpacesMin: queryTypeApiParams.parking_spaces_min as number | undefined,
      projectStatus: queryTypeApiParams.project_status as string | undefined,
      floors: queryTypeApiParams.floors as string | undefined,
      sighting: queryTypeApiParams.sighting as string | undefined,
      features: queryFeatures.length ? queryFeatures : undefined,
      location: queryGeo ? undefined : queryTextLocation,
      latitude: queryGeo?.latitude,
      longitude: queryGeo?.longitude,
      radius: queryGeo?.radius,
      includeAds: true,
      ordering:
        sort === "low"
          ? "price"
          : sort === "high"
            ? "-price"
            : queryGeo && sort === "newest"
              ? "distance"
              : "-created_at",
    }),
    [
      page,
      pageSize,
      querySearch,
      queryType,
      defaultType,
      queryPrice,
      queryPropertyTypeId,
      queryTypeApiParams,
      queryFeatures,
      queryTextLocation,
      queryGeo,
      sort,
    ],
  );

  const { data, isLoading, isError, isFetching } = usePropertyList(
    listFilters,
    {
      keepPreviousPage: false,
      staleTime: 0,
    },
  );

  const listSettling = isLoading && !data;
  const isFilterRefreshing = isFetching && Boolean(data);

  useEffect(() => {
    setPage(1);
  }, [effectiveFilterKey, sort, pageSize]);

  const toggleDraftFeature = (f: number) =>
    setDraftFeatures((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const handleDraftPriceRange = (value: string) => {
    setDraftPriceRange(value);
    const opt = PRICE_RANGES.find((o) => o.value === value);
    if (opt) setDraftPrice([opt.min, opt.max]);
  };

  const navigateListingFilters = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      pendingFilterParamsRef.current = qs || null;
      stableFilterKeyRef.current = qs;
      setFilterKeyOverride(qs);
      skipUrlHydrationRef.current = true;
      navigate(buildAppPath(pathname, qs), { replace: true });
      setPage(1);
    },
    [pathname, navigate],
  );

  const commitSearch = useCallback(() => {
    const nextQ = searchInput.trim();
    setQ(nextQ);
    const params = new URLSearchParams(effectiveFilterKey);
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    navigateListingFilters(params);
  }, [searchInput, effectiveFilterKey, navigateListingFilters]);

  const applyFilters = () => {
    const nextQ = searchInput.trim();
    const nextCategory = draftCategory;
    const nextType = normalizePropertyForType(draftType);
    const nextTypeFilters = { ...draftTypeFilters };
    const nextPrice = [...draftPrice];
    const nextFeatures = [...draftFeatures];
    const nextLocation = draftLocation;
    const nextSearchRadius = draftSearchRadius;
    const nextSelectedPlaceGeo = draftSelectedPlaceGeo;
    const nextTypeFlags =
      nextCategory === "All"
        ? DEFAULT_PROPERTY_TYPE_FLAGS
        : findPropertyTypeFlags(propertyTypesData?.results, nextCategory);

    selectedPlaceGeoRef.current = draftPlaceGeoRef.current;
    setSelectedPlaceGeo(nextSelectedPlaceGeo);
    locationSearchCandidateRef.current = draftLocationSearchCandidateRef.current;

    setQ(nextQ);
    setCategory(nextCategory);
    setType(nextType);
    setTypeFilters(nextTypeFilters);
    setPrice(nextPrice);
    setPriceRange(draftPriceRange);
    setFeatures(nextFeatures);
    setLocation(nextLocation);
    setSearchRadius(nextSearchRadius);
    setPage(1);

    if (nextLocation === CURRENT_LOCATION_VALUE) {
      if (coords) setPendingCurrentLocation(false);
      else setPendingCurrentLocation(true);
    } else {
      setPendingCurrentLocation(false);
    }

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextCategory !== "All") params.set("category", nextCategory);
    if (nextType !== "Any") params.set("type", nextType);
    if (nextPrice[0] > 0) params.set("minPrice", String(nextPrice[0]));
    if (nextPrice[1] < 5000000) params.set("maxPrice", String(nextPrice[1]));
    if (nextFeatures.length) params.set("features", nextFeatures.join(","));
    replaceTypeSearchFiltersInUrlParams(params, nextTypeFlags, nextTypeFilters);

    if (nextLocation === CURRENT_LOCATION_VALUE && coords) {
      params.set("lat", String(coords.latitude));
      params.set("lng", String(coords.longitude));
      params.set("radius", nextSearchRadius);
      params.set("location", CURRENT_LOCATION_VALUE);
      setAutoCurrentLocationDismissed(false);
      persistSectionLocationPrefs({
        location: CURRENT_LOCATION_VALUE,
        searchRadius: nextSearchRadius,
        autoCurrentLocationDismissed: false,
      });
    } else if (nextLocation === CURRENT_LOCATION_VALUE && !coords) {
      setAutoCurrentLocationDismissed(false);
      params.delete("lat");
      params.delete("lng");
      params.delete("radius");
      params.delete("location");
    } else if (nextLocation === "Any" && draftLocationSearchCandidateRef.current) {
      const candidate = draftLocationSearchCandidateRef.current;
      const latitude = candidate.latitude;
      const longitude = candidate.longitude;
      if (
        latitude != null &&
        longitude != null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        params.set("lat", String(latitude));
        params.set("lng", String(longitude));
        params.set("radius", nextSearchRadius);
        params.set("location", candidate.label);
        setAutoCurrentLocationDismissed(true);
        persistSectionLocationPrefs({
          location: candidate.label,
          searchRadius: nextSearchRadius,
          autoCurrentLocationDismissed: true,
          latitude,
          longitude,
        });
      }
    } else if (nextLocation !== "Any" && nextLocation !== CURRENT_LOCATION_VALUE) {
      const place =
        draftPlaceGeoRef.current ??
        nextSelectedPlaceGeo ??
        locationCoordsByLabel.get(nextLocation);
      if (place) {
        params.set("lat", String(place.latitude));
        params.set("lng", String(place.longitude));
        params.set("radius", nextSearchRadius);
        params.set("location", nextLocation);
      } else {
        const locationQuery = getLocationSearchValue(nextLocation);
        if (locationQuery) params.set("location", locationQuery);
      }
      setAutoCurrentLocationDismissed(true);
      persistSectionLocationPrefs({
        location: nextLocation,
        searchRadius: nextSearchRadius,
        autoCurrentLocationDismissed: true,
        latitude: place?.latitude,
        longitude: place?.longitude,
      });
    } else {
      params.delete("lat");
      params.delete("lng");
      params.delete("radius");
      params.delete("location");
      setAutoCurrentLocationDismissed(true);
      persistSectionLocationPrefs({
        location: "Any",
        searchRadius: nextSearchRadius,
        autoCurrentLocationDismissed: true,
      });
    }

    skipUrlHydrationRef.current = true;
    consumeFirstVisitAutoFilter();
    navigateListingFilters(params);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setQ("");
    setSearchInput("");
    setSelectedPlaceGeo(null);
    selectedPlaceGeoRef.current = null;
    locationSearchCandidateRef.current = null;
    draftPlaceGeoRef.current = null;
    setDraftSelectedPlaceGeo(null);
    draftLocationSearchCandidateRef.current = null;
    const nextRadius = String(defaultRadiusKm);
    setLocation("Any");
    setSearchRadius(nextRadius);
    setDraftLocation("Any");
    setDraftSearchRadius(nextRadius);
    setAutoCurrentLocationDismissed(true);
    setCategory("All");
    setDraftCategory("All");
    setType("Any");
    setDraftType("Any");
    setTypeFilters(DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS);
    setDraftTypeFilters(DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS);
    setPrice([0, 5000000]);
    setDraftPrice([0, 5000000]);
    setPriceRange("any");
    setDraftPriceRange("any");
    setFeatures([]);
    setDraftFeatures([]);
    setPage(1);
    writeSectionLocationPrefs(listingSection, {
      location: "Any",
      searchRadius: nextRadius,
      autoCurrentLocationDismissed: true,
    });
    setNavbarToAllLocations(defaultRadiusKm);
    setPendingCurrentLocation(false);
    pendingFilterParamsRef.current = null;
    stableFilterKeyRef.current = "";
    setFilterKeyOverride("");
    skipUrlHydrationRef.current = true;
    navigate(buildAppPath(pathname), { replace: true });
    void queryClient.invalidateQueries({ queryKey: ["properties"] });
  };

  const feedItems = listSettling ? [] : (data?.items ?? []);
  const propertyCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(propertyCount / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const activeFilterChips = useMemo(
    () =>
      buildActiveListingFilterChips({
        q: querySearch,
        category: queryCategory,
        type: queryType,
        defaultType,
        location:
          queryFilterParams.get("location") ||
          (queryFilterParams.get("lat") ? CURRENT_LOCATION_VALUE : "Any"),
        searchRadius: queryFilterParams.get("radius") || String(defaultRadiusKm),
        price: [...queryPrice],
        priceRange,
        features: queryFeatures,
        featureOptions,
        typeFlags: queryTypeFlags,
        typeFilters: queryTypeFilters,
      }),
    [
      querySearch,
      queryCategory,
      queryType,
      defaultType,
      queryFilterParams,
      defaultRadiusKm,
      queryPrice,
      priceRange,
      queryFeatures,
      featureOptions,
      queryTypeFlags,
      queryTypeFilters,
    ],
  );

  const gridSlots = feedItems;
  const mobileSlots = feedItems;

  const pageButtons = (() => {
    const max = totalPages;
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
    const s = new Set<number>([1, max, safePage, safePage - 1, safePage + 1]);
    const arr = Array.from(s).filter((n) => n >= 1 && n <= max).sort((a, b) => a - b);
    return arr;
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-black text-white py-7 sm:py-12 md:py-16">
        <RevealOnScroll className="container">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white">Listings</div>
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl mt-1.5 sm:mt-3 text-white">Browse properties</h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/85 max-w-2xl">Filter by location, price, and features. Switch to map view for nearby search.</p>
        </RevealOnScroll>
      </section>

      <section className="container py-12">
        <RevealOnScroll className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
            <div className="flex items-stretch gap-2 md:grid md:grid-cols-[1fr_auto_auto] md:gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#0e305d] md:h-4 md:w-4" />
                <Input
                  className="h-[38px] min-w-0 flex-1 pl-9 text-[12px] md:h-12 md:pl-10 md:text-sm"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitSearch();
                  }}
                  placeholder="Search by location, property name, or keyword"
                />
              </div>
              <Button className="h-[38px] w-[38px] shrink-0 rounded-[12px] px-0 md:h-12 md:w-auto md:px-7" variant="luxe" onClick={commitSearch} aria-label="Search">
                <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden md:inline">Search</span>
              </Button>
              <Button
                className="h-[38px] w-[38px] shrink-0 rounded-[12px] px-0 md:h-12 md:w-auto md:px-7"
                variant="outlineGold"
                onClick={() => setShowFilters(true)}
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden md:inline">Show Filters</span>
              </Button>
            </div>
          </div>

          <ActiveListingFiltersBar
            chips={activeFilterChips}
            onClearAll={resetFilters}
          />

          {isMobile ? (
            <Drawer open={showFilters} onOpenChange={setShowFilters}>
              <DrawerContent className="bottom-[60px] z-50 mt-0 max-h-[calc(100dvh-5rem)] rounded-t-3xl">
                <div className="flex shrink-0 items-center justify-between px-5 pb-2.5 pt-1.5">
                  <DrawerTitle className="text-lg font-semibold tracking-tight text-foreground">
                    Filter Properties
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    Refine your property search by location, type, rooms, price, and features.
                  </DrawerDescription>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-sm font-semibold text-[#1c5fa8] transition active:opacity-60"
                  >
                    Reset
                  </button>
                </div>
                <div className="h-px shrink-0 bg-border/70" />

                <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
                  {/* Location */}
                  <div>
                    <Label className={mobileFilterLabelClass}>Location</Label>
                    <LocationSearchSelect
                      instanceId="properties-mobile-filter-location"
                      value={draftLocationSelection}
                      onChange={handleDraftLocationSelect}
                      onSearchCandidateChange={handleDraftLocationSearchCandidateChange}
                      propertyFor={draftPropertyForFilter}
                      variant="modal"
                      allValue="Any"
                      allLabel="No location filter"
                      currentLocationLabel="My current location"
                      placeholder="Select location"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDraftLocationSelect(
                        locationStringToSelection(CURRENT_LOCATION_VALUE, {
                          currentLocationLabel: "My current location",
                        }),
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1c5fa8]/60 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1c5fa8] transition hover:bg-[#1c5fa8]/5 active:scale-[0.99]"
                  >
                    <LocateFixed className="h-4 w-4" /> Use my current location
                  </button>

                  {draftShowRadiusFilter && (
                    <div>
                      <Label className={mobileFilterLabelClass}>Search Radius</Label>
                      <Select value={draftSearchRadius} onValueChange={setDraftSearchRadius}>
                        <SelectTrigger className="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]">
                          <SelectValue placeholder="Within 10 km" />
                        </SelectTrigger>
                        <SelectContent>
                          {RADIUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Property For */}
                  <div>
                    <Label className={mobileFilterLabelClass}>Property For</Label>
                    <div className="flex gap-2.5">
                      {PROPERTY_FOR_PILLS.map((p) => (
                        <FilterChip
                          key={p.value}
                          active={draftType === p.value}
                          onClick={() => setDraftType(p.value)}
                          className="flex-1"
                        >
                          {p.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  {/* Property Type */}
                  <div>
                    <Label className={mobileFilterLabelClass}>Property Type</Label>
                    <Select value={draftCategory} onValueChange={handleDraftCategoryChange}>
                      <SelectTrigger className="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        {draftCategoryOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c === "All" ? "All types" : c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <PropertyTypeRoomSearchFields
                    typeFlags={draftTypeFlags}
                    filters={draftTypeFilters}
                    onChange={patchDraftTypeFilters}
                    labelClassName={mobileFilterLabelClass}
                    triggerClassName="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"
                    sectionLabelClassName={mobileFilterLabelClass}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <PropertyTypeSearchFields
                      typeFlags={draftTypeFlags}
                      filters={draftTypeFilters}
                      onChange={patchDraftTypeFilters}
                      hideRoomFilters
                      labelClassName={mobileFilterLabelClass}
                      triggerClassName="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"
                      inputClassName="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"
                    />
                  </div>

                  {/* Price Range */}
                  <div>
                    <Label className={mobileFilterLabelClass}>Price Range</Label>
                    <Select value={draftPriceRange} onValueChange={handleDraftPriceRange}>
                      <SelectTrigger className="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]">
                        <SelectValue placeholder="Any price" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_RANGES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Features */}
                  <div>
                    <Label className={mobileFilterLabelClass}>Features</Label>
                    <FeaturesField options={featureOptions} selected={draftFeatures} onToggle={toggleDraftFeature} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/70 px-4 py-3">
                  <Button
                    type="button"
                    onClick={applyFilters}
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-[#0e305d] to-[#2f7bc4] text-base font-semibold text-white shadow-[0_12px_24px_-12px_rgba(14,48,93,0.85)] transition hover:opacity-95 active:scale-[0.99]"
                  >
                    Apply Filters
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
          <Dialog open={showFilters} onOpenChange={setShowFilters}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl gap-0 overflow-hidden rounded-3xl border-white/70 bg-white p-0 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.45)] sm:w-[calc(100vw-3rem)]">
              <DialogHeader className="border-b border-border/70 px-5 pb-4 pt-5 text-left md:px-7 md:pt-6">
                <DialogTitle className="font-serif text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                  Refine your search
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground md:text-sm">
                  Choose location, search radius, category, type, price, and features.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[calc(90vh-176px)] overflow-y-auto px-5 py-5 md:px-7 md:py-6">
                <div className="space-y-5 md:space-y-6">
                  {/* LOCATION — full width */}
                  <div>
                    <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]">
                      Location
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <LocationSearchSelect
                          instanceId="properties-desktop-filter-location"
                          value={draftLocationSelection}
                          onChange={handleDraftLocationSelect}
                          onSearchCandidateChange={handleDraftLocationSearchCandidateChange}
                          propertyFor={draftPropertyForFilter}
                          variant="modal"
                          allValue="Any"
                          allLabel="No location filter"
                          currentLocationLabel="My current location"
                          placeholder="Select or search a location"
                        />
                      </div>
                      {draftLocation !== "Any" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 shrink-0 rounded-xl px-3"
                          aria-label="Clear location filter"
                          onClick={clearDraftLocation}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {draftIsCurrentLocationFilter && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Showing properties within {draftSearchRadius} km of your current location
                        {!coords ? " — allow location access to apply this filter" : ""}
                      </p>
                    )}
                    {draftLocation !== "Any" && !draftIsCurrentLocationFilter && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {draftHasPlaceCoordinates
                          ? `Showing properties within ${draftSearchRadius} km of ${draftLocation}`
                          : `Matching properties in ${draftLocation}`}
                      </p>
                    )}
                  </div>

                  {draftShowRadiusFilter && (
                    <div>
                      <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]">
                        Search Radius
                      </Label>
                      <Select value={draftSearchRadius} onValueChange={setDraftSearchRadius}>
                        <SelectTrigger className="h-12 rounded-xl border-border bg-white text-left text-[hsl(30_14%_20%)]">
                          <SelectValue placeholder="Within 10 km" />
                        </SelectTrigger>
                        <SelectContent>
                          {RADIUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* CATEGORY | TYPE */}
                  <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
                    <div>
                      <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]">
                        Category
                      </Label>
                      <Select value={draftCategory} onValueChange={handleDraftCategoryChange}>
                        <SelectTrigger className="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"><SelectValue /></SelectTrigger>
                        <SelectContent>{draftCategoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]">
                        Type
                      </Label>
                      <Select value={draftType} onValueChange={setDraftType}>
                        <SelectTrigger className="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Any">Any</SelectItem>
                          <SelectItem value="For Sale">For Sale</SelectItem>
                          <SelectItem value="For Rent">For Rent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <PropertyTypeRoomSearchFields
                    typeFlags={draftTypeFlags}
                    filters={draftTypeFilters}
                    onChange={patchDraftTypeFilters}
                    labelClassName="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]"
                    triggerClassName="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"
                    sectionLabelClassName="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]"
                  />

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5">
                    <PropertyTypeSearchFields
                      typeFlags={draftTypeFlags}
                      filters={draftTypeFilters}
                      onChange={patchDraftTypeFilters}
                      hideRoomFilters
                      labelClassName="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]"
                      triggerClassName="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"
                      inputClassName="h-12 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]"
                    />
                  </div>

                  {/* PRICE RANGE — full width */}
                  <div>
                    <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]">
                      Price Range
                    </Label>
                    <Select value={draftPriceRange} onValueChange={handleDraftPriceRange}>
                      <SelectTrigger className="h-12 rounded-xl border-border bg-white text-left text-[hsl(30_14%_20%)]">
                        <SelectValue placeholder="Any price" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_RANGES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* FEATURES — pills with circle indicators */}
                  <div>
                    <Label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]">
                      Features
                    </Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {featureOptions.map((opt) => {
                        const active = draftFeatures.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleDraftFeature(opt.id)}
                            aria-pressed={active}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-sm font-medium transition-all",
                              active
                                ? "border-[#1c5fa8] text-[#0e305d] shadow-[0_0_0_3px_rgba(28,95,168,0.12)]"
                                : "border-border text-foreground/80 hover:border-foreground/30",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                                active ? "border-[#1c5fa8] bg-[#1c5fa8]" : "border-foreground/30 bg-white",
                              )}
                            >
                              {active && <span className="h-2 w-2 rounded-full bg-white" />}
                            </span>
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border/70 bg-white px-5 py-4 md:px-7">
                <Button
                  type="button"
                  className="h-11 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground hover:bg-muted"
                  onClick={resetFilters}
                >
                  Reset filters
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-[#1c5fa8] px-6 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(28,95,168,0.7)] hover:bg-[#0e305d]"
                  onClick={applyFilters}
                >
                  Apply filters
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}

          <div className={cn(isFilterRefreshing && "opacity-60 transition-opacity duration-200")}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <span className={cn("text-lg font-normal", isFilterRefreshing && "animate-pulse")}>{listSettling ? "…" : propertyCount}</span>
              <span className="text-muted-foreground ml-2">properties found</span>
            </div>
          </div>

          {/* Mobile: 2-column grid with vertical scroll */}
          <div className="md:hidden">
            {listSettling ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MobilePropertyCardSkeleton key={i} />
                ))}
              </div>
            ) : isError || feedItems.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-2xl border border-dashed">
                <p className="text-muted-foreground">No properties match your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mobileSlots.map((slot, i) => {
                  if (slot.kind === "ad") {
                    return (
                      <MobileAdvertisementCard
                        key={`ad-${slot.ad.id}-${i}`}
                        ad={slot.ad}
                        index={i}
                      />
                    );
                  }
                  return (
                    <MobilePropertyCard
                      key={slot.property.id}
                      property={slot.property}
                      index={i}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop / tablet: grid view */}
          <div className="hidden md:block">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listSettling
                ? Array.from({ length: pageSize }).map((_, i) => (
                    <PropertyCardSkeleton key={i} />
                  ))
                : gridSlots.map((slot, i) =>
                slot.kind === "property" ? (
                  <PropertyCard key={`p-${slot.property.id}`} property={slot.property} index={i} />
                ) : (
                  <AdvertisementCard key={`ad-${slot.ad.id}-${i}`} ad={slot.ad} index={i} />
                ),
              )}
              {!listSettling && feedItems.length === 0 && (
                <div className="col-span-full p-16 text-center bg-card rounded-2xl border border-dashed">
                  <p className="text-muted-foreground">No properties match your filters.</p>
                </div>
              )}
            </div>
          </div>

          {propertyCount > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              {/* Left — results-per-page selector */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Results per page:</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-9 w-[78px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="hidden sm:inline ml-3">
                  Showing <span className="text-foreground font-medium">{(safePage - 1) * pageSize + 1}</span>–<span className="text-foreground font-medium">{Math.min(safePage * pageSize, propertyCount)}</span> of{" "}
                  <span className="text-foreground font-medium">{propertyCount}</span>
                </span>
              </div>

              {/* Right — pagination buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-foreground/70 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {pageButtons.map((p, idx) => {
                  const prev = pageButtons[idx - 1];
                  const needsDots = prev != null && p - prev > 1;
                  return (
                    <span key={p} className="inline-flex items-center gap-1.5">
                      {needsDots ? <span className="px-1 text-muted-foreground">…</span> : null}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === safePage ? "page" : undefined}
                        aria-label={`Go to page ${p}`}
                        className={cn(
                          "h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition",
                          p === safePage
                            ? "bg-gold text-white shadow-sm"
                            : "border border-border bg-white text-foreground/80 hover:bg-muted",
                        )}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-foreground/70 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        </RevealOnScroll>
      </section>

      <Footer />
    </div>
  );
};

export default Properties;
