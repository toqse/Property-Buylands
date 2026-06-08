"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useInViewVideoAutoplay } from "@/hooks/useInViewVideoAutoplay";
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
  const [muted, setMuted] = useState(true);
  // Tracks whether the inline video is currently paused (e.g. auto-paused when
  // it scrolls out of view) so we can surface a pause indicator on the card.
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Always show the property's first image as the thumbnail; the video (if any)
  // still plays inline via the play button and uses the same image as poster.
  const poster = image || videoThumbnail;
  const hasVideo = Boolean(videoUrl);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, playing]);

  // Once the user starts the card video, pause it when it scrolls out of view
  // (>70% off-screen). It does NOT auto-resume on re-entry; the user must press
  // play again.
  useInViewVideoAutoplay(videoRef, hasVideo && playing, {
    yieldToOthers: false,
    playOnEnter: false,
  });

  if (hasVideo && playing) {
    return (
      <>
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster}
          autoPlay
          muted
          playsInline
          preload="metadata"
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
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
        {paused ? (
          // When the video is paused (e.g. auto-paused after scrolling out of
          // view), show a pause indicator in the same spot; tapping it resumes.
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void videoRef.current?.play();
            }}
            aria-label="Resume video"
            className={cn(
              "absolute top-2 right-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 transition hover:bg-black/65",
              playButtonClassName,
            )}
          >
            <Pause className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className={cn(
              "absolute top-2 right-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 transition hover:bg-black/65",
              playButtonClassName,
            )}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </>
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
            "absolute top-2 right-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 transition hover:bg-black/65",
            playButtonClassName,
          )}
        >
          <Play className="h-3.5 w-3.5 translate-x-[1px] fill-current" />
        </button>
      )}
    </>
  );
}
