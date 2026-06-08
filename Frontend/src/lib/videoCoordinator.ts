const registered = new Set<HTMLVideoElement>();

function handlePlay(e: Event) {
  const playing = e.currentTarget as HTMLVideoElement;
  registered.forEach((v) => {
    if (v !== playing && !v.paused) {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    }
  });
}

/** Register a video so only one registered video plays at a time. */
export function registerExclusiveVideo(el: HTMLVideoElement): () => void {
  registered.add(el);
  el.addEventListener("play", handlePlay);
  return () => {
    registered.delete(el);
    el.removeEventListener("play", handlePlay);
  };
}

/** True if any registered video (other than `except`) is currently playing. */
export function isAnyVideoPlaying(except?: HTMLVideoElement): boolean {
  for (const v of registered) {
    if (v !== except && !v.paused && !v.ended) return true;
  }
  return false;
}
