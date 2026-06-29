import type { AddPropertyDraft } from "@/components/PropertyListingForm";
import type { ApiPropertyType } from "@/lib/api/types";
import { formatCoordinateForApi } from "@/lib/osmSearch";

/** Maximum number of images allowed per property. */
export const MAX_PROPERTY_IMAGES = 4;

export type PropertyTypeFeatureFlags = {
  has_bedrooms: boolean;
  has_bathrooms: boolean;
  has_built_year: boolean;
  has_parking_spaces: boolean;
  has_project_status: boolean;
  has_floors: boolean;
  has_sighting: boolean;
  has_area_both: boolean;
  has_furnishing: boolean;
};

export const DEFAULT_PROPERTY_TYPE_FLAGS: PropertyTypeFeatureFlags = {
  has_bedrooms: true,
  has_bathrooms: true,
  has_built_year: true,
  has_parking_spaces: true,
  has_project_status: false,
  has_floors: false,
  has_sighting: false,
  has_area_both: false,
  has_furnishing: true,
};

export function flagsFromPropertyType(
  type?: Partial<ApiPropertyType> | null,
): PropertyTypeFeatureFlags {
  return {
    has_bedrooms: type?.has_bedrooms ?? true,
    has_bathrooms: type?.has_bathrooms ?? true,
    has_built_year: type?.has_built_year ?? true,
    has_parking_spaces: type?.has_parking_spaces ?? true,
    has_project_status: type?.has_project_status ?? false,
    has_floors: type?.has_floors ?? false,
    has_sighting: type?.has_sighting ?? false,
    has_area_both: type?.has_area_both ?? false,
    has_furnishing: type?.has_furnishing ?? true,
  };
}

export function findPropertyTypeFlags(
  types: ApiPropertyType[] | undefined,
  categoryName: string,
): PropertyTypeFeatureFlags {
  const match = types?.find(
    (t) => t.name.trim().toLowerCase() === categoryName.trim().toLowerCase(),
  );
  return flagsFromPropertyType(match);
}

export type PropertyTypeSearchFilterState = {
  areaUnit: "sqft" | "cents";
  areaMin: string;
  areaMax: string;
  areaCentMin: string;
  areaCentMax: string;
  bedroomsMin: string;
  bedroomsMax: string;
  bathroomsMin: string;
  bathroomsMax: string;
  furnishing: string;
  parkingSpaces: string;
  projectStatus: string;
  floors: string;
  sighting: string;
};

export const DEFAULT_PROPERTY_TYPE_SEARCH_FILTERS: PropertyTypeSearchFilterState =
  {
    areaUnit: "sqft",
    areaMin: "",
    areaMax: "",
    areaCentMin: "",
    areaCentMax: "",
    bedroomsMin: "Any",
    bedroomsMax: "Any",
    bathroomsMin: "Any",
    bathroomsMax: "Any",
    furnishing: "Any",
    parkingSpaces: "",
    projectStatus: "Any",
    floors: "",
    sighting: "Any",
  };

export function clearSearchFiltersForFlags(
  flags: PropertyTypeFeatureFlags,
): Partial<PropertyTypeSearchFilterState> {
  return {
    ...(flags.has_area_both
      ? { areaUnit: "sqft" as const }
      : { areaCentMin: "", areaCentMax: "" }),
    ...(flags.has_bedrooms
      ? {}
      : { bedroomsMin: "Any" as const, bedroomsMax: "Any" as const }),
    ...(flags.has_bathrooms
      ? {}
      : { bathroomsMin: "Any" as const, bathroomsMax: "Any" as const }),
    ...(flags.has_furnishing ? {} : { furnishing: "Any" as const }),
    ...(flags.has_parking_spaces ? {} : { parkingSpaces: "" }),
    ...(flags.has_project_status ? {} : { projectStatus: "Any" as const }),
    ...(flags.has_floors ? {} : { floors: "" }),
    ...(flags.has_sighting ? {} : { sighting: "Any" as const }),
  };
}

function parseRoomFilterValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Any") return undefined;
  const normalized = trimmed.endsWith("+") ? trimmed.slice(0, -1) : trimmed;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeRoomFilterFromUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Any") return "Any";
  const n = Number(trimmed);
  if (Number.isFinite(n) && n >= 1 && n <= 10) return String(n);
  return trimmed;
}

export function propertyTypeSearchListParams(
  flags: PropertyTypeFeatureFlags,
  filters: PropertyTypeSearchFilterState,
) {
  const p: Record<string, string | number> = {};

  if (flags.has_area_both) {
    if (filters.areaMin.trim()) p.area_min = filters.areaMin.trim();
    p.area_unit = "sqft";
    if (filters.areaCentMin.trim()) p.area_cent_min = filters.areaCentMin.trim();
  } else {
    const unit = filters.areaUnit === "cents" ? "cent" : filters.areaUnit;
    if (filters.areaMin.trim()) {
      p.area_unit = unit;
      p.area_min = filters.areaMin.trim();
    }
  }

  if (flags.has_bedrooms) {
    const bedroomsMin = parseRoomFilterValue(filters.bedroomsMin);
    if (bedroomsMin != null) {
      p.bedrooms_min = bedroomsMin;
      p.bedrooms_max = bedroomsMin;
    }
  }
  if (flags.has_bathrooms) {
    const bathroomsMin = parseRoomFilterValue(filters.bathroomsMin);
    if (bathroomsMin != null) {
      p.bathrooms_min = bathroomsMin;
      p.bathrooms_max = bathroomsMin;
    }
  }

  if (
    flags.has_furnishing &&
    filters.furnishing !== "Any" &&
    filters.furnishing.trim()
  ) {
    p.furnishing = filters.furnishing.trim().toLowerCase();
  }
  if (flags.has_parking_spaces && filters.parkingSpaces.trim()) {
    p.parking_spaces_min = Number(filters.parkingSpaces);
  }
  if (
    flags.has_project_status &&
    filters.projectStatus !== "Any" &&
    filters.projectStatus.trim()
  ) {
    p.project_status = filters.projectStatus.trim();
  }
  if (flags.has_floors && filters.floors.trim()) {
    p.floors = filters.floors.trim();
  }
  if (
    flags.has_sighting &&
    filters.sighting !== "Any" &&
    filters.sighting.trim()
  ) {
    p.sighting = filters.sighting.trim();
  }

  return p;
}

export function appendTypeSearchFiltersToUrlParams(
  params: URLSearchParams,
  flags: PropertyTypeFeatureFlags,
  filters: PropertyTypeSearchFilterState,
) {
  const listParams = propertyTypeSearchListParams(flags, filters);

  if (listParams.area_min != null) params.set("areaMin", String(listParams.area_min));
  if (listParams.area_unit != null) params.set("areaUnit", String(listParams.area_unit));
  if (listParams.area_cent_min != null)
    params.set("areaCentMin", String(listParams.area_cent_min));
  if (listParams.bedrooms_min != null)
    params.set("bedroomsMin", String(listParams.bedrooms_min));
  if (listParams.bathrooms_min != null)
    params.set("bathroomsMin", String(listParams.bathrooms_min));
  if (listParams.furnishing != null) params.set("furnishing", String(listParams.furnishing));
  if (listParams.parking_spaces_min != null)
    params.set("parkingSpaces", String(listParams.parking_spaces_min));
  if (listParams.project_status != null)
    params.set("projectStatus", String(listParams.project_status));
  if (listParams.floors != null) params.set("floors", String(listParams.floors));
  if (listParams.sighting != null) params.set("sighting", String(listParams.sighting));
}

const TYPE_SEARCH_FILTER_URL_KEYS = [
  "areaMin",
  "areaMax",
  "areaUnit",
  "areaCentMin",
  "areaCentMax",
  "bedroomsMin",
  "bedroomsMax",
  "bathroomsMin",
  "bathroomsMax",
  "furnishing",
  "parkingSpaces",
  "projectStatus",
  "floors",
  "sighting",
] as const;

export function replaceTypeSearchFiltersInUrlParams(
  params: URLSearchParams,
  flags: PropertyTypeFeatureFlags,
  filters: PropertyTypeSearchFilterState,
) {
  for (const key of TYPE_SEARCH_FILTER_URL_KEYS) params.delete(key);
  appendTypeSearchFiltersToUrlParams(params, flags, filters);
}

export function readTypeSearchFiltersFromUrlParams(
  searchParams: URLSearchParams,
): Partial<PropertyTypeSearchFilterState> {
  const patch: Partial<PropertyTypeSearchFilterState> = {};
  const areaMin = searchParams.get("areaMin");
  if (areaMin) patch.areaMin = areaMin;
  const areaUnit = searchParams.get("areaUnit");
  if (areaUnit === "sqft" || areaUnit === "cents" || areaUnit === "cent") {
    patch.areaUnit = areaUnit === "cent" ? "cents" : areaUnit;
  }
  const areaCentMin = searchParams.get("areaCentMin");
  if (areaCentMin) patch.areaCentMin = areaCentMin;
  const bedroomsMin = searchParams.get("bedroomsMin");
  if (bedroomsMin) patch.bedroomsMin = normalizeRoomFilterFromUrl(bedroomsMin);
  const bathroomsMin = searchParams.get("bathroomsMin");
  if (bathroomsMin) patch.bathroomsMin = normalizeRoomFilterFromUrl(bathroomsMin);
  const furnishing = searchParams.get("furnishing");
  if (furnishing) {
    const normalized =
      furnishing.charAt(0).toUpperCase() + furnishing.slice(1).toLowerCase();
    if (normalized.startsWith("Semi")) patch.furnishing = "Semi-furnished";
    else if (normalized.startsWith("Fully")) patch.furnishing = "Fully furnished";
    else if (normalized.startsWith("Un")) patch.furnishing = "Unfurnished";
    else patch.furnishing = furnishing;
  }
  const parkingSpaces = searchParams.get("parkingSpaces");
  if (parkingSpaces) patch.parkingSpaces = parkingSpaces;
  const projectStatus = searchParams.get("projectStatus");
  if (projectStatus) patch.projectStatus = projectStatus;
  const floors = searchParams.get("floors");
  if (floors) patch.floors = floors;
  const sighting = searchParams.get("sighting");
  if (sighting) patch.sighting = sighting;
  return patch;
}

export function appendPropertyTypeFlagsToFormData(
  fd: FormData,
  flags: PropertyTypeFeatureFlags,
) {
  (Object.keys(flags) as (keyof PropertyTypeFeatureFlags)[]).forEach((key) => {
    fd.append(key, flags[key] ? "true" : "false");
  });
}

/**
 * Validate the image selection for a property submission.
 * At most {@link MAX_PROPERTY_IMAGES} are allowed.
 * In edit mode pass the count of already-saved images via `existingImages`.
 * Returns an error message string, or `null` when valid.
 */
export function validatePropertyImages(opts: {
  newImages: number;
  existingImages?: number;
}): string | null {
  const total = opts.newImages + (opts.existingImages ?? 0);
  if (total > MAX_PROPERTY_IMAGES) {
    return `You can upload a maximum of ${MAX_PROPERTY_IMAGES} images.`;
  }
  return null;
}

/**
 * A property must have at least one photo or one video.
 * In edit mode, already-saved media counts via `existingImages` / `hasVideo`.
 * A YouTube link also counts as a video. Returns an error message string, or `null` when valid.
 */
export function validatePropertyMedia(opts: {
  newImages: number;
  existingImages?: number;
  hasVideo?: boolean;
}): string | null {
  const totalImages = opts.newImages + (opts.existingImages ?? 0);
  if (totalImages === 0 && !opts.hasVideo) {
    return "Add at least one photo or a video before saving.";
  }
  return null;
}

/** Feature PKs selected in the form (sourced from the features catalog API). */
export function resolveFeatureIds(draft: AddPropertyDraft): number[] {
  return [...new Set(draft.featureIds)];
}

/**
 * On PATCH, optional fields must be sent even when empty; otherwise the API
 * leaves the previous value unchanged. On create, omit empty optionals.
 */
function appendClearableField(
  fd: FormData,
  key: string,
  value: string,
  opts: { enabled: boolean; mode: "create" | "update"; emptyValue?: string },
) {
  if (!opts.enabled) return;
  const trimmed = value.trim();
  if (opts.mode === "update" || trimmed) {
    fd.append(key, trimmed || (opts.emptyValue ?? ""));
  }
}

function appendClearableCoordinate(
  fd: FormData,
  key: string,
  value: string,
  mode: "create" | "update",
) {
  const trimmed = value.trim();
  if (mode === "update" || trimmed) {
    fd.append(key, trimmed ? formatCoordinateForApi(trimmed) : "");
  }
}

export function buildPropertyFormData(
  draft: AddPropertyDraft,
  imageFiles: File[],
  videoFile: File | null,
  extras: {
    propertyTypeId?: number;
    featureIds?: number[];
    /** When false, omit contact fields so the backend fills from the owner account. */
    includeContact?: boolean;
    typeFlags?: PropertyTypeFeatureFlags;
    mode?: "create" | "update";
  } = {},
): FormData {
  const fd = new FormData();
  const includeContact = extras.includeContact !== false;
  const flags = extras.typeFlags ?? DEFAULT_PROPERTY_TYPE_FLAGS;
  const mode = extras.mode ?? "create";

  fd.append("title", draft.title.trim());
  fd.append("description", draft.description.trim());
  fd.append("price", String(draft.price).replace(/[^\d.]/g, "") || "0");
  fd.append("property_for", draft.propertyFor === "For Rent" ? "rent" : "sell");
  if (draft.ownership.trim()) {
    fd.append("property_ownership", draft.ownership.trim());
  }
  if (includeContact) {
    fd.append("contact_name", draft.contactName.trim());
    fd.append("phone_number", draft.phone.trim());
    fd.append("whatsapp_number", draft.whatsapp.trim());
    fd.append("email", draft.contactEmail.trim());
  }

  if (draft.stateId) fd.append("state", draft.stateId);
  else if (draft.state.trim()) fd.append("state", draft.state.trim());

  if (draft.districtId) fd.append("district", draft.districtId);
  else if (draft.district.trim()) fd.append("district", draft.district.trim());

  if (draft.city.trim()) fd.append("city", draft.city.trim());

  if (extras.propertyTypeId)
    fd.append("property_type", String(extras.propertyTypeId));

  appendClearableField(fd, "bedrooms", draft.bedrooms, {
    enabled: flags.has_bedrooms,
    mode,
    emptyValue: "0",
  });
  appendClearableField(fd, "bathrooms", draft.bathrooms, {
    enabled: flags.has_bathrooms,
    mode,
    emptyValue: "0",
  });
  appendClearableField(fd, "built_year", draft.builtYear, {
    enabled: flags.has_built_year,
    mode,
    emptyValue: "",
  });
  appendClearableField(fd, "parking_spaces", draft.parkingSpaces, {
    enabled: flags.has_parking_spaces,
    mode,
    emptyValue: "0",
  });
  appendClearableField(fd, "project_status", draft.projectStatus, {
    enabled: flags.has_project_status,
    mode,
  });
  appendClearableField(fd, "floors", draft.floors, {
    enabled: flags.has_floors,
    mode,
  });
  appendClearableField(fd, "sighting", draft.sighting, {
    enabled: flags.has_sighting,
    mode,
  });

  if (flags.has_area_both) {
    appendClearableField(fd, "area", draft.area, {
      enabled: true,
      mode,
    });
    fd.append("area_unit", "sqft");
    appendClearableField(fd, "area_cent", draft.areaCent, {
      enabled: true,
      mode,
      emptyValue: "",
    });
  } else {
    appendClearableField(fd, "area", draft.area, {
      enabled: true,
      mode,
    });
    if (draft.areaUnit || mode === "update") {
      fd.append(
        "area_unit",
        (draft.areaUnit || "sqft") === "cents" ? "cent" : draft.areaUnit || "sqft",
      );
    }
  }

  appendClearableCoordinate(fd, "latitude", draft.latitude, mode);
  appendClearableCoordinate(fd, "longitude", draft.longitude, mode);
  appendClearableField(fd, "google_maps_url", draft.googleMapUrl, {
    enabled: true,
    mode,
  });
  if (flags.has_furnishing) {
    const furnishing = draft.furnishing.trim();
    if (mode === "update" || furnishing) {
      fd.append("furnishing", furnishing ? furnishing.toLowerCase() : "");
    }
  }

  const featureIds = extras.featureIds ?? [];
  if (mode === "update") {
    // Empty JSON array clears M2M features (see views._normalize_features_list).
    if (featureIds.length === 0) {
      fd.append("features", "[]");
    } else {
      featureIds.forEach((id) => fd.append("features", String(id)));
    }
  } else {
    featureIds.forEach((id) => fd.append("features", String(id)));
  }

  const nearby = draft.nearbyPlaces.filter(
    (n) => n.name.trim() || n.distanceKm.trim(),
  );
  if (mode === "update" || nearby.length) {
    fd.append(
      "nearby_places_data",
      JSON.stringify(
        nearby.map((n) => ({
          name: n.name.trim(),
          distance: Number.parseFloat(n.distanceKm) || 0,
        })),
      ),
    );
  }
  imageFiles.forEach((file) => fd.append("uploaded_images", file));
  if (videoFile) fd.append("property_video", videoFile);
  return fd;
}
