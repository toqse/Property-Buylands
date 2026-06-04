import { CURRENT_LOCATION_VALUE } from "@/lib/locationFilter";

/** Independent location-filter prefs per listings surface */
export type ListingSection = "buy" | "rent" | "home" | "properties";

export type SectionLocationPrefs = {
  location: string;
  searchRadius: string;
  autoCurrentLocationDismissed: boolean;
};

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
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${section}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SectionLocationPrefs;
    if (typeof parsed.location !== "string" || typeof parsed.searchRadius !== "string") {
      return null;
    }
    return {
      location: parsed.location,
      searchRadius: parsed.searchRadius,
      autoCurrentLocationDismissed: Boolean(parsed.autoCurrentLocationDismissed),
    };
  } catch {
    return null;
  }
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
  try {
    const raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SectionLocationPrefs;
    if (typeof parsed.location !== "string" || typeof parsed.searchRadius !== "string") {
      return null;
    }
    return {
      location: parsed.location,
      searchRadius: parsed.searchRadius,
      autoCurrentLocationDismissed: Boolean(parsed.autoCurrentLocationDismissed),
    };
  } catch {
    return null;
  }
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
