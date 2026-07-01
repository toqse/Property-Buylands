"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link, useNavigate, useSearchParams } from "@/lib/router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useProperty } from "@/hooks/api/useProperties";
import { useCatalogMutations, useCompanyContact } from "@/hooks/api/useCatalog";
import { getErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Play, Check, ArrowLeft, ChevronLeft, ChevronRight, Share2, Volume2, VolumeX, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { registerExclusiveVideo } from "@/lib/videoCoordinator";
import { formatPropertyAreaDisplay, resolveVideoCoverImage } from "@/lib/api/mappers/property";
import { videoProcessingStatusLabel } from "@/lib/videoProcessingStatus";

const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
  </svg>
);

const PropertyDetail = () => {
  const { id: routeId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  // This page is served as a static-export shell for many slugs (see
  // generateStaticParams + .htaccess fallback), so the route param may be the
  // shell placeholder. Always trust the actual URL: /properties/<slug>/.
  const slugFromPath = pathname.split("/").filter(Boolean).pop();
  const id =
    slugFromPath && slugFromPath !== "properties" ? slugFromPath : routeId;
  const { data: property, isLoading, isError, isFetched } = useProperty(id);
  const { submitContact } = useCatalogMutations();
  // Company/admin contact is used only as a fallback when a listing has no
  // seller contact details; the actual property owner's info is preferred.
  const { data: company } = useCompanyContact();
  const [active, setActive] = useState(0); // index into combined media (video first, then photos)
  const [enquiry, setEnquiry] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const furnishing = property?.furnishing || "N/A";
  const parking = property?.parkingSpaces || "N/A";
  const totalPhotos = property?.gallery.length ?? 0;
  const hasVideo = Boolean(property?.videoUrl);
  const totalMedia = totalPhotos + (hasVideo ? 1 : 0);

  // Reset to the thumbnail/play-button state whenever the active media changes.
  useEffect(() => {
    setVideoStarted(false);
    setVideoReady(false);
    setVideoPlaying(false);
    setVideoMuted(false);
  }, [active]);

  useEffect(() => {
    const el = mainVideoRef.current;
    if (!el) return;
    el.muted = videoMuted;
  }, [videoMuted, videoStarted]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  useEffect(() => {
    const el = mainVideoRef.current;
    if (!el) return;
    return registerExclusiveVideo(el);
  }, [active, videoStarted, hasVideo]);

  const startVideo = () => {
    setVideoMuted(false);
    setVideoStarted(true);
  };

  useEffect(() => {
    if (!videoStarted || !hasVideo) return;
    const el = mainVideoRef.current;
    if (!el) return;
    el.muted = false;
    void el.play().catch(() => {
      /* autoplay with sound may be blocked until a later gesture */
    });
  }, [videoStarted, active, hasVideo]);

  const openImageLightbox = (galleryIndex: number) => {
    setLightboxIndex(Math.max(0, galleryIndex));
    setLightbox(true);
  };

  const prevMedia = () => {
    if (totalMedia === 0) return;
    setActive((prev) => (prev - 1 + totalMedia) % totalMedia);
  };

  const nextMedia = () => {
    if (totalMedia === 0) return;
    setActive((prev) => (prev + 1) % totalMedia);
  };

  if (isLoading || !isFetched) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container py-16 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container py-32 text-center">
          <h1 className="font-serif text-4xl">Property not found</h1>
          <Button className="mt-6" asChild><Link to="/buy">Back to listings</Link></Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Prefer the actual seller's (property owner's) contact details. Fall back to
  // the company/admin contact only when the listing has none on record.
  const contactPhone = (property.ownerPhone || company?.phone || company?.admin_phone || "").trim();
  const contactWhatsapp = (
    property.contactWhatsApp || property.ownerPhone || company?.whatsapp || company?.admin_whatsapp || contactPhone
  ).trim();
  const wa = contactWhatsapp
    ? `https://wa.me/${contactWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${property.title}" listed on Buylands India.`)}`
    : "";

  const hideOwnerContactActions =
    searchParams.get("from") === "dashboard" &&
    user != null &&
    property.createdBy != null &&
    String(property.createdBy) === user.id;

  const submitEnquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const phone = String(fd.get("phone") || "");
    const message = String(fd.get("message") || "");
    const subject = `Enquiry about "${property.title}"`;
    try {
      const result = await submitContact.mutateAsync({
        name,
        email,
        phone_number: phone,
        subject,
        message,
        property: Number(property.id),
      });
      if (result.email_sent) {
        const sentTo = result.notification_recipients?.[0];
        toast.success(
          sentTo
            ? `Enquiry sent to ${sentTo}`
            : "Enquiry sent — the property owner has been notified",
        );
      } else if (result.notification_recipients?.length) {
        toast.warning(
          "Enquiry saved, but email could not be delivered. Please try WhatsApp or phone.",
        );
      } else {
        toast.warning(
          "Enquiry saved, but no owner email is configured for this listing.",
        );
      }
      setEnquiry(false);
      form.reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const copyPropertyLink = async (shareUrl: string) => {
    if (!shareUrl || typeof navigator === "undefined") return false;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } catch {
        // Fall through to the textarea copy fallback for browsers that block Clipboard API.
      }
    }

    if (typeof document === "undefined") return false;

    const input = document.createElement("textarea");
    input.value = shareUrl;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(input);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: property.title,
      text: `Check out this property: ${property.title}`,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (await copyPropertyLink(shareUrl)) {
        toast.success("Property link copied");
        return;
      }

      toast.error("Unable to copy property link");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      if (await copyPropertyLink(shareUrl)) {
        toast.success("Property link copied");
        return;
      }

      toast.error("Unable to share right now");
    }
  };

  type MediaItem = { kind: "video"; src: string; poster?: string } | { kind: "image"; src: string };
  const videoCoverImage = resolveVideoCoverImage(property);
  const media: MediaItem[] = [
    ...(hasVideo ? [{ kind: "video" as const, src: property.videoUrl as string, poster: videoCoverImage }] : []),
    ...property.gallery.map((g) => ({ kind: "image" as const, src: g })),
  ];
  const safeActive = Math.min(Math.max(active, 0), Math.max(0, media.length - 1));
  const activeItem = media[safeActive];
  const showVideoCover = Boolean(videoCoverImage) && !videoPlaying;
  const hideMediaCards = activeItem?.kind === "video" && videoPlaying;
  const activeGalleryIndex = hasVideo ? safeActive - 1 : safeActive;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-5 md:pt-8">
        <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-gold inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <section className="container py-5 md:py-8">
        <RevealOnScroll>
          <div className="rounded-3xl border border-border bg-card p-3 md:p-6 shadow-soft">
            {property.videoProcessingStatus &&
            property.videoProcessingStatus !== "ready" &&
            videoProcessingStatusLabel(property.videoProcessingStatus) ? (
              <p
                className={
                  property.videoProcessingStatus === "failed"
                    ? "mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                    : "mb-4 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-700"
                }
              >
                {videoProcessingStatusLabel(property.videoProcessingStatus)}
              </p>
            ) : null}
            <div className="min-w-0">
              <div className="relative rounded-2xl overflow-hidden">
                {activeItem?.kind === "video" ? (
                  <div className="relative h-[220px] sm:h-[300px] md:h-[480px] w-full bg-black">
                    {showVideoCover ? (
                      <img
                        src={videoCoverImage}
                        alt={property.title}
                        className="absolute inset-0 z-[1] h-full w-full object-cover"
                      />
                    ) : null}
                    {videoStarted ? (
                      <video
                        key={activeItem.src}
                        ref={mainVideoRef}
                        src={activeItem.src}
                        controls={videoPlaying}
                        playsInline
                        preload="auto"
                        onLoadedData={() => setVideoReady(true)}
                        onCanPlay={() => setVideoReady(true)}
                        onPlay={() => setVideoPlaying(true)}
                        onPause={() => setVideoPlaying(false)}
                        onEnded={() => setVideoPlaying(false)}
                        className={`absolute inset-0 z-[2] h-full w-full bg-black ${
                          videoPlaying && videoReady
                            ? "object-contain"
                            : videoPlaying
                              ? "object-contain opacity-0"
                              : "hidden"
                        }`}
                      />
                    ) : null}
                    {videoPlaying && (
                      <button
                        type="button"
                        onClick={() => setVideoMuted((m) => !m)}
                        className="absolute top-3 right-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/30 transition hover:bg-black/70 md:top-4 md:right-4 md:h-10 md:w-10"
                        aria-label={videoMuted ? "Unmute video" : "Mute video"}
                      >
                        {videoMuted ? (
                          <VolumeX className="h-4 w-4 md:h-5 md:w-5" />
                        ) : (
                          <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
                        )}
                      </button>
                    )}
                    {!videoPlaying && (
                      <button
                        type="button"
                        onClick={startVideo}
                        className="absolute inset-0 z-10 grid place-items-center bg-black/15 transition-colors hover:bg-black/25"
                        aria-label="Play video"
                      >
                        <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-[#0e305d] shadow-lg transition-transform hover:scale-105 md:h-20 md:w-20">
                          <Play className="h-7 w-7 translate-x-0.5 fill-current md:h-9 md:w-9" />
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openImageLightbox(activeGalleryIndex)}
                    className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label="View image full screen"
                  >
                    <img
                      src={activeItem?.src}
                      alt={property.title}
                      className="h-[220px] sm:h-[300px] md:h-[480px] w-full object-cover transition-all duration-700"
                    />
                  </button>
                )}
                {totalMedia > 1 && !hideMediaCards && (
                  <div className="absolute bottom-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center justify-end gap-1.5 overflow-x-auto sm:bottom-4 sm:right-4 sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {media.map((m, i) => {
                      const isActive = safeActive === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActive(i);
                          }}
                          className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 bg-white shadow-md transition-all sm:h-12 sm:w-12 md:h-14 md:w-14 ${
                            isActive
                              ? "border-[#0e305d] scale-105"
                              : "border-white/95 opacity-90 hover:opacity-100 hover:border-white"
                          }`}
                          aria-label={m.kind === "video" ? "Play video" : `View image ${hasVideo ? i : i + 1}`}
                          aria-current={isActive}
                        >
                          <img
                            src={m.kind === "video" ? m.poster || "" : m.src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          {m.kind === "video" && (
                            <span className="absolute inset-0 grid place-items-center bg-black/25">
                              <Play className="h-3.5 w-3.5 fill-white text-white sm:h-4 sm:w-4" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {totalMedia > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-background/95 grid place-items-center text-foreground hover:bg-gold transition-all md:left-4 md:h-12 md:w-12"
                      aria-label="Previous media"
                    >
                      <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-background/95 grid place-items-center text-foreground hover:bg-gold transition-all md:right-4 md:h-12 md:w-12"
                      aria-label="Next media"
                    >
                      <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_480px] gap-6 items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-[#16a34a] text-white hover:bg-[#16a34a]">{property.type}</Badge>
                  <Badge variant="secondary">{property.category}</Badge>
                </div>
                <h1 className="font-sans text-2xl md:text-3xl font-semibold tracking-tight text-foreground break-words">{property.title}</h1>
                <div className="mt-2 text-sm text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span className="min-w-0 break-words">{property.location}, {property.city}</span>
                </div>
              </div>

              <aside className="rounded-2xl border border-border bg-background p-4 md:p-5 lg:-mt-3">
                {/* <div className="text-xs uppercase tracking-wider text-muted-foreground">Monthly Rent</div> */}
                <div className="text-2xl text-foreground mt-1 md:text-3xl">
                  ₹{fmt.format(property.price)}
                  {property.priceUnit && <span className="text-sm text-muted-foreground"> {property.priceUnit}</span>}
                </div>
                {!hideOwnerContactActions ? (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Button variant="luxe" size="sm" className="h-10 w-full min-w-0 px-0" disabled={!wa} asChild={!!wa} aria-label="WhatsApp">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noreferrer">
                        <WhatsAppIcon className="h-[18px] w-[18px] shrink-0" />
                      </a>
                    ) : (
                      <WhatsAppIcon className="h-[18px] w-[18px] shrink-0" />
                    )}
                  </Button>
                  <Button variant="luxe" size="sm" className="h-10 w-full min-w-0 px-0" onClick={() => setEnquiry(true)} aria-label="Email enquiry">
                    <Mail className="h-4 w-4 shrink-0" />
                  </Button>
                  <Button variant="luxe" size="sm" className="h-10 w-full min-w-0 px-0" disabled={!contactPhone} asChild={!!contactPhone} aria-label="Call">
                    {contactPhone ? (
                      <a href={`tel:${contactPhone}`}>
                        <Phone className="h-4 w-4 shrink-0" />
                      </a>
                    ) : (
                      <Phone className="h-4 w-4 shrink-0" />
                    )}
                  </Button>
                  <Button variant="luxe" size="sm" className="h-10 w-full min-w-0 px-0" onClick={handleShare} aria-label="Share">
                    <Share2 className="h-4 w-4 shrink-0" />
                  </Button>
                </div>
                ) : null}
              </aside>
            </div>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 rounded-2xl border border-border bg-background p-4 md:p-5">
                <h2 className="font-sans text-base md:text-lg font-medium text-foreground mb-4 tracking-tight">Property Overview</h2>
                <p className="mb-5 text-sm text-foreground/80 leading-relaxed break-words whitespace-pre-line">{property.description}</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
                    <h3 className="font-sans text-sm md:text-base font-medium text-foreground mb-3 tracking-tight">Property Details</h3>
                    <div>
                      <div className="flex items-center justify-between py-3 border-b border-border/70">
                        <span className="text-muted-foreground">Property Type</span>
                        <span className="font-medium text-right break-words min-w-0 pl-3">{property.category}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-border/70">
                        <span className="text-muted-foreground">Furnishing</span>
                        <span className="font-medium text-right break-words min-w-0 pl-3">{furnishing}</span>
                      </div>
                      {property.ownership ? (
                        <div className="flex items-center justify-between py-3 border-b border-border/70">
                          <span className="text-muted-foreground">Ownership</span>
                          <span className="font-medium text-right break-words min-w-0 pl-3">{property.ownership}</span>
                        </div>
                      ) : null}
                      {property.projectStatus ? (
                        <div className="flex items-center justify-between py-3 border-b border-border/70">
                          <span className="text-muted-foreground">Project Status</span>
                          <span className="font-medium text-right break-words min-w-0 pl-3">{property.projectStatus}</span>
                        </div>
                      ) : null}
                      {property.floors ? (
                        <div className="flex items-center justify-between py-3 border-b border-border/70">
                          <span className="text-muted-foreground">Floors</span>
                          <span className="font-medium text-right break-words min-w-0 pl-3">{property.floors}</span>
                        </div>
                      ) : null}
                      {property.sighting ? (
                        <div className="flex items-center justify-between py-3 border-b border-border/70">
                          <span className="text-muted-foreground">Sighting</span>
                          <span className="font-medium text-right break-words min-w-0 pl-3">{property.sighting}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between pt-3">
                        <span className="text-muted-foreground">Area</span>
                        <span className="font-medium text-right break-words min-w-0 pl-3">
                          {formatPropertyAreaDisplay(property)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
                    <h3 className="font-sans text-sm md:text-base font-medium text-foreground mb-3 tracking-tight">Additional Info</h3>
                    <div>
                      {property.bedrooms > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-border/70">
                          <span className="text-muted-foreground">Bedrooms</span>
                          <span className="font-medium text-right break-words min-w-0 pl-3">{property.bedrooms}</span>
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-border/70">
                          <span className="text-muted-foreground">Bathrooms</span>
                          <span className="font-medium text-right break-words min-w-0 pl-3">{property.bathrooms}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-muted-foreground">Parking</span>
                        <span className="font-medium text-right break-words min-w-0 pl-3">{parking}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-4 rounded-2xl border border-border bg-background p-4 md:p-5">
                <h2 className="font-sans text-base md:text-lg font-medium text-foreground mb-4 tracking-tight">Features & Amenities</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {property.features.map(f => (
                    <div key={f} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">{f}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="location" className="mt-4 rounded-2xl border border-border bg-background p-4 md:p-5">
                <h2 className="font-sans text-base md:text-lg font-medium text-foreground mb-4 tracking-tight">Location</h2>
                <div className="rounded-2xl overflow-hidden border border-border h-[250px] md:h-[320px] bg-muted relative">
                  {property.lat !== 0 && property.lng !== 0 ? (
                    <iframe
                      title={`Map of ${property.title}`}
                      src={`https://www.google.com/maps?q=${property.lat},${property.lng}&hl=en&z=15&output=embed`}
                      className="absolute inset-0 h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                      <div className="text-center px-4">
                        <MapPin className="h-10 w-10 mx-auto text-gold mb-2 animate-float" />
                        <div className="font-medium break-words">{property.location}, {property.city}</div>
                        <div className="text-xs mt-1">Map unavailable — no coordinates on file</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span className="min-w-0 break-words">{property.location}, {property.city}</span>
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </RevealOnScroll>
      </section>

      <Footer />

      {/* Enquiry dialog */}
      <Dialog open={enquiry} onOpenChange={setEnquiry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Enquire about {property.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEnquiry} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Your name</Label><Input name="name" required /></div>
              <div><Label>Phone</Label><Input name="phone" required /></div>
            </div>
            <div><Label>Email</Label><Input name="email" type="email" required /></div>
            <div><Label>Message</Label><Textarea name="message" rows={4} defaultValue={`I'd like more information about ${property.title}.`} /></div>
            <Button type="submit" variant="luxe" className="w-full">Send enquiry</Button>
          </form>
        </DialogContent>
      </Dialog>

      {lightbox && totalPhotos > 0 && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Property image gallery"
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-[max(4rem,calc(env(safe-area-inset-top)+3.25rem))] z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:top-[max(1rem,env(safe-area-inset-top))]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 pt-14">
            <img
              src={property.gallery[lightboxIndex]}
              alt={`${property.title} – ${lightboxIndex + 1}`}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          </div>

          {totalPhotos > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos)
                }
                className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 md:left-4 md:h-12 md:w-12"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev + 1) % totalPhotos)}
                className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 md:right-4 md:h-12 md:w-12"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default PropertyDetail;
