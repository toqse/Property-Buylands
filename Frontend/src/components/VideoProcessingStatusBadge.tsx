"use client";

import { AlertCircle, CheckCircle2, Loader2, Minus, RotateCcw } from "lucide-react";

import {
  videoProcessingStatusLabel,
  type VideoProcessingStatus,
} from "@/lib/videoProcessingStatus";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type VideoProcessingStatusBadgeProps = {
  status?: VideoProcessingStatus;
  /** When false and no status, shows an em dash (no uploaded video). */
  hasUploadedVideo?: boolean;
  /** Compact style for table cells; default for cards. */
  variant?: "table" | "card";
  className?: string;
  /** When set, shows a Retry control for failed status. */
  onRetry?: () => void;
  retrying?: boolean;
};

export function hasPropertyUploadedVideo(
  videoUrl?: string | null,
): boolean {
  if (!videoUrl) return false;
  return (
    !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")
  );
}

export function VideoProcessingStatusBadge({
  status,
  hasUploadedVideo = false,
  variant = "table",
  className,
  onRetry,
  retrying = false,
}: VideoProcessingStatusBadgeProps) {
  if (!hasUploadedVideo && !status) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-muted-foreground",
          variant === "table" ? "text-xs" : "text-sm",
          className,
        )}
        title="No uploaded video"
      >
        <Minus className="h-3 w-3" aria-hidden />
        <span className="sr-only">No video</span>
      </span>
    );
  }

  const resolved: VideoProcessingStatus =
    status ?? (hasUploadedVideo ? "processing" : null);

  if (!resolved) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>—</span>
    );
  }

  const label = videoProcessingStatusLabel(resolved) ?? resolved;

  if (resolved === "processing") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800",
          variant === "card" && "text-xs px-3 py-1.5",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
        <span className="whitespace-nowrap">Compressing…</span>
      </span>
    );
  }

  if (resolved === "failed") {
    return (
      <span
        className={cn(
          "inline-flex flex-wrap items-center gap-1.5",
          variant === "card" && "gap-2",
          className,
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive",
            variant === "card" && "text-xs px-3 py-1.5",
          )}
          role="status"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">Failed</span>
        </span>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="h-3 w-3" aria-hidden />
            )}
            Retry
          </Button>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-300/50 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800",
        variant === "card" && "text-xs px-3 py-1.5",
        className,
      )}
      title={label}
      role="status"
    >
      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">Ready</span>
    </span>
  );
}
