"use client";

import { Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type PropertyUploadProgressProps = {
  /** True while the create/update request is in flight. */
  active: boolean;
  /** 0–100 when known; null for indeterminate upload. */
  progress: number | null;
  /** When true, copy and visuals refer to video upload. */
  hasVideo?: boolean;
  className?: string;
};

function CircularUploadProgress({
  value,
  indeterminate,
}: {
  value: number | null;
  indeterminate: boolean;
}) {
  const size = 52;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = value != null ? Math.min(100, Math.max(0, value)) : 0;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-amber-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(
            "text-amber-600 transition-[stroke-dashoffset] duration-300",
            indeterminate && "animate-spin origin-center",
          )}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: indeterminate ? circumference * 0.25 : offset,
          }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular-nums text-amber-900">
        {indeterminate ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
        ) : (
          `${clamped}%`
        )}
      </span>
    </div>
  );
}

/**
 * Shown while a property form is submitting with a new video file.
 * Uses real XMLHttpRequest upload progress (browser → API).
 */
export function PropertyUploadProgress({
  active,
  progress,
  hasVideo = true,
  className,
}: PropertyUploadProgressProps) {
  if (!active) return null;

  const indeterminate = progress == null;
  const label = hasVideo
    ? indeterminate
      ? "Uploading video…"
      : progress >= 100
        ? "Finishing upload…"
        : `Uploading video… ${progress}%`
    : "Saving property…";

  return (
    <div
      className={cn(
        "w-full space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-4">
        {hasVideo ? (
          <CircularUploadProgress
            value={progress}
            indeterminate={indeterminate}
          />
        ) : (
          <Loader2 className="h-9 w-9 shrink-0 animate-spin text-amber-700" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-950">{label}</p>
          <p className="text-xs leading-relaxed text-amber-900/75">
            {hasVideo
              ? "Please keep this window open. Video compression runs in the background after the upload finishes."
              : "Please wait while your listing is saved."}
          </p>
        </div>
      </div>
      {hasVideo ? (
        <Progress
          value={indeterminate ? undefined : progress ?? 0}
          className="h-2 bg-amber-100 [&>div]:bg-amber-600"
        />
      ) : null}
    </div>
  );
}
