import { useEffect, type RefObject } from "react";
import { isAnyVideoPlaying, registerExclusiveVideo } from "@/lib/videoCoordinator";

interface Options {
  /** Visibility ratio at/above which the video plays; below it pauses. Default 0.3. */
  threshold?: number;
  /**
   * When true (default), the video only autoplays if nothing else is playing,
   * so it never interrupts another video (used by low-priority Ad videos).
   * When false, it plays whenever it is in view (used by user-initiated
   * property card videos, which take priority).
   */
  yieldToOthers?: boolean;
  /**
   * When true (default), the video (re)plays whenever it scrolls into view.
   * When false, it only pauses on leaving view and never auto-resumes on
   * re-entry, so the user must manually restart it.
   */
  playOnEnter?: boolean;
}

/**
 * Play/pause a muted video based on viewport visibility.
 * Pauses when more than (1 - threshold) is off-screen; play-on-enter is optional.
 */
export function useInViewVideoAutoplay(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  { threshold = 0.3, yieldToOthers = true, playOnEnter = true }: Options = {},
) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !enabled) return;

    const unregister = registerExclusiveVideo(el);
    const io = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.intersectionRatio >= threshold;
        if (inView) {
          if (playOnEnter && (!yieldToOthers || !isAnyVideoPlaying(el))) {
            void el.play().catch(() => {});
          }
        } else {
          el.pause();
        }
      },
      { threshold: [0, threshold, 1] },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      unregister();
    };
  }, [videoRef, enabled, threshold, yieldToOthers, playOnEnter]);
}
