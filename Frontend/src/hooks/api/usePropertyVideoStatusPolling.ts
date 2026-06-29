"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Property } from "@/data/mockData";
import type { ApiPropertyVideoProcessingStatus } from "@/lib/api/types";
import { propertiesApi } from "@/lib/api/properties";
import {
  needsVideoProcessingPolling,
  VIDEO_PROCESSING_POLL_MS,
} from "@/lib/videoProcessingStatus";
import type { ListingFeedItem } from "./useProperties";

function applyVideoStatusUpdate(
  property: Property,
  update: ApiPropertyVideoProcessingStatus,
): Property {
  if (String(property.id) !== String(update.id)) return property;
  return {
    ...property,
    videoProcessingStatus: update.video_processing_status ?? null,
    videoUrl: update.property_video_url ?? property.videoUrl,
    videoThumbnail: update.video_thumbnail_url ?? property.videoThumbnail,
  };
}

export function patchPropertyVideoStatusInCache(
  queryClient: QueryClient,
  updates: ApiPropertyVideoProcessingStatus[],
) {
  if (!updates.length) return;

  const byId = new Map(updates.map((u) => [String(u.id), u]));

  queryClient.setQueriesData(
    { queryKey: ["myProperties"] },
    (old: { items?: Property[] } | undefined) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((p) => {
          const update = byId.get(String(p.id));
          return update ? applyVideoStatusUpdate(p, update) : p;
        }),
      };
    },
  );

  queryClient.setQueriesData(
    { queryKey: ["properties"] },
    (old: { items?: ListingFeedItem[] } | undefined) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((item) => {
          if (item.kind !== "property") return item;
          const update = byId.get(String(item.property.id));
          if (!update) return item;
          return {
            ...item,
            property: applyVideoStatusUpdate(item.property, update),
          };
        }),
      };
    },
  );
}

/** Polls the batch video-status endpoint while any listed property is compressing. */
export function usePropertyVideoStatusPolling(items: Property[]) {
  const queryClient = useQueryClient();

  const pollingIdsKey = items
    .filter(needsVideoProcessingPolling)
    .map((p) => p.id)
    .sort()
    .join(",");

  useEffect(() => {
    const ids = pollingIdsKey ? pollingIdsKey.split(",") : [];
    if (!ids.length) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { results } = await propertiesApi.getVideoProcessingStatuses(ids);
        if (cancelled) return;
        patchPropertyVideoStatusInCache(queryClient, results);
      } catch {
        // Ignore transient poll errors; next interval retries.
      }
    };

    void poll();
    const interval = setInterval(poll, VIDEO_PROCESSING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollingIdsKey, queryClient]);
}
