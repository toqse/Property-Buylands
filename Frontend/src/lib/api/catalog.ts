import { apiRequest, asList, toQueryString, unwrapPaginated, type PaginatedResponse } from "@/lib/api/client";
import type {
  ApiAdminImage,
  ApiCity,
  ApiDistrict,
  ApiFeature,
  ApiPropertyType,
  ApiState,
} from "@/lib/api/types";

function crudPaginated<T>(base: string) {
  return {
    list: (params: Record<string, string | number> = {}) =>
      apiRequest<PaginatedResponse<T>>(`${base}/${toQueryString(params)}`, { auth: true }).then(
        unwrapPaginated,
      ),
    get: (id: number | string) => apiRequest<T>(`${base}/${id}/`, { auth: true }),
    create: (body: FormData | Record<string, unknown>) =>
      apiRequest<T>(`${base}/`, {
        method: "POST",
        auth: true,
        body: body instanceof FormData ? body : body,
      }),
    update: (id: number | string, body: FormData | Record<string, unknown>) =>
      apiRequest<T>(`${base}/${id}/`, {
        method: "PATCH",
        auth: true,
        body: body instanceof FormData ? body : body,
      }),
    delete: (id: number | string) =>
      apiRequest<void>(`${base}/${id}/`, { method: "DELETE", auth: true }),
  };
}

export const catalogApi = {
  features: {
    list: (params: Record<string, string | number> = {}) =>
      apiRequest<ApiFeature[]>(`properties/features/${toQueryString(params)}`, { auth: true }).then(
        (arr) => asList(arr),
      ),
    get: (id: number | string) =>
      apiRequest<ApiFeature>(`properties/features/${id}/`, { auth: true }),
    create: (body: { name: string }) =>
      apiRequest<ApiFeature>("properties/features/", {
        method: "POST",
        auth: true,
        body,
      }),
    update: (id: number | string, body: { name: string }) =>
      apiRequest<ApiFeature>(`properties/features/${id}/`, {
        method: "PATCH",
        auth: true,
        body,
      }),
    delete: (id: number | string) =>
      apiRequest<void>(`properties/features/${id}/`, { method: "DELETE", auth: true }),
  },
  propertyTypes: {
    list: (params: Record<string, string | number> = {}) =>
      apiRequest<ApiPropertyType[]>(`properties/property-types/${toQueryString(params)}`, {
        auth: true,
      }).then((arr) => asList(arr)),
    listPublic: (params: Record<string, string | number> = {}) =>
      apiRequest<ApiPropertyType[]>(`properties/property-types/${toQueryString(params)}`).then(
        (arr) => asList(arr),
      ),
    get: (id: number | string) =>
      apiRequest<ApiPropertyType>(`properties/property-types/${id}/`, { auth: true }),
    create: (form: FormData) =>
      apiRequest<ApiPropertyType>("properties/property-types/", {
        method: "POST",
        auth: true,
        body: form,
      }),
    update: (id: number | string, form: FormData) =>
      apiRequest<ApiPropertyType>(`properties/property-types/${id}/`, {
        method: "PATCH",
        auth: true,
        body: form,
      }),
    delete: (id: number | string) =>
      apiRequest<void>(`properties/property-types/${id}/`, { method: "DELETE", auth: true }),
  },
  adminImages: crudPaginated<ApiAdminImage>("properties/admin-images"),
  states: crudPaginated<ApiState>("properties/states"),
  districts: crudPaginated<ApiDistrict>("properties/districts"),
  cities: crudPaginated<ApiCity>("properties/cities"),
  nearbyPlaces: crudPaginated<{ id: number; name: string }>("properties/nearby-places"),
  nearbyPlaceDistances: crudPaginated<{ id: number }>("properties/nearby-place-distances"),
};
