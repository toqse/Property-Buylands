import { apiRequest, asList, toQueryString } from "@/lib/api/client";
import type {
  ApiCompanyContact,
  ApiHeroBanner,
  ApiOfferBanner,
  ApiSiteSettings,
  ApiTestimonial,
  ApiTestimonialsListResponse,
} from "@/lib/api/types";

function bannerCrud<T extends ApiHeroBanner | ApiOfferBanner>(base: string) {
  return {
    list: () => apiRequest<T[]>(`${base}/`).then((arr) => asList(arr)),
    create: (form: FormData) =>
      apiRequest<T>(`${base}/`, {
        method: "POST",
        auth: true,
        body: form,
      }),
    delete: (id: number | string) =>
      apiRequest<void>(`${base}/${id}/`, { method: "DELETE", auth: true }),
  };
}

export const contentApi = {
  heroBanners: bannerCrud<ApiHeroBanner>("properties/hero-banners"),
  offerBanners: bannerCrud<ApiOfferBanner>("properties/offer-banners"),
  testimonials: {
    list: (params: Record<string, string | number> = {}) =>
      apiRequest<ApiTestimonialsListResponse>(
        `properties/testimonials/${toQueryString(params)}`,
        { auth: true },
      ),
    listPublic: (params: Record<string, string | number> = {}) =>
      apiRequest<ApiTestimonialsListResponse>(
        `properties/testimonials/${toQueryString(params)}`,
      ),
    get: (id: number | string) =>
      apiRequest<ApiTestimonial>(`properties/testimonials/${id}/`, { auth: true }),
    create: (body: FormData) =>
      apiRequest<ApiTestimonial>("properties/testimonials/", {
        method: "POST",
        auth: true,
        body,
      }),
    update: (id: number | string, body: FormData | Record<string, unknown>) =>
      apiRequest<ApiTestimonial>(`properties/testimonials/${id}/`, {
        method: "PATCH",
        auth: true,
        body,
      }),
    delete: (id: number | string) =>
      apiRequest<void>(`properties/testimonials/${id}/`, { method: "DELETE", auth: true }),
  },
  siteSettings: {
    get: () => apiRequest<ApiSiteSettings>("properties/site-settings/", { auth: true }),
    patch: (body: Partial<ApiSiteSettings>) =>
      apiRequest<ApiSiteSettings>("properties/site-settings/", {
        method: "PATCH",
        auth: true,
        body,
      }),
  },
  siteContact: () => apiRequest<ApiCompanyContact>("properties/site-contact/"),
  companyContact: () => apiRequest<ApiCompanyContact>("properties/company-contact/"),
};
