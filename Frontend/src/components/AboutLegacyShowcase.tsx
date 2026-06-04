import { Link } from "@/lib/router";
import { ArrowRight, Building2, Leaf, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const NAVY = "#0D1B2A";

const overlayItems = [
  { icon: Sparkles, label: "Timeless design" },
  { icon: Shield, label: "Uncompromising quality" },
  { icon: Leaf, label: "Enduring value" },
] as const;

function GoldDivider({ muted }: { muted?: boolean }) {
  return (
    <div className="relative my-8 flex w-full max-w-md items-center justify-center">
      <div
        className="h-px w-full opacity-90"
        style={{
          background: `linear-gradient(to right, transparent, hsl(215 75% 45% / ${muted ? 0.45 : 0.75}), transparent)`,
        }}
      />
      <span
        className="absolute h-2 w-2 rotate-45 bg-gold"
        style={{ boxShadow: "0 0 0 3px #FFFFFF" }}
        aria-hidden
      />
    </div>
  );
}

export function AboutLegacyShowcase({ imageSrc, imageAlt }: { imageSrc: string; imageAlt: string }) {
  const { ref, active } = useInViewOnce<HTMLElement>();
  return (
    <section ref={ref} className={cn("py-16 md:py-24", revealFadeUpClass(active))}>
      <div className="container mb-10 text-center md:mb-14">
        <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Portfolio &amp; craft</p>
        <div className="flex justify-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h2
            className="whitespace-nowrap px-2 font-serif tracking-tight text-foreground"
            style={{ fontSize: "clamp(1.15rem, 3.4vw, 2.5rem)", lineHeight: 1.2 }}
          >
            Enduring residences, built on care and detail
          </h2>
        </div>
        <div className="mt-4 flex justify-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p
            className="whitespace-nowrap px-2 font-sans leading-relaxed text-muted-foreground"
            style={{ fontSize: "clamp(0.68rem, 1.45vw, 1.0625rem)" }}
          >
            A glimpse of the standards behind every listing — and the story we bring to each home.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="group mx-auto grid max-h-none min-h-0 overflow-hidden rounded-[1.25rem] border border-[#E8E2D9] shadow-soft md:rounded-[1.75rem] lg:grid-cols-2 lg:rounded-[2rem]">
          {/* Left — image + feature bar */}
          <div className="relative min-h-[320px] lg:min-h-[520px]">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
            <div
              className="absolute inset-x-0 bottom-0 border-t border-white/10 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5"
              style={{ background: "linear-gradient(0deg, rgba(8,10,14,0.82) 0%, rgba(12,14,20,0.45) 100%)" }}
            >
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
                {overlayItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0">
                    <Icon className="h-5 w-5 shrink-0 text-[hsl(43,72%,58%)]" strokeWidth={1.65} aria-hidden />
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white sm:text-xs">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — copy */}
          <div className="relative flex flex-col justify-center bg-white px-8 py-12 md:px-12 md:py-14 lg:px-16 lg:py-16">
            {/* Light botanical accent */}
            <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 opacity-[0.08] md:h-64 md:w-64" aria-hidden>
              <svg viewBox="0 0 200 200" className="h-full w-full text-gold" fill="currentColor">
                <path d="M160 180c-28-48-18-92 32-128 8 36-4 72-32 128zm-20-8c-52-24-68-70-48-130 38 28 56 70 48 130zM78 175C42 118 48 72 95 40c-12 44 2 88-17 135z" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-white/80 shadow-sm backdrop-blur-sm">
                <Building2 className="h-6 w-6 text-gold" strokeWidth={1.5} aria-hidden />
              </div>

              <h3 className="mt-8 font-serif text-3xl leading-[1.15] tracking-tight md:text-[2.35rem] lg:text-[2.65rem]">
                <span className="block" style={{ color: NAVY }}>
                  A legacy of
                </span>
                <span className="block text-gold lg:mt-1">craftsmanship</span>
              </h3>

              <GoldDivider />

              <p className="max-w-md font-sans text-[15px] leading-relaxed text-foreground/78 md:text-[1.025rem]">
                From bay-front villas to skyline penthouses, our portfolio reflects the story of considered architecture and
                timeless design.
              </p>

              <Link
                to="/buy"
                className="mt-10 inline-flex items-center gap-2 rounded-lg border-2 border-gold bg-transparent px-6 py-3 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-gold transition hover:bg-gold/10"
              >
                Explore our collection <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
