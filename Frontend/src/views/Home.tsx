"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, buildAppPath } from "@/lib/router";
import {
  ArrowRight,
  Bath,
  Bed,
  Check,
  ChevronRight,
  MapPin,
  Maximize,
  Quote,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { ListPropertyCta } from "@/components/ListPropertyCta";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyCard } from "@/components/PropertyCard";
import { CountUp } from "@/components/CountUp";
import { usePropertyList, usePropertyLocations } from "@/hooks/api/useProperties";
import { useHeroBanners, usePropertyTypes, useTestimonials, useFeatures } from "@/hooks/api/useCatalog";
import { useUserLocation } from "@/context/UserLocationContext";
import { isBrowserReload } from "@/lib/browserReload";
import { imageSrc } from "@/lib/image";
import {
  CURRENT_LOCATION_VALUE,
  DEFAULT_PROPERTY_FILTER_RADIUS_KM,
  RADIUS_OPTIONS,
  buildLocationCoordsMap,
  getLocationSearchValue,
} from "@/lib/locationFilter";
import {
  LocationSearchSelect,
  locationStringToSelection,
  type LocationSelection,
} from "@/components/LocationSearchSelect";
import {
  defaultSectionLocationPrefs,
  readSectionLocationPrefs,
  writeSectionLocationPrefs,
  type SectionLocationPrefs,
} from "@/lib/listingFilterStorage";
import {
  appendTypeSearchFiltersToUrlParams,
  clearSearchFiltersForFlags,
  DEFAULT_PROPERTY_TYPE_FLAGS,
  DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
  findPropertyTypeFlags,
  type PropertyTypeSearchFilterState,
} from "@/lib/api/propertyForm";
import { formatAreaList, normalizeAreaList } from "@/lib/api/mappers/property";
import {
  PropertyTypeRoomSearchFields,
  PropertyTypeSearchFields,
} from "@/components/PropertyTypeSearchFields";

const HERO_FALLBACK = "/new%20banner.png";

const ALL_CATEGORY_IMAGE = "/heromain.png";

type FeaturePill = { id: number; name: string };

const PRICE_OPTIONS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: "any", label: "Any price" },
  { value: "0-500000", label: "Under ₹5 Lakh", min: 0, max: 500000 },
  { value: "500000-1000000", label: "₹5 Lakh – ₹10 Lakh", min: 500000, max: 1000000 },
  { value: "1000000-2500000", label: "₹10 Lakh – ₹25 Lakh", min: 1000000, max: 2500000 },
  { value: "2500000-5000000", label: "₹25 Lakh – ₹50 Lakh", min: 2500000, max: 5000000 },
  { value: "5000000-", label: "₹50 Lakh+", min: 5000000 },
];

const Home = () => {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<"buy" | "rent">("buy");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("Any");
  const [selectedPlaceGeo, setSelectedPlaceGeo] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const selectedPlaceGeoRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const locationSearchCandidateRef = useRef<LocationSelection | null>(null);
  const [searchRadius, setSearchRadius] = useState(String(DEFAULT_PROPERTY_FILTER_RADIUS_KM));
  const [autoCurrentLocationDismissed, setAutoCurrentLocationDismissed] = useState(true);
  const [pendingCurrentLocation, setPendingCurrentLocation] = useState(false);
  const [cat, setCat] = useState("any");
  const [typeFilters, setTypeFilters] = useState<PropertyTypeSearchFilterState>(
    DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
  );
  const [features, setFeatures] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState("any");

  const { data: featuresData } = useFeatures();
  const featurePills = useMemo<FeaturePill[]>(() => {
    return (featuresData?.results ?? []).map((f) => ({ id: f.id, name: f.name }));
  }, [featuresData]);

  const toggleFeature = (id: number) =>
    setFeatures((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  const [showFilters, setShowFilters] = useState(false);
  const {
    coords,
    radiusKm,
    status,
    requestLocationForFilter,
    firstVisitAutoFilterPending,
    consumeFirstVisitAutoFilter,
  } = useUserLocation();

  const persistHomeLocationPrefs = useCallback((prefs: SectionLocationPrefs) => {
    writeSectionLocationPrefs("home", prefs);
  }, []);

  useEffect(() => {
    if (isBrowserReload()) {
      const defaults = defaultSectionLocationPrefs(radiusKm);
      setLocation(defaults.location);
      setSearchRadius(defaults.searchRadius);
      setAutoCurrentLocationDismissed(defaults.autoCurrentLocationDismissed);
      selectedPlaceGeoRef.current = null;
      setSelectedPlaceGeo(null);
      return;
    }
    const saved = readSectionLocationPrefs("home") ?? defaultSectionLocationPrefs(radiusKm);
    setLocation(saved.location);
    setSearchRadius(saved.searchRadius);
    setAutoCurrentLocationDismissed(saved.autoCurrentLocationDismissed);
    const geo =
      saved.latitude != null && saved.longitude != null
        ? { latitude: saved.latitude, longitude: saved.longitude }
        : null;
    selectedPlaceGeoRef.current = geo;
    setSelectedPlaceGeo(geo);
  }, [radiusKm]);

  const propertyForFilter = intent === "rent" ? ("rent" as const) : ("sell" as const);
  const { data: locationData } = usePropertyLocations({
    pageSize: 100,
    propertyFor: propertyForFilter,
  });
  const locationCoordsByLabel = useMemo(
    () => buildLocationCoordsMap(locationData?.results ?? []),
    [locationData?.results],
  );

  const featuredListParams = useMemo(
    () => ({
      pageSize: 6,
      featured: true,
    }),
    [],
  );

  const { data: featuredData } = usePropertyList(featuredListParams);
  const featured = (featuredData?.items ?? [])
    .filter((item) => item.kind === "property")
    .map((item) => item.property)
    .slice(0, 6);
  const { data: heroBanners } = useHeroBanners();
  const heroImage = heroBanners?.results.find((b) => b.image)?.image || HERO_FALLBACK;
  const { data: testimonialsData } = useTestimonials();
  const testimonials = testimonialsData?.results ?? [];
  const { data: propertyTypesData } = usePropertyTypes();
  const fmt = new Intl.NumberFormat("en-US");

  const typeFlags = useMemo(
    () =>
      cat === "any"
        ? DEFAULT_PROPERTY_TYPE_FLAGS
        : findPropertyTypeFlags(propertyTypesData?.results, cat),
    [cat, propertyTypesData?.results],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCat(value);
      const flags =
        value === "any"
          ? DEFAULT_PROPERTY_TYPE_FLAGS
          : findPropertyTypeFlags(propertyTypesData?.results, value);
      setTypeFilters((prev) => ({ ...prev, ...clearSearchFiltersForFlags(flags) }));
    },
    [propertyTypesData?.results],
  );

  const patchTypeFilters = useCallback(
    (patch: Partial<PropertyTypeSearchFilterState>) => {
      setTypeFilters((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const locatingMe = status === "loading";
  const isCurrentLocationFilter = location === CURRENT_LOCATION_VALUE;
  const showRadiusFilter = location !== "Any";
  const hasPlaceCoordinates =
    location !== "Any" &&
    !isCurrentLocationFilter &&
    (locationCoordsByLabel.has(location) || selectedPlaceGeo != null);
  const textLocationQuery = getLocationSearchValue(location);

  const locationSelection = useMemo(
    () =>
      locationStringToSelection(location, {
        allValue: "Any",
        allLabel: "No location filter",
        currentLocationLabel: "My current location",
        latitude: selectedPlaceGeo?.latitude,
        longitude: selectedPlaceGeo?.longitude,
        source: selectedPlaceGeo ? "osm" : undefined,
      }),
    [location, selectedPlaceGeo],
  );

  const clearLocationFilter = useCallback(() => {
    const wasCurrentLocation = location === CURRENT_LOCATION_VALUE;
    setLocation("Any");
    setSelectedPlaceGeo(null);
    selectedPlaceGeoRef.current = null;
    locationSearchCandidateRef.current = null;
    if (wasCurrentLocation) {
      setAutoCurrentLocationDismissed(true);
    }
    persistHomeLocationPrefs({
      location: "Any",
      searchRadius,
      autoCurrentLocationDismissed: wasCurrentLocation ? true : autoCurrentLocationDismissed,
    });
  }, [location, searchRadius, autoCurrentLocationDismissed, persistHomeLocationPrefs]);

  const handleLocationSelect = useCallback(
    (selection: LocationSelection | null) => {
      locationSearchCandidateRef.current = null;
      if (!selection || selection.source === "all") {
        clearLocationFilter();
        return;
      }
      if (selection.source === "current") {
        setPendingCurrentLocation(true);
        void requestLocationForFilter().then((result) => {
          if (!result) {
            setPendingCurrentLocation(false);
          }
        });
        return;
      }
      setAutoCurrentLocationDismissed(true);
      setLocation(selection.label);
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
      selectedPlaceGeoRef.current = geo;
      setSelectedPlaceGeo(geo);
      persistHomeLocationPrefs({
        location: selection.label,
        searchRadius,
        autoCurrentLocationDismissed: true,
        latitude: geo?.latitude,
        longitude: geo?.longitude,
      });
    },
    [
      requestLocationForFilter,
      clearLocationFilter,
      persistHomeLocationPrefs,
      searchRadius,
      locationCoordsByLabel,
    ],
  );

  const handleLocationSearchCandidateChange = useCallback((selection: LocationSelection | null) => {
    locationSearchCandidateRef.current = selection;
  }, []);

  useEffect(() => {
    if (pendingCurrentLocation && coords) {
      setLocation(CURRENT_LOCATION_VALUE);
      setAutoCurrentLocationDismissed(false);
      persistHomeLocationPrefs({
        location: CURRENT_LOCATION_VALUE,
        searchRadius,
        autoCurrentLocationDismissed: false,
      });
      setPendingCurrentLocation(false);
    }
  }, [pendingCurrentLocation, coords, persistHomeLocationPrefs, searchRadius]);

  useEffect(() => {
    if (!firstVisitAutoFilterPending || !coords) return;
    const params = new URLSearchParams();
    params.set("lat", String(coords.latitude));
    params.set("lng", String(coords.longitude));
    params.set("radius", String(radiusKm));
    navigate(buildAppPath("/properties", params.toString()));
    consumeFirstVisitAutoFilter();
  }, [firstVisitAutoFilterPending, coords, radiusKm, navigate, consumeFirstVisitAutoFilter]);

  const useMyCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setPendingCurrentLocation(true);
    setAutoCurrentLocationDismissed(false);
    void requestLocationForFilter().then((result) => {
      if (!result) {
        setPendingCurrentLocation(false);
      }
    });
  };

  const featuredScrollRef = useRef<HTMLDivElement | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const scrollToFeatured = (i: number) => {
    const el = featuredScrollRef.current;
    if (!el) return;
    const cardEl = el.children[i] as HTMLElement | undefined;
    if (cardEl) {
      el.scrollTo({ left: cardEl.offsetLeft - el.offsetLeft, behavior: "smooth" });
    } else {
      const target = Math.max(0, Math.min(featured.length - 1, i));
      el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
    }
  };

  const handleFeaturedScroll = () => {
    const el = featuredScrollRef.current;
    if (!el || el.clientWidth === 0) return;
    // Determine the card whose left edge is closest to the container's left edge.
    const containerLeft = el.scrollLeft;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, idx) => {
      const left = (child as HTMLElement).offsetLeft - el.offsetLeft;
      const d = Math.abs(left - containerLeft);
      if (d < closestDist) {
        closestDist = d;
        closest = idx;
      }
    });
    if (closest !== featuredIndex) setFeaturedIndex(closest);
  };

  // Convert vertical mouse wheel into horizontal scroll on the mobile carousel.
  // Attached as a non-passive listener so preventDefault works. Skipped on
  // touch-primary devices to keep page vertical scroll feeling native.
  useEffect(() => {
    const el = featuredScrollRef.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(hover: none) and (pointer: coarse)").matches) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      // Trackpad horizontal swipes already produce deltaX — let those through.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      const goingRight = e.deltaY > 0;
      const goingLeft = e.deltaY < 0;
      const canScrollRight = el.scrollLeft < max - 1;
      const canScrollLeft = el.scrollLeft > 0;
      if ((goingRight && canScrollRight) || (goingLeft && canScrollLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const search = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat !== "any") params.set("category", cat);
    appendTypeSearchFiltersToUrlParams(params, typeFlags, typeFilters);
    if (features.length) params.set("features", features.join(","));
    if (priceRange !== "any") {
      const opt = PRICE_OPTIONS.find((o) => o.value === priceRange);
      if (opt?.min !== undefined) params.set("minPrice", String(opt.min));
      if (opt?.max !== undefined) params.set("maxPrice", String(opt.max));
    }

    let persistedGeo: { latitude: number; longitude: number } | null = null;
    let persistedLocation = location;
    const typedCandidate = location === "Any" ? locationSearchCandidateRef.current : null;
    if (location === CURRENT_LOCATION_VALUE && coords) {
      params.set("lat", String(coords.latitude));
      params.set("lng", String(coords.longitude));
      params.set("radius", searchRadius);
    } else if (
      typedCandidate?.latitude != null &&
      typedCandidate.longitude != null &&
      Number.isFinite(typedCandidate.latitude) &&
      Number.isFinite(typedCandidate.longitude)
    ) {
      persistedLocation = typedCandidate.label;
      persistedGeo = { latitude: typedCandidate.latitude, longitude: typedCandidate.longitude };
      params.set("lat", String(typedCandidate.latitude));
      params.set("lng", String(typedCandidate.longitude));
      params.set("radius", searchRadius);
      params.set("location", typedCandidate.label);
    } else if (location !== "Any" && location !== CURRENT_LOCATION_VALUE) {
      const place = selectedPlaceGeoRef.current ?? selectedPlaceGeo ?? locationCoordsByLabel.get(location);
      if (place) {
        persistedGeo = { latitude: place.latitude, longitude: place.longitude };
        params.set("lat", String(place.latitude));
        params.set("lng", String(place.longitude));
        params.set("radius", searchRadius);
        params.set("location", location);
      } else if (textLocationQuery) {
        params.set("location", textLocationQuery);
        if (searchRadius) params.set("radius", searchRadius);
      }
    }

    // Always land on the common /properties page (all properties, irrespective
    // of buy/rent). The Properties view reads these same params and filters.
    const base = "/properties";

    persistHomeLocationPrefs({
      location: persistedLocation,
      searchRadius,
      autoCurrentLocationDismissed:
        persistedLocation === CURRENT_LOCATION_VALUE
          ? false
          : persistedLocation !== "Any"
            ? true
            : autoCurrentLocationDismissed,
      latitude: persistedGeo?.latitude,
      longitude: persistedGeo?.longitude,
    });

    writeSectionLocationPrefs("properties", {
      location: persistedLocation,
      searchRadius,
      autoCurrentLocationDismissed: persistedLocation !== CURRENT_LOCATION_VALUE,
      latitude: persistedGeo?.latitude,
      longitude: persistedGeo?.longitude,
    });

    const qs = params.toString();
    navigate(buildAppPath(base, qs));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar variant="solid" />

      {/* HERO — bright editorial layout matching reference composition */}
      <section id="home-hero" className="relative z-20 flex min-h-[30vh] flex-col overflow-visible md:min-h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={imageSrc(heroImage)}
            alt="Luxury villa"
            className="absolute inset-0 h-full w-full object-cover object-[50%_70%]"
          />
          <div className="hidden md:block absolute inset-0 bg-black/3" aria-hidden />
          {/* Left-side dark wash for hero text legibility against bright sky */}
          <div
            className="hidden md:block absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(8,18,38,0.26) 0%, rgba(8,18,38,0.16) 22%, rgba(8,18,38,0.07) 46%, rgba(8,18,38,0.02) 68%, transparent 86%)",
            }}
            aria-hidden
          />
          {/* Top overlay for logo readability — desktop only; mobile navbar
              already sits on its own solid background. */}
          <div className="hidden md:block absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-black/65 via-black/30 to-transparent" aria-hidden />
          {/* Bottom vignette like reference (darker ground, softer top) — desktop only */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/38 via-black/12 to-transparent" aria-hidden />
          <div
            className="hidden md:block absolute inset-0"
            style={{
              background:
                "radial-gradient(110% 60% at 50% 100%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.10) 45%, transparent 70%)",
            }}
            aria-hidden
          />
          {/* Extra local contrast behind hero copy — desktop only */}
          <div
            className="hidden md:block absolute inset-0"
            style={{
              background:
                "radial-gradient(54% 52% at 22% 48%, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.12) 32%, rgba(0,0,0,0.03) 60%, transparent 78%)",
            }}
            aria-hidden
          />
        </div>

        <div className="relative z-10 flex min-h-[30vh] flex-1 flex-col pt-16 md:min-h-screen md:pt-32">
          <div className="container relative flex flex-1 flex-col justify-end pb-12 md:justify-center md:pb-32">
            <div className="hidden md:block mx-auto mt-auto w-full max-w-[min(1200px,calc(100%-0.25rem))] pb-4 text-left md:mt-0 md:pb-0 md:-translate-x-10 lg:-translate-x-16 transform-gpu">
              <div className="max-w-xl animate-fade-in md:max-w-2xl">
                <div className="relative w-fit">
                  <div
                    className="pointer-events-none absolute -inset-x-5 -inset-y-6 rounded-[2.25rem] bg-black/18 blur-[2px]"
                    aria-hidden
                  />
                  <div className="relative inline-flex items-center gap-2 rounded-full border border-white/35 bg-black/25 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.32em] text-white/90 backdrop-blur-sm md:text-[11px]">
                    <Star className="h-3 w-3 shrink-0 fill-gold text-gold" />
                    Welcome to Buy Lands India
                  </div>

                  <h1
                    className="relative mt-7 font-cinzel text-[2rem] font-medium leading-[1.18] tracking-tight text-white md:text-[2.65rem] lg:text-[3.1rem] lg:leading-[1.15]"
                    style={{ textShadow: "0 2px 18px rgba(8,18,38,0.55), 0 1px 2px rgba(0,0,0,0.35)" }}
                  >
                    <span className="block">Your dream property</span>
                    <span className="mt-1.5 block md:mt-2">
                      <span className="text-white">starts </span>
                      <span className="font-cinzel italic font-medium text-white">
                        here
                      </span>
                    </span>
                  </h1>

                  <div
                    className="mt-6 h-[2px] w-[min(42%,180px)] max-w-[12rem] rounded-full"
                    style={{
                      background:
                        "linear-gradient(to right, #0e305d 0%, #1c5fa8 55%, #3a8dd6 100%)",
                    }}
                    aria-hidden
                  />

                  <p
                    className="relative mt-6 block max-md:hidden max-w-lg font-sans text-[0.95rem] font-semibold leading-relaxed tracking-[0.01em] text-white md:text-[1.02rem]"
                    style={{ textShadow: "0 1px 12px rgba(8,18,38,0.55), 0 1px 2px rgba(0,0,0,0.30)" }}
                  >
                    Browse luxury residences, commercial spaces, and modern homes tailored to your needs and aspirations.
                  </p>
                </div>
              </div>
            </div>

            {/* Glass search — placed inside the hero banner */}
            <div className="relative z-30 mt-9 w-full animate-scale-in md:mt-12">
                <div
                  className="mx-auto w-[calc(100%-2rem)] max-w-[420px] rounded-[20px] border border-white/80 bg-white/85 p-2 shadow-[0_22px_60px_-30px_rgba(22,20,16,0.40)] sm:max-w-[560px] md:w-[calc(100%-3rem)] md:max-w-5xl md:rounded-[32px] md:p-5"
                  style={{
                    WebkitBackdropFilter: "blur(10px)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="flex items-stretch gap-2 md:gap-[10px]">
                    <div
                      className="flex min-h-[38px] md:min-h-[42px] min-w-0 flex-1 items-center gap-2.5 rounded-[12px] px-3 md:px-4"
                      style={{
                        border: "1px solid rgba(255,255,255,0.70)",
                        backgroundColor: "rgba(255,255,255,0.78)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92), 0 6px 18px -14px rgba(255, 255, 255, 0.3)",
                        WebkitBackdropFilter: "blur(8px)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 text-[#0e305d]" aria-hidden />
                      <Input
                        placeholder="Search by location, name, keyword..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="h-8 md:h-9 flex-1 border-0 bg-transparent px-0 text-[12px] md:text-[13px] text-[hsl(30_14%_20%)] placeholder:text-[hsl(30_8%_50%)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyDown={(e) => e.key === "Enter" && search()}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="luxe"
                      size="lg"
                      onClick={() => setShowFilters(true)}
                      className="h-[38px] w-[38px] md:h-[42px] shrink-0 rounded-[12px] px-0 md:w-auto md:px-4 text-white [&_svg]:text-white"
                      aria-label="Open filters"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="luxe"
                      size="lg"
                      onClick={search}
                      className="h-[38px] w-[38px] md:h-[42px] md:w-auto md:min-w-[7.5rem] shrink-0 rounded-[12px] border-0 px-0 text-[13px] font-semibold shadow-luxe md:px-7 text-white [&_svg]:text-white"
                    >
                      <Search className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden md:inline">Search</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>

      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl border-white/70 bg-white p-0 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.45)] sm:w-[calc(100vw-3rem)]">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 pb-4 pt-5 text-left md:px-7 md:pt-6">
            <DialogTitle className="font-serif text-2xl font-medium tracking-tight text-foreground md:text-3xl">
              Refine your search
            </DialogTitle>
            <DialogDescription>
              Choose your property intent, location, search radius, type, features, and budget.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7 md:py-6">
            <div className="space-y-5">
              <div className="rounded-2xl border border-border/80 bg-muted/35 p-4">
                <Label className="mb-3 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]">
                  Looking to
                </Label>
                <div
                  role="tablist"
                  aria-label="Buy or rent"
                  className="inline-flex w-full items-center gap-1 rounded-full border border-black/10 bg-white p-1 sm:w-fit"
                >
                  {([
                    { id: "buy", label: "Buy" },
                    { id: "rent", label: "Rent" },
                  ] as const).map((t) => {
                    const active = intent === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setIntent(t.id)}
                        className={cn(
                          "h-10 flex-1 rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.18em] transition-all sm:flex-none",
                          active
                            ? "bg-[#0e305d] text-white shadow-[0_10px_20px_-14px_rgba(14,48,93,0.85)]"
                            : "text-[hsl(30_14%_30%)] hover:text-[hsl(30_14%_18%)]",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]">
                  Enter Location
                </Label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <LocationSearchSelect
                      instanceId="home-filter-location"
                      value={locationSelection}
                      onChange={handleLocationSelect}
                      onSearchCandidateChange={handleLocationSearchCandidateChange}
                      propertyFor={propertyForFilter}
                      variant="modal"
                      allValue="Any"
                      allLabel="No location filter"
                      currentLocationLabel="My current location"
                      placeholder="Select or search a location"
                    />
                  </div>
                  {location !== "Any" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 shrink-0 rounded-xl px-3"
                      aria-label="Clear location filter"
                      onClick={clearLocationFilter}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isCurrentLocationFilter && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing properties within {searchRadius} km of your current location
                    {!coords ? " — allow location access to apply this filter" : ""}
                  </p>
                )}
                {location !== "Any" && !isCurrentLocationFilter && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {hasPlaceCoordinates
                      ? `Showing properties within ${searchRadius} km of ${location}`
                      : `Matching properties in ${location}`}
                  </p>
                )}
              </div>

              {showRadiusFilter && (
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]">
                    Search Radius
                  </Label>
                  <Select value={searchRadius} onValueChange={setSearchRadius}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]">
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

              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]">
                    Property type
                  </Label>
                  <Select value={cat} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]">
                      <SelectValue placeholder="All Property Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">All Property Types</SelectItem>
                      {(propertyTypesData?.results ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]">
                    Price range
                  </Label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]">
                      <SelectValue placeholder="Any price" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-full">
                  <PropertyTypeRoomSearchFields
                    typeFlags={typeFlags}
                    filters={typeFilters}
                    onChange={patchTypeFilters}
                  />
                </div>

                <PropertyTypeSearchFields
                  typeFlags={typeFlags}
                  filters={typeFilters}
                  onChange={patchTypeFilters}
                  hideRoomFilters
                />
              </div>

              <div>
                <Label className="mb-3 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]">
                  Features
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {featurePills.map((opt) => {
                    const active = features.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleFeature(opt.id)}
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

              <button
                type="button"
                onClick={useMyCurrentLocation}
                disabled={locatingMe}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1c5fa8]/60 bg-white px-4 py-3 text-[13px] font-semibold text-[#1c5fa8] transition hover:border-[#1c5fa8] hover:bg-[#1c5fa8]/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MapPin className="h-4 w-4 text-[#1c5fa8]" />
                {locatingMe ? "Detecting your location..." : "Use my current location"}
              </button>
            </div>
          </div>

          <div className="shrink-0 flex gap-3 border-t border-border/70 bg-white px-5 py-4 md:justify-end md:px-7">
            <Button
              type="button"
              variant="outlineGold"
              className="h-11 flex-1 rounded-xl md:flex-none"
              onClick={() => {
                clearLocationFilter();
                setSearchRadius(String(radiusKm));
                setCat("any");
                setTypeFilters(DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS);
                setFeatures([]);
                setPriceRange("any");
              }}
            >
              Reset filters
            </Button>
            <Button
              type="button"
              variant="luxe"
              className="h-11 flex-1 rounded-xl md:flex-none"
              onClick={() => {
                setShowFilters(false);
                search();
              }}
            >
              Apply filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile white content sheet — rounded top like the reference app UI */}
      <div className="relative z-30 -mt-8 rounded-t-[1.25rem] bg-white pt-8 shadow-[0_-10px_28px_-22px_rgba(15,23,42,0.35)] md:contents md:mt-0 md:rounded-none md:bg-transparent md:pt-0 md:shadow-none">
      {/* Mobile: category image strip — uses real property types + their icon images */}
      <section className="md:hidden container pt-0 pb-0">
        <div className="flex items-start gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { label: "All", to: "/properties", image: ALL_CATEGORY_IMAGE },
            ...(propertyTypesData?.results ?? []).map((t) => ({
              label: t.name,
              to: `/properties?category=${encodeURIComponent(t.name)}`,
              image: t.image || ALL_CATEGORY_IMAGE,
            })),
          ].map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group flex w-16 shrink-0 flex-col items-center gap-2"
            >
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#1c5fa8] bg-white shadow-sm transition-all group-hover:border-[#0e305d] group-hover:shadow-md group-active:scale-95">
                <img
                  src={c.image}
                  alt={c.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <span className="w-full truncate text-center text-[11px] font-semibold text-foreground">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container py-5 md:py-12">
        <RevealOnScroll>
          <div className="mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-gold">
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                Featured Collection
              </div>
              <h2 className="font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-4xl lg:text-[2.65rem]">
                Explore Handpicked Properties
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="h-[2px] w-10 rounded-full bg-gradient-to-r from-gold to-gold/0"
                  aria-hidden
                />
                <p className="font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
                  Premium homes in prime locations, curated for you.
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <Link
                to="/buy"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(14,48,93,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-12px_rgba(14,48,93,0.8)] [&_svg]:text-white"
                style={{
                  background:
                    "linear-gradient(135deg,#0e305d 0%,#1c5fa8 55%,#3a8dd6 100%)",
                }}
              >
                View All Properties <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          {/* Desktop / tablet: grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {featured.map((p, i) => <PropertyCard key={p.id} property={p} index={i} promoted />)}
          </div>

          {/* Mobile: compact horizontal cards (free scroll, wheel-enabled) */}
          <div className="md:hidden -mx-4">
            <div
              ref={featuredScrollRef}
              onScroll={handleFeaturedScroll}
              className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-proximity px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((p, i) => {
                return (
                  <article
                    key={p.id}
                    className="snap-start shrink-0 w-[260px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06] animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <Link to={`/properties/${p.id}`} className="relative block">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={p.image}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                        {/* Bottom-left overlay text */}
                          <div className="absolute bottom-2.5 left-3 right-3 text-white">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-90">
                              {p.category}
                            </div>
                            <div className="mt-0.5 truncate font-sans text-[16px] font-semibold leading-tight tracking-tight">
                              {p.title}
                            </div>
                          </div>
                      </div>
                    </Link>

                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                        <span className="truncate">{p.location}, {p.city}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-[12px] text-foreground/80">
                        {p.bedrooms > 0 && (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <Bed className="h-3.5 w-3.5 text-gold" /> {p.bedrooms} Beds
                            </span>
                            <span className="text-foreground/20">|</span>
                          </>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5 text-gold" /> {p.bathrooms} Bath
                        </span>
                        <span className="text-foreground/20">|</span>
                        <span className="inline-flex items-center gap-1">
                          <Maximize className="h-3.5 w-3.5 text-gold" />{" "}
                          {formatAreaList(
                            normalizeAreaList(p.area),
                            p.areaUnit === "cents" ? "cents" : "ft²",
                          )}
                        </span>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</div>
                          <div className="truncate text-[16px] font-semibold tabular-nums text-foreground">
                            ₹{fmt.format(p.price)}
                          </div>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          variant="luxe"
                          className="h-8 shrink-0 rounded-sm px-4 text-[12px] font-semibold text-white [&_svg]:text-white"
                        >
                          <Link to={`/properties/${p.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {featured.length > 1 && (
              <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Featured properties pagination">
                {featured.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToFeatured(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === featuredIndex}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === featuredIndex ? "w-6 bg-gold" : "w-1.5 bg-foreground/20",
                    )}
                  />
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-center">
              <Link
                to="/buy"
                className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-gold shadow-sm transition hover:bg-gold/5"
              >
                View all properties <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>
      </div>

      <WhyChooseUs />

      {/* Desktop: feature cards (Explore. Decide. Done. — Buy/Rent/Sell) */}
      <div className="hidden md:block">
        <FeatureShowcase />
      </div>

      {/* TESTIMONIALS */}
      <section className="container py-8 md:py-12">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_70px_-40px_rgba(8,18,38,0.25)]">
            {/* TOP — hero with image + heading + stats + featured testimonial */}
            <div className="relative">
              {/* Background image (right portion) */}
              <div className="absolute inset-0 overflow-hidden" aria-hidden>
                <img
                  src="/client%20stories.png"
                  alt=""
                  className="absolute inset-y-0 right-0 h-full w-full object-cover object-center"
                />
                {/* Fade to white on the left so the heading/stats stay legible */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 26%, rgba(255,255,255,0.45) 42%, rgba(255,255,255,0.18) 58%, transparent 78%)",
                  }}
                />
                {/* Soft cream wash on the right side so the featured testimonial stays readable */}
                <div
                  className="absolute inset-y-0 right-0 hidden md:block md:w-[46%] lg:w-[42%]"
                  style={{
                    background:
                      "linear-gradient(270deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 40%, rgba(255,255,255,0.45) 75%, transparent 100%)",
                  }}
                />
                {/* Mobile: single-column layout spans full width over the image,
                    so apply a near-opaque wash to keep all text legible. */}
                <div className="absolute inset-0 bg-white/90 md:hidden" aria-hidden />
              </div>

              <div className="relative z-10 grid gap-7 px-5 py-7 sm:px-6 sm:py-8 md:grid-cols-2 md:gap-12 md:px-12 md:py-14 lg:px-16 lg:py-16">
                {/* LEFT — eyebrow + heading + stats */}
                <div>
                  <div className="mb-5 inline-flex items-center gap-3">
                    <span className="h-[2px] w-10 rounded-full bg-gold" aria-hidden />
                    <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#1c5fa8]">
                      Client Stories
                    </span>
                  </div>
                  <h2 className="font-serif text-4xl font-medium leading-[1.1] tracking-tight text-foreground md:text-[3rem] lg:text-[3.5rem]">
                    Client Feedback
                    <br />
                    <span className="italic">&amp; Experiences</span>
                  </h2>
                  <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
                    Real experiences from people who found their perfect space with us.
                  </p>

                  {/* 3 stats */}
                  <div className="mt-8 grid grid-cols-3 gap-4 md:mt-10 md:max-w-md md:gap-6">
                    {[
                      { Icon: Star, to: 4.9, decimals: 1, suffix: "/5", label: "Average Rating" },
                      { Icon: Users, to: 500, decimals: 0, suffix: "+", label: "Happy Clients" },
                      { Icon: ShieldCheck, to: 98, decimals: 0, suffix: "%", label: "Satisfaction" },
                    ].map(({ Icon, to, decimals, suffix, label }) => (
                      <div key={label} className="flex flex-col items-start">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#dde9f7] md:h-14 md:w-14">
                          <Icon className="h-5 w-5 text-[#1c5fa8] md:h-[22px] md:w-[22px]" strokeWidth={1.6} />
                        </div>
                        <CountUp
                          to={to}
                          decimals={decimals}
                          suffix={suffix}
                          className="mt-3 font-serif text-2xl font-bold tabular-nums text-[#1c5fa8] md:text-[28px]"
                        />
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/75 md:text-[11px]">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT — featured testimonial */}
                <div className="md:ml-auto md:max-w-md md:pt-6 lg:pt-10">
                  <Quote className="h-9 w-9 text-[#1c5fa8] md:h-10 md:w-10" strokeWidth={2} />
                  <p className="mt-4 font-serif text-xl font-bold leading-[1.55] text-foreground md:text-[22px] lg:text-[24px]">
                    The team's expertise and thoughtful approach made the process seamless, and the property itself is nothing short of remarkable.
                  </p>
                  <div className="my-5 h-[2px] w-12 rounded-full bg-gold" aria-hidden />
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-serif text-base font-bold text-white shadow-[0_10px_22px_-10px_rgba(14,48,93,0.55)]"
                      style={{
                        background:
                          "linear-gradient(135deg,#0e305d 0%,#1c5fa8 55%,#3a8dd6 100%)",
                      }}
                      aria-hidden
                    >
                      O
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-[15px] font-bold text-foreground">
                          Olive Yew
                        </span>
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1c5fa8] text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      </div>
                      <div className="text-xs font-bold text-foreground/75">Verified Resident</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM — three testimonial cards */}
            <div className="relative z-20 mt-2 grid gap-4 px-6 pb-6 md:mt-4 md:grid-cols-3 md:gap-5 md:px-12 md:pb-8 lg:mt-6 lg:px-16">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(14,48,93,0.18)] transition-shadow hover:shadow-[0_18px_44px_-22px_rgba(14,48,93,0.3)]"
                >
                  <Quote
                    className="pointer-events-none absolute bottom-3 right-3 h-9 w-9 text-foreground/10"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="mb-3 flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1c5fa8] text-white shadow-[0_10px_22px_-10px_rgba(14,48,93,0.55)]">
                      <Quote className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="flex gap-0.5 text-gold">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-gold" />
                      ))}
                    </div>
                  </div>
                  <p className="min-h-[72px] font-sans text-[14px] leading-[1.6] text-foreground/85">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3 border-t border-black/[0.06] pt-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#1c5fa8] bg-white font-serif text-sm font-semibold text-[#1c5fa8]">
                      {t.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-semibold text-foreground">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {t.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </RevealOnScroll>
      </section>

      <ListPropertyCta />

      <Footer />
    </div>
  );
};

export default Home;
