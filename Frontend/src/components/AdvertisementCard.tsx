import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { ArrowUpRight, Megaphone, Volume2, VolumeX } from "lucide-react";
import { Advertisement } from "@/data/advertisements";
import { useInViewVideoAutoplay } from "@/hooks/useInViewVideoAutoplay";
import { cn } from "@/lib/utils";

type AdvertisementCardProps = {
  ad: Advertisement;
  index?: number;
  className?: string;
};

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

/**
 * Wide hero-banner ad slot used inside the property listings feed.
 *
 * Spans multiple grid columns so the image/video can breathe horizontally, in
 * the style of a sponsored marketing banner. The grid is rendered with
 * `grid-auto-flow: dense` from the parent so any half-filled rows that would
 * normally appear before a wide banner are back-filled with later property
 * cards instead of leaving gaps.
 */
export const AdvertisementCard = ({ ad, index = 0, className }: AdvertisementCardProps) => {
  const link = resolveAdLink(ad);
  const preview = ad.desktopBanner || ad.mobileBanner || ad.videoThumbnail;
  const showVideo = Boolean(ad.mediaType === "video" && ad.videoUrl);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useInViewVideoAutoplay(videoRef, showVideo);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, showVideo]);

  const outerClass = cn(
    "group relative block h-full min-h-[340px]",
    "overflow-hidden rounded-2xl bg-black text-white",
    "shadow-[0_8px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-gold/40",
    "transition-shadow hover:shadow-[0_18px_44px_-20px_rgba(15,23,42,0.28)]",
    "animate-fade-in",
    className,
  );
  const style = { animationDelay: `${index * 80}ms` } as const;

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
            className="pointer-events-auto absolute top-3 right-3 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 transition hover:bg-black/65"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </>
      ) : preview ? (
        <img
          src={preview}
          alt={ad.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1500ms] group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">
          <Megaphone className="h-10 w-10" />
        </div>
      )}

      {/* Compact bottom-up gradient: only the lower ~40% of the card gets
          shading so the video/image stays clearly visible while keeping the
          title and CTA legible against bright backgrounds. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />

      {/* SPONSORED badge — top-left */}
      <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-md">
        <Megaphone className="h-3 w-3" />
        Sponsored
      </span>

      {/* Text overlay — bottom-left: Learn more button on top, title below */}
      <div className="absolute inset-x-4 bottom-4 flex flex-col items-start gap-2">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-md ring-1 ring-white/20 transition-transform group-hover:-translate-y-0.5">
          Learn more
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
        <h3 className="w-full min-w-0 break-words font-serif text-lg font-semibold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] line-clamp-2">
          {ad.title}
        </h3>
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
        className={outerClass}
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
      className={outerClass}
      style={style}
      aria-label={`Advertisement: ${ad.title}`}
    >
      {inner}
    </Link>
  );
};
