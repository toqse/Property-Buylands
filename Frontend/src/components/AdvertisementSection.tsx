"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "@/lib/router";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { useActiveAds } from "@/hooks/api/useCatalog";

const AUTO_ADVANCE_MS = 3500;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function useFlipkartCarousel(scrollRef: RefObject<HTMLDivElement | null>, itemCount: number) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;

  const closestChildIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return 0;
    const containerLeft = el.scrollLeft;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, idx) => {
      const left = (child as HTMLElement).offsetLeft - el.offsetLeft;
      const d = Math.abs(left - containerLeft);
      if (d < closestDist) {
        closestDist = d;
        closest = idx;
      }
    });
    return closest;
  }, [scrollRef]);

  const onScroll = useCallback(() => {
    const closest = closestChildIndex();
    setIndex((prev) => (prev !== closest ? closest : prev));
  }, [closestChildIndex]);

  const scrollToIndex = useCallback(
    (i: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const child = el.children[i] as HTMLElement | undefined;
      if (!child) return;
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" });
      setIndex(i);
    },
    [scrollRef],
  );

  const next = useCallback(() => scrollToIndex(mod(indexRef.current + 1, itemCount)), [scrollToIndex, itemCount]);
  const prev = useCallback(() => scrollToIndex(mod(indexRef.current - 1, itemCount)), [scrollToIndex, itemCount]);

  useEffect(() => {
    if (itemCount <= 1) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [itemCount, next]);

  return { index, onScroll, next, prev, scrollToIndex };
}

export function AdvertisementSection() {
  const { data: ads = [] } = useActiveAds("homepage_feed");
  const scrollRef = useRef<HTMLDivElement>(null);
  const slides = ads.map((ad) => ({
    id: ad.id,
    image: ad.desktopBanner || ad.mobileBanner || ad.videoThumbnail,
    title: ad.title,
    line: ad.subtitle,
    href:
      ad.redirectType === "property" && (ad.linkedPropertySlug || ad.linkedPropertyId)
        ? `/properties/${ad.linkedPropertySlug || ad.linkedPropertyId}`
        : ad.externalUrl || "#",
  }));

  const { index, onScroll, next, prev } = useFlipkartCarousel(scrollRef, slides.length);

  if (!slides.length) return null;

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <RevealOnScroll className="container">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold">Sponsored</div>
            <h2 className="font-serif text-3xl md:text-4xl mt-2">Featured highlights</h2>
          </div>
          <div className="hidden sm:flex gap-2">
            <Button type="button" variant="outline" size="icon" onClick={prev} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={next} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide) => (
            <Link
              key={slide.id}
              to={slide.href}
              className={cn(
                "snap-start shrink-0 w-[85%] sm:w-[70%] md:w-[45%] lg:w-[32%]",
                "group relative block overflow-hidden rounded-2xl bg-black aspect-[16/10] ring-1 ring-gold/30",
              )}
            >
              {slide.image ? (
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-white/60">
                  <Megaphone className="h-10 w-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-serif text-xl">{slide.title}</h3>
                {slide.line ? <p className="text-sm text-white/80 mt-1">{slide.line}</p> : null}
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center gap-1.5 mt-4 sm:hidden">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-gold" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      </RevealOnScroll>
    </section>
  );
}
