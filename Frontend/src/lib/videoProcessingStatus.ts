export type VideoProcessingStatus = "processing" | "ready" | "failed" | null | undefined;

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
  items: { videoProcessingStatus?: VideoProcessingStatus }[],
): number | false {
  return items.some((item) => item.videoProcessingStatus === "processing")
    ? 5000
    : false;
}
