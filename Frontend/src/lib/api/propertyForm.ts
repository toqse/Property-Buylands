import type { AddPropertyDraft } from "@/components/PropertyListingForm";

/** Maximum number of images allowed per property. */
export const MAX_PROPERTY_IMAGES = 4;

/**
 * Validate the image selection for a property submission.
 * At least one image is mandatory and at most {@link MAX_PROPERTY_IMAGES} are allowed.
 * In edit mode pass the count of already-saved images via `existingImages`.
 * Returns an error message string, or `null` when valid.
 */
export function validatePropertyImages(opts: {
  newImages: number;
  existingImages?: number;
}): string | null {
  const total = opts.newImages + (opts.existingImages ?? 0);
  if (total < 1) return "Please add at least one property image.";
  if (total > MAX_PROPERTY_IMAGES) {
    return `You can upload a maximum of ${MAX_PROPERTY_IMAGES} images.`;
  }
  return null;
}

/** Feature PKs selected in the form (sourced from the features catalog API). */
export function resolveFeatureIds(draft: AddPropertyDraft): number[] {
  return [...new Set(draft.featureIds)];
}

function mapOwnershipToApi(ownership: string): string {
  const v = ownership.trim().toLowerCase();
  if (v === "management") return "management";
  return "direct_owner";
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
  } = {},
): FormData {
  const fd = new FormData();
  const includeContact = extras.includeContact !== false;
  fd.append("title", draft.title.trim());
  fd.append("description", draft.description.trim());
  fd.append("price", String(draft.price).replace(/[^\d.]/g, "") || "0");
  fd.append("property_for", draft.propertyFor === "For Rent" ? "rent" : "sell");
  fd.append("property_ownership", mapOwnershipToApi(draft.ownership));
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

  if (extras.propertyTypeId) fd.append("property_type", String(extras.propertyTypeId));
  const isCentListing = draft.areaUnit === "cents";
  if (!isCentListing && draft.bedrooms) fd.append("bedrooms", draft.bedrooms);
  if (!isCentListing && draft.bathrooms) fd.append("bathrooms", draft.bathrooms);
  if (draft.area) fd.append("area", draft.area);
  if (draft.areaUnit) {
    fd.append("area_unit", draft.areaUnit === "cents" ? "cent" : draft.areaUnit);
  }
  if (draft.latitude) fd.append("latitude", draft.latitude);
  if (draft.longitude) fd.append("longitude", draft.longitude);
  if (!isCentListing && draft.furnishing) fd.append("furnishing", draft.furnishing.toLowerCase());
  if (draft.builtYear) fd.append("built_year", draft.builtYear);
  if (draft.parkingSpaces) fd.append("parking_spaces", draft.parkingSpaces);
  if (draft.googleMapUrl) fd.append("google_maps_url", draft.googleMapUrl);
  if (draft.googleEmbedHtml.trim()) {
    fd.append("google_embedded_map_link", draft.googleEmbedHtml.trim());
  }
  if (draft.youtubeLink) fd.append("youtube_video_link", draft.youtubeLink);
  (extras.featureIds ?? []).forEach((id) => fd.append("features", String(id)));
  const nearby = draft.nearbyPlaces.filter((n) => n.name.trim() || n.distanceKm.trim());
  if (nearby.length) {
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
