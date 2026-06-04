import { Link } from "@/lib/router";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Building2, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { imageSrc } from "@/lib/image";
import buyImg from "@/assets/property-1.jpg";
import sellImg from "@/assets/property-3.jpg";

const rentImg = "/heromain.png";

type CardDef = {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  image: string;
  badgeTop: string;
  badgeBottom: string;
};

const BRAND_GRADIENT =
  "linear-gradient(135deg,#0e305d 0%,#1c5fa8 55%,#3a8dd6 100%)";

const CARDS: CardDef[] = [
  {
    icon: Home,
    title: "Buy Properties",
    description: "Over 1,200 verified homes ready for you to call your own.",
    to: "/buy",
    image: buyImg,
    badgeTop: "1,200+",
    badgeBottom: "Verified Homes",
  },
  {
    icon: Building2,
    title: "Rent Properties",
    description:
      "Smart filters and flexible terms for renters who know what they want.",
    to: "/rent",
    image: rentImg,
    badgeTop: "Flexible",
    badgeBottom: "Rent Terms",
  },
  {
    icon: MapPin,
    title: "Sell Properties",
    description:
      "Reach qualified buyers with rich listings and expert support.",
    to: "/sell",
    image: sellImg,
    badgeTop: "Expert",
    badgeBottom: "Support",
  },
];

function WaveDivider() {
  return (
    <svg
      viewBox="0 0 600 70"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-14 w-full text-white"
      aria-hidden
    >
      <path
        d="M0,40 C120,90 260,-10 420,30 C500,50 560,55 600,45 L600,70 L0,70 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FeatureCard({ card }: { card: CardDef }) {
  const { icon: Icon, title, description, to, image, badgeTop, badgeBottom } =
    card;

  return (
    <article
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-2xl bg-white",
        "border border-black/[0.06] shadow-[0_10px_30px_-16px_rgba(15,23,42,0.20)]",
        "transform-gpu transition-[box-shadow] duration-500 ease-out",
        "hover:shadow-[0_18px_40px_-14px_rgba(15,23,42,0.24)]",
      )}
    >
      <Link
        to={to}
        aria-label={`${title} — learn more`}
        className="absolute inset-0 z-30 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c5fa8]/60 focus-visible:ring-offset-2"
      >
        <span className="sr-only">{title} — learn more</span>
      </Link>

      {/* Image / cover section */}
      <div
        className="relative h-44 overflow-hidden md:h-48"
        style={{
          background:
            "linear-gradient(180deg,#eaf3fc 0%, #d8e8f7 55%, #cfe1f3 100%)",
        }}
      >
        <img
          src={imageSrc(image)}
          alt={title}
          loading="lazy"
          className="absolute inset-y-0 right-0 h-full w-[66%] object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
        />

        {/* Icon chip — top left */}
        <div
          className="absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-xl border border-white/85 bg-white/85 backdrop-blur-md transition-transform duration-500 ease-out group-hover/card:-translate-y-0.5"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px -4px rgba(14,48,93,0.18)",
          }}
        >
          <Icon className="h-5 w-5 text-[#1c5fa8]" strokeWidth={1.7} />
        </div>

        {/* Wavy divider */}
        <WaveDivider />
      </div>

      {/* Floating circular badge — straddles the boundary between
          image and content area; rendered at article level so it
          isn't clipped by the image's overflow-hidden. */}
      <div
        className="pointer-events-none absolute right-6 top-[7.5rem] z-20 grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full text-white md:top-[8.5rem]"
        style={{
          background: BRAND_GRADIENT,
          boxShadow: "0 12px 26px -10px rgba(14,48,93,0.55)",
        }}
      >
        <div className="text-center leading-tight">
          <div className="font-sans text-sm font-bold tabular-nums">
            {badgeTop}
          </div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] opacity-95">
            {badgeBottom}
          </div>
        </div>
      </div>

      {/* Lower content */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-10 md:px-7">
        <h3 className="font-serif text-[1.6rem] font-semibold tracking-tight text-foreground md:text-[1.75rem]">
          {title}
        </h3>
        <div
          className="mt-2 h-[3px] w-10 rounded-full"
          style={{ background: BRAND_GRADIENT }}
          aria-hidden
        />

        <p className="mt-4 flex-1 font-sans text-[0.9375rem] leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-8 flex items-center justify-between gap-4">
          <span
            className="font-sans text-xs font-bold uppercase tracking-[0.22em] text-[#1c5fa8] transition-[letter-spacing] duration-300 group-hover/card:tracking-[0.26em]"
            aria-hidden
          >
            Learn more
          </span>
          <span
            className="relative z-40 grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-[0_10px_22px_-10px_rgba(14,48,93,0.55)] transition-transform duration-300 ease-out group-hover/card:scale-110 group-hover/card:translate-x-0.5"
            style={{ background: BRAND_GRADIENT }}
            aria-hidden
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function FeatureShowcase() {
  const { ref: revealRef, active: revealed } = useInViewOnce<HTMLElement>(0.12);

  return (
    <section
      ref={revealRef}
      className={cn(
        "relative overflow-hidden bg-[#f6f9fc] py-12 md:py-20",
        revealFadeUpClass(revealed),
      )}
    >
      <div className="container relative z-10">
        {/* Section heading */}
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <h2 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-foreground md:text-[2.65rem] lg:text-[3rem]">
            Explore. Decide.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: BRAND_GRADIENT }}
            >
              Done.
            </span>
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
            Everything you need to find, rent, or sell verified properties with
            ease.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid gap-7 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {CARDS.map((card, i) => (
            <div
              key={card.title}
              className={cn(
                "animate-feature-card",
                revealed && "animate-feature-card--play",
              )}
              style={
                { "--feature-stagger": `${i * 115}ms` } as CSSProperties
              }
            >
              <FeatureCard card={card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
