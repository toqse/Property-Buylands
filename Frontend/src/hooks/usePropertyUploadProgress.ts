"use client";

import { useCallback, useState } from "react";

import type { UploadProgressCallback } from "@/lib/api/client";

export function usePropertyUploadProgress() {
  const [progress, setProgress] = useState<number | null>(null);
  const [trackingVideo, setTrackingVideo] = useState(false);

  const makeUploadProgressHandler = useCallback(
    (hasVideo: boolean): UploadProgressCallback | undefined => {
      if (!hasVideo) return undefined;
      setTrackingVideo(true);
      setProgress(0);
      return (info) => {
        setProgress(info.percent);
      };
    },
    [],
  );

  const clearUploadProgress = useCallback(() => {
    setProgress(null);
    setTrackingVideo(false);
  }, []);

  const isUploading = progress !== null || trackingVideo;

  return {
    progress,
    trackingVideo,
    isUploading,
    makeUploadProgressHandler,
    clearUploadProgress,
  };
}
