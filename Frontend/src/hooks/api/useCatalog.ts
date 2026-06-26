"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { catalogApi } from "@/lib/api/catalog";
import { contentApi } from "@/lib/api/content";
import { advertisementsApi } from "@/lib/api/advertisements";
import { contactsApi } from "@/lib/api/contacts";
import { accountsApi } from "@/lib/api/accounts";
import { mapApiAdToUi } from "@/lib/api/mappers/advertisement";
import { mapApiContactToEnquiry } from "@/lib/api/mappers/enquiry";
import { mapApiTestimonialToUi } from "@/lib/api/mappers/testimonial";
import { queryKeys } from "./queryKeys";

export function usePropertyTypes() {
  return useQuery({
    queryKey: queryKeys.propertyTypes,
    queryFn: () => catalogApi.propertyTypes.listPublic({ page_size: 1000 }),
  });
}

export function useAdminPropertyTypes() {
  return useQuery({
    queryKey: [...queryKeys.propertyTypes, "admin"],
    queryFn: () => catalogApi.propertyTypes.list({ page_size: 1000 }),
  });
}

export function useAdminPropertyTypesPaged(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: [...queryKeys.propertyTypes, "admin", params],
    queryFn: () => catalogApi.propertyTypes.list(params),
  });
}

export function useFeatures() {
  return useQuery({
    queryKey: queryKeys.features,
    queryFn: () => catalogApi.features.list({ page_size: 1000 }),
  });
}

export function useFeaturesPaged(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: [...queryKeys.features, params],
    queryFn: () => catalogApi.features.list(params),
  });
}

export function useTestimonials() {
  return useQuery({
    queryKey: queryKeys.testimonials,
    queryFn: async () => {
      const res = await contentApi.testimonials.listPublic({ limit: 50 });
      return {
        section: res.section,
        results: (res.results ?? []).map(mapApiTestimonialToUi),
      };
    },
  });
}

export function useAdminTestimonials() {
  return useQuery({
    queryKey: [...queryKeys.testimonials, "admin"],
    queryFn: async () => {
      const res = await contentApi.testimonials.list({ limit: 50 });
      return {
        section: res.section,
        results: (res.results ?? []).map(mapApiTestimonialToUi),
      };
    },
  });
}

export function useHeroBanners() {
  return useQuery({
    queryKey: queryKeys.heroBanners,
    queryFn: () => contentApi.heroBanners.list(),
  });
}

export function useOfferBanners() {
  return useQuery({
    queryKey: queryKeys.offerBanners,
    queryFn: () => contentApi.offerBanners.list(),
  });
}

export function useCompanyContact() {
  return useQuery({
    queryKey: queryKeys.companyContact,
    queryFn: () => contentApi.companyContact(),
  });
}

export function useSiteSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.siteSettings,
    queryFn: () => contentApi.siteSettings.get(),
    // Site settings are admin-only (the endpoint requires auth). Skip the call
    // on the public site so anonymous visitors don't trigger failing requests.
    enabled,
  });
}

export function useMobileAppSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.mobileAppSettings,
    queryFn: () => contentApi.mobileAppSettings.get(),
    enabled,
  });
}

export function useActiveAds(
  placement: string,
  loc?: { latitude?: number; longitude?: number; state_id?: number; district_id?: number; city_id?: number },
) {
  return useQuery({
    queryKey: queryKeys.activeAds(placement, loc),
    queryFn: async () => {
      const ads = await advertisementsApi.active({ placement, ...loc });
      return ads.map(mapApiAdToUi);
    },
  });
}

export function useContacts(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: queryKeys.contacts(params),
    queryFn: async () => {
      const page = await contactsApi.list(params);
      return { ...page, items: page.results.map(mapApiContactToEnquiry) };
    },
  });
}

export function useOwners(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: queryKeys.owners(params),
    queryFn: () => accountsApi.listOwners(params),
  });
}

export function useStates() {
  return useQuery({
    queryKey: queryKeys.states,
    queryFn: () => catalogApi.states.list({ page_size: 100 }),
  });
}

/** Server-side paginated + searchable states list, for admin tables. */
export function useStatesPaged(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: [...queryKeys.states, "paged", params],
    queryFn: () => catalogApi.states.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useDistricts(stateId?: number, search?: string) {
  return useQuery({
    queryKey: [...queryKeys.districts(stateId), "search", search ?? ""],
    queryFn: () =>
      catalogApi.districts.list({
        state_id: stateId!,
        page_size: 100,
        ...(search ? { search } : {}),
      }),
    enabled: !!stateId,
    placeholderData: keepPreviousData,
  });
}

/** Server-side paginated + searchable districts list, for admin tables. */
export function useDistrictsPaged(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: [...queryKeys.districts(), "paged", params],
    queryFn: () => catalogApi.districts.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCities(districtId?: number) {
  return useQuery({
    queryKey: queryKeys.cities(districtId),
    queryFn: () =>
      catalogApi.cities.list({ district_id: districtId!, page_size: 100 }),
    enabled: !!districtId,
  });
}

export function useAllDistricts() {
  return useQuery({
    queryKey: [...queryKeys.districts(), "all"],
    queryFn: () => catalogApi.districts.list({ page_size: 500 }),
  });
}

export function useAllCities() {
  return useQuery({
    queryKey: [...queryKeys.cities(), "all"],
    queryFn: () => catalogApi.cities.list({ page_size: 500 }),
  });
}

export function useAdminAds(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: queryKeys.adminAds(params),
    queryFn: async () => {
      const page = await advertisementsApi.listAdmin(params);
      return { ...page, items: page.results.map(mapApiAdToUi) };
    },
  });
}

export function useCatalogMutations() {
  const qc = useQueryClient();
  const inv = (keys: string[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

  return {
    patchSiteSettings: useMutation({
      mutationFn: contentApi.siteSettings.patch,
      onSuccess: () => inv(["siteSettings"]),
    }),
    patchMobileAppSettings: useMutation({
      mutationFn: contentApi.mobileAppSettings.patch,
      onSuccess: () => inv(["mobileAppSettings"]),
    }),
    createPropertyType: useMutation({
      mutationFn: (form: FormData) => catalogApi.propertyTypes.create(form),
      onSuccess: () => inv(["propertyTypes"]),
    }),
    updatePropertyType: useMutation({
      mutationFn: ({ id, form }: { id: number; form: FormData }) =>
        catalogApi.propertyTypes.update(id, form),
      onSuccess: () => inv(["propertyTypes"]),
    }),
    deletePropertyType: useMutation({
      mutationFn: (id: number) => catalogApi.propertyTypes.delete(id),
      onSuccess: () => inv(["propertyTypes"]),
    }),
    createFeature: useMutation({
      mutationFn: (body: { name: string }) => catalogApi.features.create(body),
      onSuccess: () => inv(["features"]),
    }),
    updateFeature: useMutation({
      mutationFn: ({ id, body }: { id: number; body: { name: string } }) =>
        catalogApi.features.update(id, body),
      onSuccess: () => inv(["features"]),
    }),
    deleteFeature: useMutation({
      mutationFn: (id: number) => catalogApi.features.delete(id),
      onSuccess: () => inv(["features"]),
    }),
    createState: useMutation({
      mutationFn: (body: Record<string, unknown>) => catalogApi.states.create(body),
      onSuccess: () => inv(["states"]),
    }),
    updateState: useMutation({
      mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
        catalogApi.states.update(id, body),
      onSuccess: () => inv(["states"]),
    }),
    deleteState: useMutation({
      mutationFn: (id: number) => catalogApi.states.delete(id),
      onSuccess: () => inv(["states"]),
    }),
    createDistrict: useMutation({
      mutationFn: (body: Record<string, unknown>) => catalogApi.districts.create(body),
      onSuccess: () => inv(["districts"]),
    }),
    updateDistrict: useMutation({
      mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
        catalogApi.districts.update(id, body),
      onSuccess: () => inv(["districts"]),
    }),
    deleteDistrict: useMutation({
      mutationFn: (id: number) => catalogApi.districts.delete(id),
      onSuccess: () => inv(["districts"]),
    }),
    createCity: useMutation({
      mutationFn: (body: Record<string, unknown>) => catalogApi.cities.create(body),
      onSuccess: () => inv(["cities"]),
    }),
    updateCity: useMutation({
      mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
        catalogApi.cities.update(id, body),
      onSuccess: () => inv(["cities"]),
    }),
    deleteCity: useMutation({
      mutationFn: (id: number) => catalogApi.cities.delete(id),
      onSuccess: () => inv(["cities"]),
    }),
    submitContact: useMutation({
      mutationFn: contactsApi.submit,
      onSuccess: () => inv(["contacts"]),
    }),
    deleteContact: useMutation({
      mutationFn: (id: number) => contactsApi.delete(id),
      onSuccess: () => inv(["contacts"]),
    }),
    createAd: useMutation({
      mutationFn: (form: FormData) => advertisementsApi.create(form),
      onSuccess: () => inv(["adminAds", "activeAds"]),
    }),
    updateAd: useMutation({
      mutationFn: ({ id, form }: { id: number; form: FormData }) =>
        advertisementsApi.update(id, form),
      onSuccess: () => inv(["adminAds", "activeAds"]),
    }),
    deleteAd: useMutation({
      mutationFn: (id: number) => advertisementsApi.delete(id),
      onSuccess: () => inv(["adminAds", "activeAds"]),
    }),
    createHeroBanner: useMutation({
      mutationFn: (form: FormData) => contentApi.heroBanners.create(form),
      onSuccess: () => inv(["heroBanners"]),
    }),
    deleteHeroBanner: useMutation({
      mutationFn: (id: number) => contentApi.heroBanners.delete(id),
      onSuccess: () => inv(["heroBanners"]),
    }),
    createOfferBanner: useMutation({
      mutationFn: (form: FormData) => contentApi.offerBanners.create(form),
      onSuccess: () => inv(["offerBanners"]),
    }),
    deleteOfferBanner: useMutation({
      mutationFn: (id: number) => contentApi.offerBanners.delete(id),
      onSuccess: () => inv(["offerBanners"]),
    }),
    createTestimonial: useMutation({
      mutationFn: (form: FormData) => contentApi.testimonials.create(form),
      onSuccess: () => inv(["testimonials"]),
    }),
    updateTestimonial: useMutation({
      mutationFn: ({ id, form }: { id: number; form: FormData | Record<string, unknown> }) =>
        contentApi.testimonials.update(id, form),
      onSuccess: () => inv(["testimonials"]),
    }),
    deleteTestimonial: useMutation({
      mutationFn: (id: number) => contentApi.testimonials.delete(id),
      onSuccess: () => inv(["testimonials"]),
    }),
    patchOwner: useMutation({
      mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
        accountsApi.patchOwner(id, body),
      onSuccess: () => inv(["owners"]),
    }),
    deleteOwner: useMutation({
      mutationFn: (id: number) => accountsApi.deleteOwner(id),
      onSuccess: () => inv(["owners"]),
    }),
  };
}
