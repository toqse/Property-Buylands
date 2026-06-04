import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CircleDollarSign,
  Headphones,
  Home,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";

import img01 from "@/assets/Screenshot 2026-05-05 081913.png";
import img02 from "@/assets/Screenshot 2026-05-05 081920.png";
import img03 from "@/assets/Screenshot 2026-05-05 081926.png";
import img04 from "@/assets/Screenshot 2026-05-05 081932.png";
import { imageSrc } from "@/lib/image";

const CREAM = "#FFFFFF";
const NAVY = "#1A202C";
const MUTED = "#718096";
const BRAND = "#0e305d";

/** Matches `WaveWhite` rendered height (`4.25rem` @ 16px root = 68px). */
const WAVE_STRIP_HEIGHT_PX = 68;

type Feature = {
  n: string;
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
  /** Fine-tune crop when aspect ratio differs (e.g. phone mockup screenshot). */
  objectPosition?: string;
};

const IMAGE_BLOCK_H_PX = 200;

const FEATURES: Feature[] = [
  {
    n: "01",
    icon: ShieldCheck,
    title: "Trusted Properties Only",
    description: "Every listing is verified for quality, ownership, and transparency before it reaches you.",
    image: img01,
  },
  {
    n: "02",
    icon: Users,
    title: "Real Estate Experts",
    description: "Get professional guidance from experienced property consultants at every stage.",
    image: img02,
  },
  {
    n: "03",
    icon: CircleDollarSign,
    title: "Smart Investment Choices",
    description: "Discover verified properties with competitive pricing and long-term value potential.",
    image: img03,
  },
  {
    n: "04",
    icon: Headphones,
    title: "Dedicated Customer Support",
    description: "Our support team is available to assist you with smooth and stress-free property decisions.",
    image: img04,
    objectPosition: "center 42%",
  },
];

/**
 * White strip with obvious wave along the bottom — meets the fixed-height image underneath.
 */
function WaveWhite() {
  return (
    <svg
      viewBox="0 0 480 72"
      className="isolate block h-[4.25rem] w-full shrink-0 bg-transparent"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* White occupies from top to wavy baseline; taper reads as scallop above the photo */}
      <path
        fill="#ffffff"
        d="
          M 0 0 H 480 V 34
          C 396 62 342 26 274 41
          S 154 61 71 43
          S 24 30 0 44
          V 0 Z
        "
      />
    </svg>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { icon: Icon, title, description, image, n, objectPosition } = feature;

  const mediaColumnHeightPx = WAVE_STRIP_HEIGHT_PX + IMAGE_BLOCK_H_PX;

  return (
    <article
      className={cn(
        "group relative flex min-h-[min-content] flex-col overflow-visible rounded-2xl bg-white pb-7 shadow-[0_12px_40px_-18px_rgba(26,32,44,0.18)] ring-1 ring-black/[0.04] transition-all duration-500 ease-out hover:will-change-transform motion-reduce:transform-none",
        "hover:z-10 hover:scale-[1.03] hover:shadow-[0_28px_56px_-24px_rgba(26,32,44,0.28)] hover:ring-gold/25",
      )}
    >
      <div className="relative z-10 overflow-hidden rounded-t-2xl bg-white px-6 pb-4 pt-8 md:px-7 md:pt-9">
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-gold/45 text-gold shadow-sm transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h3 className="mt-5 font-sans text-base font-semibold leading-snug tracking-tight md:text-[1.0625rem]" style={{ color: NAVY }}>
          {title}
        </h3>
        <p className="mt-2 font-sans text-sm leading-relaxed md:text-[0.9375rem]" style={{ color: MUTED }}>
          {description}
        </p>
      </div>

      {/* Wave + image stack; badge apex sits on bottom edge of photo */}
      <div className="relative z-[1] shrink-0">
        <WaveWhite />
        <div
          className={cn(
            "relative isolate -mt-px shrink-0 overflow-hidden rounded-b-2xl bg-neutral-100",
            "motion-reduce:group-hover:[&_img]:scale-100",
          )}
          style={{ height: IMAGE_BLOCK_H_PX }}
        >
          <img
            src={imageSrc(image)}
            alt=""
            className={cn(
              "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              !objectPosition && "object-center",
            )}
            style={objectPosition ? { objectPosition } : undefined}
            loading="lazy"
          />
        </div>

        <div
          className="pointer-events-none absolute left-1/2 z-20 grid h-[2.875rem] w-[2.875rem] min-h-[2.875rem] min-w-[2.875rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/95 font-serif text-sm font-semibold text-white shadow-[0_6px_20px_-4px_rgba(26,32,44,0.35)]"
          style={{ top: mediaColumnHeightPx, backgroundColor: BRAND }}
          aria-hidden
        >
          {n}
        </div>
      </div>
    </article>
  );
}

export function WhyChooseUs() {
  const { ref, active } = useInViewOnce<HTMLElement>(0.08);

  return (
    <section
      ref={ref}
      className={cn("relative overflow-hidden py-12 md:py-28", revealFadeUpClass(active))}
      style={{ backgroundColor: CREAM }}
    >
      <div className="container relative z-10">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-4xl text-center md:mb-16">
          <div className="mb-4 flex flex-col items-center gap-3">
            <Home className="h-5 w-5" style={{ color: BRAND }} strokeWidth={1.5} />
            <div className="flex items-center justify-center gap-4">
              <span className="h-px w-10 md:w-14" style={{ backgroundColor: BRAND }} />
              <span
                className="font-sans text-[11px] font-semibold uppercase tracking-[0.35em]"
                style={{ color: BRAND }}
              >
                Why choose us
              </span>
              <span className="h-px w-10 md:w-14" style={{ backgroundColor: BRAND }} />
            </div>
          </div>
          <h2 className="font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-[#1A202C] md:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            Find More Than a Property &mdash;{" "}
            <span className="text-gold">Find a Place to Belong.</span>
          </h2>
          <p
            className="mx-auto mt-5 max-w-2xl font-sans text-base leading-relaxed md:text-lg"
            style={{ color: MUTED }}
          >
            We help you explore, compare, and secure the right space with confidence and ease.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.n}
              className={cn("animate-feature-card", active && "animate-feature-card--play")}
              style={{ "--feature-stagger": `${i * 120}ms` } as CSSProperties}
            >
              <FeatureCard feature={f} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
