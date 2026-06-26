import { CURRENT_LOCATION_VALUE } from "@/lib/locationFilter";

/** Independent location-filter prefs per listings surface */
export type ListingSection = "buy" | "rent" | "home" | "properties";

export type SectionLocationPrefs = {
  location: string;
  searchRadius: string;
  autoCurrentLocationDismissed: boolean;
  /** Coordinates for the chosen place (e.g. OpenStreetMap selection). */
  latitude?: number;
  longitude?: number;
};

function parseLocationPrefs(raw: string | null): SectionLocationPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SectionLocationPrefs;
    if (typeof parsed.location !== "string" || typeof parsed.searchRadius !== "string") {
      return null;
    }
    const latitude = Number(parsed.latitude);
    const longitude = Number(parsed.longitude);
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
    return {
      location: parsed.location,
      searchRadius: parsed.searchRadius,
      autoCurrentLocationDismissed: Boolean(parsed.autoCurrentLocationDismissed),
      latitude: hasCoords ? latitude : undefined,
      longitude: hasCoords ? longitude : undefined,
    };
  } catch {
    return null;
  }
}

const STORAGE_PREFIX = "buylands_section_location_";

/** Website-wide location chosen from the navbar filter (global scope) */
const GLOBAL_STORAGE_KEY = "buylands_global_location";

const ALL_SECTIONS: ListingSection[] = ["buy", "rent", "home", "properties"];

export function getListingSection(pathname: string): ListingSection {
  if (pathname.startsWith("/rent")) return "rent";
  if (pathname.startsWith("/buy")) return "buy";
  if (pathname.startsWith("/properties")) return "properties";
  return "home";
}

export function defaultSectionLocationPrefs(radiusKm: number): SectionLocationPrefs {
  return {
    location: "Any",
    searchRadius: String(radiusKm),
    /** Do not auto-apply GPS on a section until the user opts in there */
    autoCurrentLocationDismissed: true,
  };
}

export function readSectionLocationPrefs(section: ListingSection): SectionLocationPrefs | null {
  if (typeof window === "undefined") return null;
  return parseLocationPrefs(sessionStorage.getItem(`${STORAGE_PREFIX}${section}`));
}

export function writeSectionLocationPrefs(section: ListingSection, prefs: SectionLocationPrefs): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${section}`, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSectionLocationPrefs(section: ListingSection): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${section}`);
  } catch {
    /* ignore */
  }
}

export function isCurrentLocationSelection(location: string): boolean {
  return location === CURRENT_LOCATION_VALUE;
}

/**
 * Global location prefs persist across the whole site (localStorage). Set from
 * the navbar location filter; used as the fallback for any listings section that
 * has no explicit local override.
 */
export function readGlobalLocationPrefs(): SectionLocationPrefs | null {
  if (typeof window === "undefined") return null;
  return parseLocationPrefs(localStorage.getItem(GLOBAL_STORAGE_KEY));
}

export function writeGlobalLocationPrefs(prefs: SectionLocationPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGlobalLocationPrefs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GLOBAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Remove every per-section local override (used when a new global is chosen). */
export function clearAllSectionLocationPrefs(): void {
  if (typeof window === "undefined") return;
  try {
    for (const section of ALL_SECTIONS) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${section}`);
    }
  } catch {
    /* ignore */
  }
}

/** Wipe all persisted listing location filters and cached GPS coords on refresh. */
export function clearAllListingFilterStorage(): void {
  if (typeof window === "undefined") return;
  clearGlobalLocationPrefs();
  clearAllSectionLocationPrefs();
  try {
    localStorage.removeItem("buylands_user_location");
  } catch {
    /* ignore */
  }
}

export const LISTING_FILTER_QUERY_PARAMS = [
  "q",
  "category",
  "type",
  "minPrice",
  "maxPrice",
  "bedrooms",
  "bathrooms",
  "features",
  "lat",
  "lng",
  "radius",
  "location",
] as const;

const LISTING_FILTER_ROUTES = ["/", "/buy", "/rent", "/properties"];

export function isListingFilterRoute(pathname: string): boolean {
  return LISTING_FILTER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function hasListingFilterQueryParams(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return LISTING_FILTER_QUERY_PARAMS.some((key) => params.has(key));
}
