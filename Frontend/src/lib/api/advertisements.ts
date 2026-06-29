import { apiRequest, toQueryString, unwrapPaginated, type PaginatedResponse } from "@/lib/api/client";
import type { ApiAdvertisement } from "@/lib/api/types";

export const advertisementsApi = {
  listAdmin(params: Record<string, string | number | boolean> = {}) {
    return apiRequest<PaginatedResponse<ApiAdvertisement>>(
      `advertisements/${toQueryString(params)}`,
      { auth: true },
    ).then(unwrapPaginated);
  },

  getAdmin(id: number | string) {
    return apiRequest<ApiAdvertisement>(`advertisements/${id}/`, { auth: true });
  },

  create(form: FormData, opts: { onUploadProgress?: import("@/lib/api/client").UploadProgressCallback } = {}) {
    return apiRequest<ApiAdvertisement>("advertisements/", {
      method: "POST",
      auth: true,
      body: form,
      onUploadProgress: opts.onUploadProgress,
    });
  },

  update(
    id: number | string,
    form: FormData,
    opts: { onUploadProgress?: import("@/lib/api/client").UploadProgressCallback } = {},
  ) {
    return apiRequest<ApiAdvertisement>(`advertisements/${id}/`, {
      method: "PATCH",
      auth: true,
      body: form,
      onUploadProgress: opts.onUploadProgress,
    });
  },

  delete(id: number | string) {
    return apiRequest<void>(`advertisements/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },

  active(params: {
    placement: string;
    latitude?: number;
    longitude?: number;
    state_id?: number;
    district_id?: number;
    city_id?: number;
  }) {
    return apiRequest<ApiAdvertisement[]>(
      `advertisements/active/${toQueryString(params)}`,
    );
  },
};
