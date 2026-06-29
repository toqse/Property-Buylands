export type VideoProcessingStatus = "processing" | "ready" | "failed" | null | undefined;

export const VIDEO_PROCESSING_POLL_MS = 5000;

export function hasPropertyUploadedVideo(videoUrl?: string | null): boolean {
  if (!videoUrl) return false;
  return (
    !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")
  );
}

export function needsVideoProcessingPolling(item: {
  videoProcessingStatus?: VideoProcessingStatus;
  videoUrl?: string | null;
}): boolean {
  if (item.videoProcessingStatus === "processing") return true;
  if (
    (item.videoProcessingStatus == null || item.videoProcessingStatus === undefined) &&
    hasPropertyUploadedVideo(item.videoUrl)
  ) {
    return true;
  }
  return false;
}

export function videoProcessingStatusLabel(
  status: VideoProcessingStatus,
): string | null {
  switch (status) {
    case "processing":
      return "Video is being processed...";
    case "ready":
      return "Video ready";
    case "failed":
      return "Video processing failed";
    default:
      return null;
  }
}

export function videoProcessingStatusTone(
  status: VideoProcessingStatus,
): "muted" | "success" | "warning" | "destructive" {
  switch (status) {
    case "processing":
      return "warning";
    case "ready":
      return "success";
    case "failed":
      return "destructive";
    default:
      return "muted";
  }
}

export function videoProcessingPollInterval(
  items: { videoProcessingStatus?: VideoProcessingStatus; videoUrl?: string | null }[],
): number | false {
  return items.some(needsVideoProcessingPolling)
    ? VIDEO_PROCESSING_POLL_MS
    : false;
}
