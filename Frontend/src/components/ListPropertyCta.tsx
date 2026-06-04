import { Link } from "@/lib/router";
import { Home, MessageCircleMore, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const GOLD = "#c9a049";
const NAVY = "#0e305d";

function DotGrid({
  cols,
  rows,
  className,
}: {
  cols: number;
  rows: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, 4px)` }}
      aria-hidden
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span
          key={i}
          className="h-1 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: `${NAVY}40` }}
        />
      ))}
    </div>
  );
}

function HomePlusIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <Home className="absolute h-[1.35rem] w-[1.35rem] text-white" strokeWidth={2} />
      <span className="absolute -right-0.5 -top-0.5 flex h-[0.62rem] w-[0.62rem] items-center justify-center rounded-[2px] bg-white">
        <span className="text-[10px] font-bold leading-none" style={{ color: NAVY }}>
          +
        </span>
      </span>
    </span>
  );
}

export function ListPropertyCta({ className }: { className?: string }) {
  const { ref, active } = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={ref}
      className={cn(
        "container pt-10 pb-6 md:pt-16 md:pb-10",
        revealFadeUpClass(active),
        className,
      )}
    >
      <div
        className="relative mx-auto max-w-[min(1400px,calc(100%-1rem))] overflow-hidden rounded-[2rem] border bg-white px-5 py-10 shadow-[0_24px_70px_-48px_rgba(14,48,93,0.4)] md:px-12 md:py-14 lg:px-16 lg:py-16"
        style={{
          borderColor: `${NAVY}1f`,
        }}
      >
        {/* Top-left dot grid decoration */}
        <DotGrid
          cols={4}
          rows={3}
          className="absolute left-6 top-7 md:left-10 md:top-9"
        />

        {/* DESKTOP — oversized villa "half-circle" bleeding off the right edge */}
        <div
          className="pointer-events-none absolute -right-[8%] top-1/2 hidden aspect-square h-[150%] -translate-y-1/2 lg:block"
          aria-hidden
        >
          {/* Blue gradient ring (rendered as a slightly larger ring under the image) */}
          <div
            className="absolute inset-0 rounded-full p-[3px]"
            style={{
              background:
                "conic-gradient(from 220deg at 50% 50%, #0e305d 0%, #1c5fa8 25%, #3a8dd6 50%, #1c5fa8 75%, #0e305d 100%)",
              boxShadow: "0 30px 60px -30px rgba(14,48,93,0.45)",
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-full">
              <img
                src="/home.png"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
          {/* Soft blue glow behind the curve */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(28,95,168,0.30) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8 xl:gap-10">
          {/* LEFT COLUMN */}
          <div className="flex min-w-0 flex-col items-start text-left">
            {/* Eyebrow pill */}
            <div
              className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ borderColor: `${NAVY}33`, color: NAVY }}
            >
              <Star className="h-3.5 w-3.5" style={{ color: NAVY, fill: NAVY }} aria-hidden />
              Let&apos;s get started
            </div>

            {/* Heading */}
            <h2
              className="mt-7 font-serif text-[2.25rem] font-bold leading-[1.05] tracking-tight sm:text-[2.75rem] lg:text-[3.25rem]"
              style={{ color: NAVY }}
            >
              <span className="block">Ready to list</span>
              <span
                className="mt-1 block bg-clip-text italic text-transparent"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  backgroundImage:
                    "linear-gradient(135deg,#0e305d 0%,#1c5fa8 50%,#3a8dd6 100%)",
                }}
              >
                your property?
              </span>
            </h2>

            {/* Divider with diamond */}
            <div className="mt-7 flex items-center gap-2" aria-hidden>
              <span
                className="h-[2px] w-20 rounded-full md:w-28"
                style={{ background: `linear-gradient(to right, transparent, #1c5fa8, #0e305d)` }}
              />
              <span
                className="h-2 w-2 rotate-45 rounded-[1px]"
                style={{ backgroundColor: NAVY }}
              />
              <span
                className="h-[2px] w-20 rounded-full md:w-28"
                style={{ background: `linear-gradient(to left, transparent, #1c5fa8, #0e305d)` }}
              />
            </div>

            {/* Subtitle */}
            <p className="mt-6 max-w-xl font-sans text-[15px] leading-relaxed text-foreground/70 md:text-[16px]">
            Reach genuine buyers and manage listings with a modern real estate platform.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:gap-4">
              <Button
                asChild
                className="h-12 rounded-xl border-0 px-6 font-sans text-[14px] font-semibold text-white shadow-[0_14px_28px_-16px_rgba(14,48,93,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(14,48,93,0.9)] md:text-[15px]"
                style={{
                  background:
                    "linear-gradient(135deg,#0e305d 0%,#1c5fa8 55%,#2a6bb5 100%)",
                }}
              >
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2.5 leading-none"
                >
                  <HomePlusIcon />
                  <span className="leading-none">List a property</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border bg-white px-6 font-sans text-[14px] font-semibold shadow-sm transition-all hover:bg-white hover:shadow-md md:text-[15px]"
                style={{ borderColor: `${NAVY}30`, color: NAVY }}
              >
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2.5 leading-none"
                >
                  <MessageCircleMore
                    className="h-[18px] w-[18px] shrink-0"
                    style={{ color: NAVY }}
                    strokeWidth={1.85}
                    aria-hidden
                  />
                  <span className="leading-none">Talk to an expert</span>
                </Link>
              </Button>
            </div>

            {/* Trust line */}
            <div className="mt-7 flex items-center gap-2.5">
              <div
                className="grid h-7 w-7 place-items-center rounded-full"
                style={{ backgroundColor: `${NAVY}10` }}
              >
                <ShieldCheck
                  className="h-4 w-4"
                  style={{ color: NAVY }}
                  strokeWidth={1.85}
                  aria-hidden
                />
              </div>
              <p className="font-sans text-[13px] text-foreground/65 md:text-[14px]">
                Trusted by thousands of property owners across the country.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN — placeholder so the grid keeps the left content within ~55% on desktop */}
          <div aria-hidden className="hidden lg:block" />
        </div>

        {/* MOBILE / TABLET — rounded image below the content */}
        <div className="relative z-10 mt-10 lg:hidden">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-2xl p-[3px] shadow-[0_18px_44px_-22px_rgba(14,48,93,0.45)]"
            style={{
              background:
                "linear-gradient(135deg,#0e305d 0%,#1c5fa8 50%,#3a8dd6 100%)",
            }}
          >
            <div className="overflow-hidden rounded-[calc(1rem-3px)]">
              <img
                src="/home.png"
                alt="Modern villa with landscaped garden at dusk"
                className="h-full w-full object-cover aspect-[4/3]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
