"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a property thumbnail. When a video is available, the video thumbnail
 * is shown as the poster with a subtle play button in the top-right corner;
 * pressing it plays the video inline (without navigating away from the card).
 */
export function PropertyMediaThumb({
  image,
  videoUrl,
  videoThumbnail,
  alt,
  imgClassName,
  playButtonClassName,
}: {
  image: string;
  videoUrl?: string;
  videoThumbnail?: string;
  alt: string;
  imgClassName?: string;
  playButtonClassName?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Always show the property's first image as the thumbnail; the video (if any)
  // still plays inline via the play button and uses the same image as poster.
  const poster = image || videoThumbnail;
  const hasVideo = Boolean(videoUrl);

  if (hasVideo && playing) {
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        poster={poster}
        autoPlay
        playsInline
        onClick={(e) => {
          // Keep clicks on the player from triggering the surrounding link, and
          // toggle play/pause inline (no controls on cards).
          e.preventDefault();
          e.stopPropagation();
          const el = videoRef.current;
          if (!el) return;
          if (el.paused) void el.play();
          else el.pause();
        }}
        className={cn("h-full w-full bg-black object-cover", imgClassName)}
      />
    );
  }

  return (
    <>
      <img
        src={poster}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", imgClassName)}
      />
      {hasVideo && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPlaying(true);
          }}
          aria-label="Play property video"
          className={cn(
            "absolute top-2 right-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-black/65",
            playButtonClassName,
          )}
        >
          <Play className="h-3.5 w-3.5 translate-x-[1px] fill-current" />
        </button>
      )}
    </>
  );
}
