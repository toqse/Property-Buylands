/** Select value for browser / saved user coordinates */
export const CURRENT_LOCATION_VALUE = "__current_location__";

export const RADIUS_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Within 1 km" },
  { value: "2", label: "Within 2 km" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "15", label: "Within 15 km" },
  { value: "20", label: "Within 20 km" },
  { value: "25", label: "Within 25 km" },
  { value: "50", label: "Within 50 km" },
];

export function getLocationLabel(loc: {
  location_name?: string;
  label?: string;
  city?: string;
  district?: string;
  state?: string;
}) {
  return loc.location_name || loc.label || [loc.city, loc.district, loc.state].filter(Boolean).join(", ");
}

export function getLocationSearchValue(value: string) {
  if (!value || value === "Any" || value === CURRENT_LOCATION_VALUE) return undefined;
  return value.split(",")[0]?.trim() || value;
}

export function buildLocationCoordsMap(
  results: {
    location_name?: string;
    label?: string;
    city?: string;
    district?: string;
    state?: string;
    latitude?: number | string;
    longitude?: number | string;
  }[],
) {
  const map = new Map<string, { latitude: number; longitude: number }>();
  for (const loc of results) {
    const label = getLocationLabel(loc);
    if (!label) continue;
    const latitude = Number(loc.latitude);
    const longitude = Number(loc.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.set(label, { latitude, longitude });
    }
  }
  return map;
}

export function uniqueLocationLabels(
  results: Parameters<typeof buildLocationCoordsMap>[0],
) {
  const seen = new Set<string>();
  return results
    .map((loc) => getLocationLabel(loc))
    .filter((label): label is string => {
      if (!label || seen.has(label)) return false;
      seen.add(label);
      return true;
    });
}
