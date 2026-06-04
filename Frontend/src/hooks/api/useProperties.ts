"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildPropertyListParams,
  propertiesApi,
  type PropertyListParams,
} from "@/lib/api/properties";
import { mapApiPropertyToUi } from "@/lib/api/mappers/property";
import { mapApiAdToUi } from "@/lib/api/mappers/advertisement";
import type { ApiProperty, FeedItem } from "@/lib/api/types";
import type { Property } from "@/data/mockData";
import type { Advertisement } from "@/data/advertisements";
import { queryKeys } from "./queryKeys";

export type ListingFeedItem =
  | { kind: "property"; property: Property }
  | { kind: "ad"; ad: Advertisement };

function normalizeFeedItem(item: FeedItem | ApiProperty): ListingFeedItem | null {
  if ("type" in item && item.type === "ad") {
    return { kind: "ad", ad: mapApiAdToUi(item.data) };
  }
  if ("type" in item && item.type === "property") {
    return { kind: "property", property: mapApiPropertyToUi(item.data) };
  }
  return { kind: "property", property: mapApiPropertyToUi(item as ApiProperty) };
}

export function usePropertyList(
  filters: Parameters<typeof buildPropertyListParams>[0] = {},
  opts: { auth?: boolean } = {},
) {
  const params = buildPropertyListParams(filters);
  return useQuery({
    queryKey: queryKeys.properties({ ...params, __auth: opts.auth ? 1 : 0 }),
    queryFn: async () => {
      const page = await propertiesApi.list(params, { auth: opts.auth });
      const items = page.results
        .map(normalizeFeedItem)
        .filter((x): x is ListingFeedItem => x !== null);
      return { ...page, items };
    },
  });
}

export function usePropertyLocations(filters: Parameters<typeof buildPropertyListParams>[0] = {}) {
  const params = buildPropertyListParams(filters);
  return useQuery({
    queryKey: queryKeys.locations(params),
    queryFn: () => propertiesApi.locations(params),
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.property(id ?? ""),
    queryFn: async () => {
      const data = await propertiesApi.get(id!);
      return mapApiPropertyToUi(data);
    },
    enabled: !!id,
  });
}

export function useMyProperties(params: PropertyListParams = {}) {
  return useQuery({
    queryKey: queryKeys.myProperties(params),
    queryFn: async () => {
      const page = await propertiesApi.mine(params);
      return {
        ...page,
        items: page.results.map(mapApiPropertyToUi),
      };
    },
  });
}

export function usePropertyMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["properties"] });
    void qc.invalidateQueries({ queryKey: ["myProperties"] });
    void qc.invalidateQueries({ queryKey: ["property"] });
  };

  return {
    create: useMutation({
      mutationFn: (form: FormData) => propertiesApi.create(form),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, form }: { id: string; form: FormData }) => propertiesApi.update(id, form),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => propertiesApi.delete(id),
      onSuccess: invalidate,
    }),
    deleteImage: useMutation({
      mutationFn: ({ id, imageId }: { id: string; imageId: number }) =>
        propertiesApi.deleteImage(id, imageId),
      onSuccess: invalidate,
    }),
    removeVideo: useMutation({
      mutationFn: (id: string) => propertiesApi.removeVideo(id),
      onSuccess: invalidate,
    }),
    approve: useMutation({
      mutationFn: (id: string) => propertiesApi.approve(id),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
        propertiesApi.reject(id, reason),
      onSuccess: invalidate,
    }),
  };
}
