import { CURRENT_LOCATION_VALUE } from "@/lib/locationFilter";
import {
  DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS,
  type PropertyTypeFeatureFlags,
  type PropertyTypeSearchFilterState,
} from "@/lib/api/propertyForm";

export type ActiveListingFilterChip = {
  id: string;
  label: string;
};

const PRICE_RANGE_LABELS: Record<string, string> = {
  any: "Any price",
  "0-1000000": "Under ₹10 Lakh",
  "1000000-2500000": "₹10 – 25 Lakh",
  "2500000-5000000": "₹25 – 50 Lakh",
  "5000000-10000000": "₹50 Lakh – 1 Crore",
  "10000000-100000000": "₹1 Crore+",
};

function isTypeFilterActive(
  type: string,
  defaultType?: "For Sale" | "For Rent",
): boolean {
  if (!type || type === "Any") return false;
  if (defaultType === "For Sale" && (type === "For Sale" || type === "Sale")) {
    return false;
  }
  if (defaultType === "For Rent" && type === "For Rent") return false;
  return true;
}

function typeFilterLabel(type: string): string {
  if (type === "For Rent") return "Rent";
  if (type === "For Sale" || type === "Sale") return "Sale";
  return type;
}

function formatCustomPriceRange(min: number, max: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(n);
  if (min > 0 && max < 5_000_000) return `₹${fmt(min)} – ₹${fmt(max)}`;
  if (min > 0) return `₹${fmt(min)}+`;
  return `Under ₹${fmt(max)}`;
}

export function buildActiveListingFilterChips(options: {
  q: string;
  category: string;
  type: string;
  defaultType?: "For Sale" | "For Rent";
  location: string;
  searchRadius: string;
  price: number[];
  priceRange: string;
  features: number[];
  featureOptions: { id: number; name: string }[];
  typeFlags: PropertyTypeFeatureFlags;
  typeFilters: PropertyTypeSearchFilterState;
}): ActiveListingFilterChip[] {
  const chips: ActiveListingFilterChip[] = [];
  const defaults = DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS;

  const trimmedQ = options.q.trim();
  if (trimmedQ) {
    chips.push({ id: "q", label: trimmedQ });
  }

  if (options.category && options.category !== "All") {
    chips.push({ id: "category", label: options.category });
  }

  if (isTypeFilterActive(options.type, options.defaultType)) {
    chips.push({
      id: "type",
      label: typeFilterLabel(options.type),
    });
  }

  if (options.location && options.location !== "Any") {
    const label =
      options.location === CURRENT_LOCATION_VALUE
        ? `Within ${options.searchRadius} km`
        : options.location;
    chips.push({ id: "location", label });
  }

  const [priceMin, priceMax] = options.price;
  const hasPriceFilter = priceMin > 0 || priceMax < 5_000_000;
  if (hasPriceFilter) {
    const presetLabel =
      options.priceRange !== "any"
        ? PRICE_RANGE_LABELS[options.priceRange]
        : null;
    chips.push({
      id: "price",
      label: presetLabel ?? formatCustomPriceRange(priceMin, priceMax),
    });
  }

  for (const featureId of options.features) {
    const name = options.featureOptions.find((f) => f.id === featureId)?.name;
    if (name) {
      chips.push({ id: `feature-${featureId}`, label: name });
    }
  }

  const { typeFlags, typeFilters: f } = options;

  if (typeFlags.has_bedrooms && f.bedroomsMin !== defaults.bedroomsMin) {
    chips.push({
      id: "bedrooms",
      label: `${f.bedroomsMin} bed${f.bedroomsMin === "1" ? "" : "s"}`,
    });
  }
  if (typeFlags.has_bathrooms && f.bathroomsMin !== defaults.bathroomsMin) {
    chips.push({
      id: "bathrooms",
      label: `${f.bathroomsMin} bath${f.bathroomsMin === "1" ? "" : "s"}`,
    });
  }
  if (typeFlags.has_furnishing && f.furnishing !== defaults.furnishing) {
    chips.push({ id: "furnishing", label: f.furnishing });
  }
  if (typeFlags.has_parking_spaces && f.parkingSpaces.trim()) {
    chips.push({
      id: "parking",
      label: `${f.parkingSpaces}+ parking`,
    });
  }
  if (typeFlags.has_project_status && f.projectStatus !== defaults.projectStatus) {
    chips.push({ id: "projectStatus", label: f.projectStatus });
  }
  if (typeFlags.has_floors && f.floors.trim()) {
    chips.push({ id: "floors", label: `${f.floors} floors` });
  }
  if (typeFlags.has_sighting && f.sighting !== defaults.sighting) {
    chips.push({ id: "sighting", label: f.sighting });
  }

  if (typeFlags.has_area_both) {
    if (f.areaMin.trim() || f.areaCentMin.trim()) {
      const parts: string[] = [];
      if (f.areaMin.trim()) parts.push(`${f.areaMin.trim()} sq.ft`);
      if (f.areaCentMin.trim()) parts.push(`${f.areaCentMin.trim()} cents`);
      chips.push({ id: "area", label: parts.join(" · ") });
    }
  } else {
    const areaParts: string[] = [];
    if (f.areaMin.trim()) {
      areaParts.push(
        `${f.areaMin.trim()} ${f.areaUnit === "cents" ? "cents" : "sq.ft"}`,
      );
    }
    if (f.areaMax.trim()) {
      areaParts.push(
        `max ${f.areaMax.trim()} ${f.areaUnit === "cents" ? "cents" : "sq.ft"}`,
      );
    }
    if (areaParts.length) {
      chips.push({ id: "area", label: areaParts.join(" · ") });
    }
  }

  return chips;
}
