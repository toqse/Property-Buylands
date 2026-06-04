import type { ReactNode } from "react";
import { Link } from "@/lib/router";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Handshake,
  Home,
  Megaphone,
  Search,
} from "lucide-react";

import imgMarketing from "@/assets/service1.png";
import imgManagement from "@/assets/Screenshot 2026-05-05 114726.png";
import imgSurvey from "@/assets/Screenshot 2026-05-05 114721.png";
import imgAssets from "@/assets/Screenshot 2026-05-05 114716.png";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { imageSrc } from "@/lib/image";

/** Base wash — pure white background */
const creamBg = "#FFFFFF";
const GOLD = "#C5A059";

function IconMarketing() {
  return (
    <span className="relative inline-flex h-[1.625rem] w-[1.625rem] items-center justify-center" aria-hidden>
      <Home className="h-6 w-6" strokeWidth={1.35} />
      <Megaphone className="absolute -right-1.5 -top-1 h-4 w-4" strokeWidth={2} />
    </span>
  );
}

function IconManagement() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center" aria-hidden>
      <Handshake className="h-[1.375rem] w-[1.375rem]" strokeWidth={1.5} />
      <Home className="absolute left-[42%] top-[48%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2" strokeWidth={2.2} />
    </span>
  );
}

function IconSurvey() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center" aria-hidden>
      <ClipboardCheck className="h-6 w-6" strokeWidth={1.45} />
      <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-white ring-1 ring-[#C5A059]/40">
        <Search className="h-2 w-2" strokeWidth={3} style={{ color: GOLD }} />
      </span>
    </span>
  );
}

function IconAssets() {
  return (
    <span className="inline-flex h-7 items-end justify-center gap-px" aria-hidden>
      <Building2 className="h-3.5 w-2.5 translate-y-0.5 opacity-90" strokeWidth={1.5} />
      <Building2 className="h-5 w-3.5" strokeWidth={1.5} />
      <Building2 className="h-4 w-2.5 translate-y-0.5 opacity-90" strokeWidth={1.5} />
    </span>
  );
}

type ServiceBlock = {
  img: string;
  imgAlt: string;
  imageRight: boolean;
  icon: ReactNode;
  title: string;
  description: string;
};

const BLOCKS: ServiceBlock[] = [
  {
    img: imgMarketing,
    imgAlt: "Modern luxury residence at dusk beside a swimming pool",
    imageRight: false,
    icon: <IconMarketing />,
    title: "Property Marketing",
    description:
      "We showcase your property with professional photography and smart campaigns, reaching the right buyers or tenants to maximize visibility, value and speed.",
  },
  {
    img: imgManagement,
    imgAlt: "Luxurious modern living room with floor-to-ceiling windows",
    imageRight: true,
    icon: <IconManagement />,
    title: "Property Management",
    description:
      "We manage your property like our own with complete care and transparency. From tenants to maintenance, we handle everything so you can enjoy peace of mind.",
  },
  {
    img: imgSurvey,
    imgAlt: "Surveying equipment with residential construction in the distance",
    imageRight: false,
    icon: <IconSurvey />,
    title: "Property Survey",
    description:
      "Our expert team provides accurate property surveys and documentation to help you make informed decisions with confidence and clarity.",
  },
  {
    img: imgAssets,
    imgAlt: "Modern multi-storey apartments at night",
    imageRight: true,
    icon: <IconAssets />,
    title: "The Real Asset is Here",
    description:
      "Discover trusted properties that deliver real value and long-term growth. Your future-ready asset is just a step away.",
  },
];

/** Image corners: left blocks → TL + BR ; right blocks → TR + BL */
function imageCornerClass(imageRight: boolean) {
  return imageRight ? "rounded-tr-[26px] rounded-bl-[26px]" : "rounded-tl-[26px] rounded-br-[26px]";
}

function HeaderDivider() {
  return (
    <div className="relative mx-auto mt-6 flex max-w-lg items-center justify-center">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C5A059]/52 to-transparent" />
      <span
        className="absolute h-2 w-2 rotate-45"
        style={{ backgroundColor: GOLD, boxShadow: `0 0 0 4px ${creamBg}` }}
        aria-hidden
      />
    </div>
  );
}

function ServicesBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Layered radial + vertical wash — airy center glow, soft edge */}
      <div
        className="absolute inset-0"
        style={{
          background: "#FFFFFF",
        }}
      />

      {/* Top-left — sweeping gold arcs */}
      <svg
        className="absolute -left-[8%] -top-2 h-[9.5rem] w-[min(92vw,32rem)] text-[#C5A059] sm:h-[11rem]"
        fill="none"
        preserveAspectRatio="xMinYMin meet"
        style={{ opacity: 0.24 }}
        viewBox="0 0 460 148"
      >
        <path
          d="M -12 138 C 92 118 148 152 226 134 C 310 118 392 146 478 126"
          stroke="currentColor"
          strokeWidth="1.05"
          strokeLinecap="round"
        />
        <path
          d="M -24 108 C 88 94 154 132 238 118 C 318 106 394 134 482 118"
          stroke="currentColor"
          strokeOpacity={0.55}
          strokeWidth="0.75"
          strokeLinecap="round"
        />
        <path
          d="M 8 176 C 98 154 174 174 266 154 C 352 138 396 154 466 146"
          stroke="currentColor"
          strokeOpacity={0.42}
          strokeWidth="0.65"
          strokeLinecap="round"
        />
        <path d="M 42 124 Q 164 118 274 134 T 446 138" stroke="currentColor" strokeOpacity={0.35} strokeWidth="0.55" strokeLinecap="round" />
      </svg>

      {/* Soft secondary glow ring — reinforces corner warmth */}
      <div
        className="absolute -left-28 top-4 h-[18rem] w-[18rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle at 40% 40%, hsla(39, 55%, 88%, 0.45), transparent 70%)",
        }}
      />

      {/* Top-right — faint architectural / blueprint motif */}
      <div
        className="absolute -right-[3%] top-[-2%] h-[clamp(240px,40vw,400px)] w-[clamp(240px,48vw,480px)]"
        style={{
          opacity: 0.055,
          color: GOLD,
          filter: "blur(0.2px)",
        }}
      >
        <svg viewBox="0 0 420 340" fill="none" stroke="currentColor" className="h-full w-full" strokeWidth={0.7}>
          <path d="M52 294h324M74 266h274M94 238h246M118 206h218M146 174h174M174 146h138" strokeLinecap="round" />
          <rect x={118} y={58} width={212} height={168} rx={2} strokeOpacity={0.85} />
          <path d="M216 62v218M294 154h-174M216 174h96M216 210h144" strokeLinecap="square" opacity={0.75} strokeWidth={0.55} />
          <path d="M134 274l82-218 92 218M294 274V92h108v182" opacity={0.55} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={330} cy={118} r={4} opacity={0.6} strokeWidth={0.5} />
          <path d="M330 134v116" opacity={0.5} strokeWidth={0.5} strokeDasharray="3 6" />
        </svg>
      </div>

      {/* Wide upper sheen */}
      <div
        className="absolute inset-x-0 top-0 h-[45%]"
        style={{
          background:
            "linear-gradient(165deg, hsl(43 72% 99.8% / 0.94) 0%, hsla(38, 40%, 97%, 0) 72%)",
        }}
      />
    </div>
  );
}

export function AboutServicesGrid() {
  const { ref: sectionRef, active: sectionSeen } = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={sectionRef}
      className={cn("relative overflow-hidden py-12 md:py-14 lg:py-16", revealFadeUpClass(sectionSeen))}
      style={{ backgroundColor: creamBg }}
    >
      <ServicesBackdrop />

      <div className="container relative z-10">
        <header className="mx-auto max-w-3xl pb-8 text-center md:pb-10 lg:pb-12">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px max-w-[5rem] flex-1 bg-[#C5A059]/42 sm:max-w-[6.25rem]" />
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.32em] md:text-[11px]" style={{ color: GOLD }}>
              Our services
            </p>
            <div className="h-px max-w-[5rem] flex-1 bg-[#C5A059]/42 sm:max-w-[6.25rem]" />
          </div>
          <h2 className="mt-6 font-serif text-[1.75rem] font-medium leading-[1.1] tracking-tight text-black md:mt-7 md:text-4xl lg:mt-8 lg:text-[2.85rem]">
            <span className="mr-2 inline md:mr-3">Services</span>
            <span style={{ color: GOLD }}>We Offer</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground md:mt-4 md:text-[0.9375rem]">
            Our commitment to excellence and client satisfaction drives everything we do.
          </p>
          <HeaderDivider />
        </header>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-10 md:gap-y-11 lg:max-w-none lg:grid-cols-2 lg:gap-x-12 lg:gap-y-12">
          {BLOCKS.map((b, i) => {
            const img = (
              <div
                className={cn(
                  "relative w-full shrink-0 overflow-hidden md:h-[240px] md:w-[44%] lg:h-[254px]",
                  "min-h-[200px]",
                  imageCornerClass(b.imageRight),
                )}
              >
                <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-tr from-black/10 via-transparent to-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <img
                  src={imageSrc(b.img)}
                  alt={b.imgAlt}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            );

            const copy = (
              <div className={cn("flex min-w-0 flex-1 flex-col justify-center", "bg-transparent py-6 md:py-4 lg:py-5")}>
                <div className="flex items-stretch gap-5 md:gap-6">
                  {/* Icon + vertical gold rail to content depth */}
                  <div className="flex min-h-[140px] flex-col items-center md:min-h-[168px]">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white/70 shadow-[0_0_0_1px_rgba(197,160,89,0.07),0_12px_28px_-18px_rgba(197,160,89,0.22)] md:h-[3.25rem] md:w-[3.25rem]"
                      style={{ borderColor: GOLD, color: GOLD }}
                    >
                      {b.icon}
                    </div>
                    <div
                      className="mt-3 flex w-[1px] flex-1 min-h-[4.5rem] bg-gradient-to-b from-[#C5A059]/85 via-[#C5A059]/35 to-transparent md:mt-4"
                      aria-hidden
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="font-serif text-[1.2rem] font-bold leading-snug tracking-tight text-black md:text-[1.4rem] lg:text-[1.5rem]">
                      {b.title}
                    </h3>
                    <p className="mt-3 font-sans text-[13px] leading-[1.7] text-[hsl(220_13%_38%)] md:mt-3.5 md:text-[0.9rem] md:leading-[1.72]">
                      {b.description}
                    </p>
                    <Link
                      to="/buy"
                      className="mt-auto inline-flex w-fit items-center gap-2 pb-1 pt-5 font-sans text-[11px] font-semibold uppercase tracking-[0.24em] md:pt-6"
                      style={{ color: GOLD }}
                    >
                      Learn More <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            );

            return (
              <div
                key={b.title}
                className={cn(
                  "group flex animate-fade-in flex-col gap-6 md:items-center",
                  b.imageRight ? "md:flex-row-reverse md:gap-8 lg:gap-10" : "md:flex-row md:gap-8 lg:gap-10",
                )}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {img}
                {copy}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
