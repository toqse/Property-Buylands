"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
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
import type { UploadProgressCallback } from "@/lib/api/client";

export type PropertyFormMutationInput =
  | FormData
  | { form: FormData; onUploadProgress?: UploadProgressCallback };

function resolvePropertyFormInput(input: PropertyFormMutationInput) {
  if (input instanceof FormData) {
    return { form: input, onUploadProgress: undefined as UploadProgressCallback | undefined };
  }
  return input;
}

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
  opts: {
    auth?: boolean;
    keepPreviousPage?: boolean;
    staleTime?: number;
  } = {},
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
    staleTime: opts.staleTime,
    placeholderData: opts.keepPreviousPage ? keepPreviousData : undefined,
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
  const { user, hydrated } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.property(id ?? "", user?.id),
    queryFn: async () => {
      const data = await propertiesApi.get(id!);
      return mapApiPropertyToUi(data);
    },
    enabled: !!id && hydrated,
  });

  // While auth restores from localStorage the query is disabled; TanStack Query
  // reports isLoading=false with no data — treat that as loading, not "not found".
  const isBootstrapping = !hydrated;
  const isLoading =
    isBootstrapping ||
    (!!id &&
      (query.isPending || (query.isFetching && query.data === undefined)));

  return {
    ...query,
    isLoading,
    isBootstrapping,
  };
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
      mutationFn: (input: PropertyFormMutationInput) => {
        const { form, onUploadProgress } = resolvePropertyFormInput(input);
        return propertiesApi.create(form, { onUploadProgress });
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        form,
        onUploadProgress,
      }: {
        id: string;
        form: FormData;
        onUploadProgress?: UploadProgressCallback;
      }) => propertiesApi.update(id, form, { onUploadProgress }),
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
    retryVideoProcessing: useMutation({
      mutationFn: (id: string) => propertiesApi.retryVideoProcessing(id),
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
