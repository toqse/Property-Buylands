import { apiRequest, toQueryString, unwrapPaginated, type PaginatedResponse } from "@/lib/api/client";
import type { ApiProperty, FeedItem } from "@/lib/api/types";

export type PropertyListParams = Record<string, string | number | boolean | undefined>;

export function buildPropertyListParams(filters: {
  page?: number;
  pageSize?: number;
  search?: string;
  propertyFor?: "rent" | "sell";
  priceMin?: number;
  priceMax?: number;
  propertyType?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
  features?: number[];
  stateId?: number;
  districtId?: number;
  cityId?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  furnishing?: string;
  areaMin?: string | number;
  areaMax?: string | number;
  areaUnit?: string;
  areaCentMin?: string | number;
  areaCentMax?: string | number;
  projectStatus?: string;
  floors?: string;
  sighting?: string;
  parkingSpacesMin?: number;
  includeAds?: boolean;
  moderationStatus?: string;
  featured?: boolean;
  ordering?: string;
}): PropertyListParams {
  const p: PropertyListParams = {};
  if (filters.page) p.page = filters.page;
  if (filters.pageSize) p.page_size = filters.pageSize;
  if (filters.search) p.search = filters.search;
  if (filters.propertyFor) p.property_for = filters.propertyFor;
  if (filters.priceMin != null) p.price_min = filters.priceMin;
  if (filters.priceMax != null) p.price_max = filters.priceMax;
  if (filters.propertyType) p.property_type = filters.propertyType;
  if (filters.bedroomsMin != null) p.bedrooms_min = filters.bedroomsMin;
  if (filters.bedroomsMax != null) p.bedrooms_max = filters.bedroomsMax;
  if (filters.bathroomsMin != null) p.bathrooms_min = filters.bathroomsMin;
  if (filters.bathroomsMax != null) p.bathrooms_max = filters.bathroomsMax;
  if (filters.features && filters.features.length) p.features = filters.features.join(",");
  if (filters.stateId) p.state_id = filters.stateId;
  if (filters.districtId) p.district_id = filters.districtId;
  if (filters.cityId) p.city_id = filters.cityId;
  if (filters.location) p.location = filters.location;
  if (filters.latitude != null) p.latitude = filters.latitude;
  if (filters.longitude != null) p.longitude = filters.longitude;
  if (filters.radius != null) p.radius = filters.radius;
  if (filters.furnishing) p.furnishing = filters.furnishing;
  if (filters.areaMin != null && String(filters.areaMin).trim())
    p.area_min = filters.areaMin;
  if (filters.areaMax != null && String(filters.areaMax).trim())
    p.area_max = filters.areaMax;
  if (filters.areaUnit) p.area_unit = filters.areaUnit;
  if (filters.areaCentMin != null && String(filters.areaCentMin).trim())
    p.area_cent_min = filters.areaCentMin;
  if (filters.areaCentMax != null && String(filters.areaCentMax).trim())
    p.area_cent_max = filters.areaCentMax;
  if (filters.projectStatus) p.project_status = filters.projectStatus;
  if (filters.floors) p.floors = filters.floors;
  if (filters.sighting) p.sighting = filters.sighting;
  if (filters.parkingSpacesMin != null) p.parking_spaces_min = filters.parkingSpacesMin;
  if (filters.includeAds === true) p.include_ads = true;
  if (filters.includeAds === false) p.include_ads = false;
  if (filters.moderationStatus) p.moderation_status = filters.moderationStatus;
  if (filters.featured != null) p.is_featured = filters.featured;
  if (filters.ordering) p.ordering = filters.ordering;
  return p;
}

export const propertiesApi = {
  list(params: PropertyListParams = {}, opts: { auth?: boolean } = {}) {
    return apiRequest<PaginatedResponse<FeedItem | ApiProperty>>(
      `properties/properties/${toQueryString(params)}`,
      { auth: opts.auth === true },
    ).then(unwrapPaginated);
  },

  get(idOrSlug: string) {
    return apiRequest<ApiProperty>(`properties/properties/${idOrSlug}/`, {
      auth: true,
    });
  },

  mine(params: PropertyListParams = {}) {
    return apiRequest<PaginatedResponse<ApiProperty>>(
      `properties/properties/mine/${toQueryString(params)}`,
      { auth: true },
    ).then(unwrapPaginated);
  },

  create(form: FormData, opts: { onUploadProgress?: import("@/lib/api/client").UploadProgressCallback } = {}) {
    return apiRequest<ApiProperty>("properties/properties/", {
      method: "POST",
      auth: true,
      body: form,
      onUploadProgress: opts.onUploadProgress,
    });
  },

  update(
    id: string | number,
    form: FormData,
    opts: { onUploadProgress?: import("@/lib/api/client").UploadProgressCallback } = {},
  ) {
    return apiRequest<ApiProperty>(`properties/properties/${id}/`, {
      method: "PATCH",
      auth: true,
      body: form,
      onUploadProgress: opts.onUploadProgress,
    });
  },

  delete(id: string | number) {
    return apiRequest<void>(`properties/properties/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },

  approve(id: string | number) {
    return apiRequest<ApiProperty>(`properties/properties/${id}/approve/`, {
      method: "POST",
      auth: true,
    });
  },

  reject(id: string | number, reason?: string) {
    return apiRequest<ApiProperty>(`properties/properties/${id}/reject/`, {
      method: "POST",
      auth: true,
      body: reason ? { reason } : {},
    });
  },

  deleteImage(propertyId: string | number, imageId: number) {
    return apiRequest<void>(`properties/properties/${propertyId}/delete_image/`, {
      method: "DELETE",
      auth: true,
      body: { image_id: imageId },
    });
  },

  removeVideo(propertyId: string | number) {
    const fd = new FormData();
    fd.append("remove_video", "true");
    return apiRequest<ApiProperty>(`properties/properties/${propertyId}/`, {
      method: "PATCH",
      auth: true,
      body: fd,
    });
  },

  retryVideoProcessing(id: string | number) {
    return apiRequest<ApiProperty>(
      `properties/properties/${id}/retry-video-processing/`,
      {
        method: "POST",
        auth: true,
      },
    );
  },

  locations(params: PropertyListParams = {}) {
    return apiRequest<PaginatedResponse<import("@/lib/api/types").ApiLocationResult>>(
      `properties/locations/${toQueryString(params)}`,
    ).then(unwrapPaginated);
  },
};
