import type { ApiProperty } from "@/lib/api/types";
import type { Property, PropertyStatus } from "@/data/mockData";

function moderationToStatus(s?: string): PropertyStatus {
  switch (s) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending";
  }
}

function propertyForToType(pf: string): "For Sale" | "For Rent" {
  return pf === "rent" ? "For Rent" : "For Sale";
}

function pickImage(p: ApiProperty): string {
  const first = p.images?.[0]?.image;
  return first || "/placeholder-property.jpg";
}

function pickGallery(p: ApiProperty): string[] {
  const imgs = (p.images ?? []).map((i) => i.image).filter(Boolean);
  return imgs.length ? imgs : [pickImage(p)];
}

function pickImageRecords(p: ApiProperty): { id: number; url: string }[] {
  return (p.images ?? [])
    .filter((i) => i.image)
    .map((i) => ({ id: i.id, url: i.image }));
}

function pickFeatureNames(p: ApiProperty): string[] {
  if (p.feature_details?.length) return p.feature_details.map((f) => f.name);
  return p.feature_names ?? [];
}

function pickFeatureIds(p: ApiProperty): number[] {
  if (p.feature_details?.length) return p.feature_details.map((f) => f.id);
  return p.features ?? [];
}

function mapAreaUnit(unit?: string): Property["areaUnit"] {
  if (unit === "cent") return "cents";
  return (unit as Property["areaUnit"]) || "sqft";
}

export function mapApiPropertyToUi(p: ApiProperty): Property {
  const locationParts = [p.city_name, p.district_name, p.state_name].filter(Boolean);
  const location = locationParts.join(", ") || "India";
  const city = p.city_name || p.district_name || p.state_name || "India";

  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    category: (p.property_type_name as Property["category"]) || "Apartment",
    type: propertyForToType(p.property_for),
    price: Number(p.price) || 0,
    location,
    city,
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    area: p.area ?? 0,
    areaUnit: mapAreaUnit(p.area_unit),
    features: pickFeatureNames(p),
    description: p.description || "",
    image: pickImage(p),
    gallery: pickGallery(p),
    images: pickImageRecords(p),
    ownerName: p.contact_name || "",
    ownerPhone: p.phone_number || "",
    ownerEmail: p.email || "",
    status: moderationToStatus(p.moderation_status),
    featured: p.is_featured,
    videoUrl: p.property_video_url || undefined,
    videoThumbnail: p.video_thumbnail_url || undefined,
    lat: Number(p.latitude) || 0,
    lng: Number(p.longitude) || 0,
    createdAt: p.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    ownership: p.property_ownership,
    state: p.state_name,
    district: p.district_name,
    contactWhatsApp: p.whatsapp_number,
    youtubeUrl: p.youtube_video_link,
    googleMapUrl: p.google_maps_url,
    googleEmbedHtml: p.google_embedded_map_link || undefined,
    builtYear: p.built_year ? String(p.built_year) : undefined,
    furnishing: p.furnishing,
    parkingSpaces: p.parking_spaces != null ? String(p.parking_spaces) : undefined,
    nearbyPlaces: (p.nearby_places_data ?? []).map((np) => ({
      name: np.name,
      distanceKm: String(np.distance),
    })),
    featureIds: pickFeatureIds(p),
    propertyTypeId: p.property_type,
    stateId: p.state,
    districtId: p.district,
    cityId: p.city,
  };
}

export function propertyDetailPath(p: Property | ApiProperty): string {
  const slug = "slug" in p ? p.slug : undefined;
  const id = "id" in p ? String(p.id) : "";
  return `/properties/${slug || id}`;
}
