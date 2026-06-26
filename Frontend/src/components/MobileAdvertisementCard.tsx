import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { ArrowUpRight, Megaphone, Volume2, VolumeX } from "lucide-react";
import { Advertisement } from "@/data/advertisements";
import { useInViewVideoAutoplay } from "@/hooks/useInViewVideoAutoplay";
import { cn } from "@/lib/utils";

type AdLink =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | null;

function resolveAdLink(ad: Advertisement): AdLink {
  if (ad.redirectType === "property" && (ad.linkedPropertySlug || ad.linkedPropertyId)) {
    return { kind: "internal", href: `/properties/${ad.linkedPropertySlug || ad.linkedPropertyId}` };
  }
  if (ad.redirectType === "external" && ad.externalUrl) {
    return { kind: "external", href: ad.externalUrl };
  }
  if (ad.redirectType === "internal" && ad.internalPage) {
    return { kind: "internal", href: ad.internalPage };
  }
  return null;
}

export function MobileAdvertisementCard({
  ad,
  index = 0,
  className,
}: {
  ad: Advertisement;
  index?: number;
  className?: string;
}) {
  const link = resolveAdLink(ad);
  const preview = ad.mobileBanner || ad.desktopBanner || ad.videoThumbnail;
  const showVideo = Boolean(ad.mediaType === "video" && ad.videoUrl);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useInViewVideoAutoplay(videoRef, showVideo);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, showVideo]);

  const outerClass = cn(
    "group relative col-span-2 aspect-[2.2/1] min-h-[160px] w-full animate-fade-in overflow-hidden rounded-xl bg-black text-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] ring-1 ring-gold/30",
    className,
  );
  const style = { animationDelay: `${index * 40}ms` } as const;

  const inner = (
    <div className="relative h-full w-full overflow-hidden">
      {showVideo ? (
        <>
          <video
            ref={videoRef}
            key={ad.videoUrl}
            src={ad.videoUrl}
            poster={ad.videoThumbnail || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            controls={false}
            disablePictureInPicture
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="pointer-events-auto absolute top-2 right-2 z-30 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 transition hover:bg-black/65"
          >
            {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </button>
        </>
      ) : preview ? (
        <img
          src={preview}
          alt={ad.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">
          <Megaphone className="h-8 w-8" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#1c5fa8] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
        <Megaphone className="h-2.5 w-2.5" />
        Sponsored
      </span>

      <div className="absolute inset-x-3 bottom-3 flex flex-col items-start gap-1.5">
        <h3 className="w-full min-w-0 break-words line-clamp-2 text-[15px] font-semibold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
          {ad.title}
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#1c5fa8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal text-white shadow-sm">
          Learn more
          <ArrowUpRight className="h-3 w-3 shrink-0" />
        </span>
      </div>
    </div>
  );

  if (!link) {
    return (
      <article className={outerClass} style={style} aria-label="Advertisement">
        {inner}
      </article>
    );
  }

  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={cn(outerClass, "block")}
        style={style}
        aria-label={`Advertisement: ${ad.title}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      to={link.href}
      className={cn(outerClass, "block")}
      style={style}
      aria-label={`Advertisement: ${ad.title}`}
    >
      {inner}
    </Link>
  );
}
