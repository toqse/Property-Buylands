import { Building2, Sparkles, Star, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const CREAM = "#FFFFFF";
const GOLD_HEX = "#C59D5F";

function DotGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-4 gap-x-2.5 gap-y-2", className)}
      style={{ gridTemplateRows: "repeat(4, 4px)" }}
      aria-hidden
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-gold opacity-[0.38]" />
      ))}
    </div>
  );
}

function HeaderDivider({ bgCutout }: { bgCutout: string }) {
  return (
    <div className="relative mx-auto flex w-full max-w-xl items-center justify-center">
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent opacity-85"
      />
      <span
        className="absolute h-2 w-2 rotate-45 bg-gold shadow-none"
        style={{ boxShadow: `0 0 0 3px ${bgCutout}` }}
        aria-hidden
      />
    </div>
  );
}

function LaurelStarFooter() {
  return (
    <div className="mt-7 flex items-center justify-center gap-3 border-t border-gold/10 pt-6">
      <LaurelSide mirror />
      <Star className="h-4 w-4 shrink-0 fill-gold text-gold" aria-hidden />
      <LaurelSide />
    </div>
  );
}

/** Minimal laurel sprig silhouette */
function LaurelSide({ mirror }: { mirror?: boolean }) {
  return (
    <svg
      className={cn("h-5 w-[2.125rem] shrink-0 opacity-85", mirror && "scale-x-[-1]")}
      viewBox="0 0 34 22"
      fill="none"
      aria-hidden
    >
      <path
        d="M28 17c2-8-2-13-10-13H10C3 11 8 21 28 17Z"
        className="fill-gold"
        opacity={0.22}
      />
      <path
        d="M2 17c8-14 22-17 26-17M4 17c10-11 21-13 26-13"
        stroke="currentColor"
        strokeWidth={1}
        className="text-gold"
        strokeLinecap="round"
      />
      <path
        d="M22 17c6-14 13-22 29-31M15 21c13-26 37-52 71-71"
        stroke="currentColor"
        strokeWidth={0.95}
        className="text-gold/90"
        strokeLinecap="round"
        opacity={0.7}
      />
    </svg>
  );
}

function DecorativeLeaves({ className, side }: { className?: string; side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-16 hidden opacity-[0.14] xl:block",
        side === "left" ? "-left-4 xl:left-[2%]" : "-right-4 xl:right-[2%]",
        className,
      )}
      aria-hidden
    >
      <svg
        width={120}
        height={280}
        viewBox="0 0 120 280"
        className={cn(side === "right" && "scale-x-[-1]")}
        fill="none"
      >
        <path
          d="M8 268c42-118 92-218 164-294M36 274c54-156 142-294 284-394M52 284c118-218 294-394 594-594"
          stroke={GOLD_HEX}
          strokeWidth={1.2}
          opacity={0.45}
          strokeLinecap="round"
        />
        <path
          fill={GOLD_HEX}
          opacity={0.12}
          d="M94 246c38-112 94-268 246-526C124 156 108 294 106 526c-76-154-118-284-146-446Z"
        />
        <ellipse cx={42} cy={120} rx={28} ry={72} transform="rotate(-18 42 120)" fill={GOLD_HEX} opacity={0.06} />
        <ellipse cx={78} cy={200} rx={22} ry={56} transform="rotate(12 78 200)" fill={GOLD_HEX} opacity={0.08} />
      </svg>
    </div>
  );
}

const AWARDS = [
  {
    icon: Trophy,
    title: "Best Property Platform",
    description: "Over 1000+ satisfied clients and sold out properties.",
  },
  {
    icon: Users,
    title: "Excellence in Customer Service",
    description: "Save your time with a quick response for property sale or rent.",
  },
  {
    icon: Sparkles,
    title: "Most Innovative Real Estate Company",
    description: "Experienced professionals dedicated to perfect property.",
  },
  {
    icon: Building2,
    title: "Top Rated Property Marketplace",
    description: "Clear transactions and secure process.",
  },
] as const;

const flipEase = "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]";

function AwardFlipCard({ item, index }: { item: (typeof AWARDS)[number]; index: number }) {
  const Icon = item.icon;
  const faceChrome =
    "rounded-2xl border border-gold/35 bg-card/95 shadow-[0_14px_40px_-24px_rgba(30,20,12,0.18)] backdrop-blur-sm [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";
  const faceHoverGlow =
    "group-hover/card:border-gold group-hover/card:shadow-[0_22px_48px_-20px_rgba(197,157,95,0.28)]";

  return (
    <div
      role="group"
      aria-labelledby={`award-card-title-${index}`}
      className={cn(
        "award-card-flip-wrap group/card h-full min-h-[17rem] animate-fade-in rounded-2xl outline-none",
        "[perspective:clamp(760px,90vw,1200px)]",
        "focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      )}
      style={{ animationDelay: `${index * 90}ms` }}
      tabIndex={0}
    >
      <div
        className={cn(
          "award-card-flip-inner relative h-full w-full transition-[transform] duration-700",
          flipEase,
          "[transform-style:preserve-3d]",
          "group-hover/card:[transform:rotateY(180deg)] group-focus-within/card:[transform:rotateY(180deg)]",
        )}
      >
        <article
          className={cn(
            "absolute inset-0 flex flex-col px-6 pb-7 pt-8 transition-[border-color,box-shadow] duration-300",
            faceChrome,
            faceHoverGlow,
          )}
        >
          <div className="mx-auto mb-6 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border border-gold/40 bg-white shadow-[inset_0_2px_12px_rgba(255,255,255,0.9),0_10px_26px_-14px_rgba(0,0,0,0.16)] ring-4 ring-gold/15">
            <Icon className="h-[1.4rem] w-[1.4rem] text-gold-deep stroke-[2]" aria-hidden />
          </div>
          <h3
            id={`award-card-title-${index}`}
            className="text-center font-sans text-base font-semibold leading-snug tracking-tight text-foreground md:text-[1.05rem]"
          >
            {item.title}
          </h3>
          <p className="mt-4 flex-1 text-center font-sans text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          <LaurelStarFooter />
        </article>

        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 py-8 text-center transition-[border-color,box-shadow] duration-300",
            faceChrome,
            faceHoverGlow,
            "[transform:rotateY(180deg)]",
          )}
          aria-hidden
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_90%_70%_at_50%_20%,hsla(38,55%,96%,0.95),transparent_65%)]" aria-hidden />
          <Icon className="relative h-10 w-10 text-gold/35 stroke-[1.25]" aria-hidden />
          <div className="relative space-y-2">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/90">Recognized</p>
            <p className="font-serif text-lg font-medium leading-snug text-foreground md:text-xl">{item.title}</p>
            <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
            <p className="max-w-[14rem] font-sans text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
          <Star className="relative mt-1 h-4 w-4 fill-gold/25 text-gold/50" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function AwardsRecognition({ className }: { className?: string }) {
  const { ref: sectionRef, active: sectionSeen } = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={sectionRef}
      className={cn("relative overflow-hidden py-20 md:py-24", revealFadeUpClass(sectionSeen), className)}
      style={{ backgroundColor: CREAM }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 50% -20%, hsla(38, 55%, 70%, 0.18), transparent 55%),
            radial-gradient(ellipse 65% 50% at 100% 30%, hsla(38, 48%, 65%, 0.1), transparent 50%),
            radial-gradient(ellipse 55% 45% at 0% 60%, hsla(36, 40%, 70%, 0.08), transparent 45%)`,
        }}
      />
      <div className="pointer-events-none absolute -left-40 top-24 h-[22rem] w-[22rem] rounded-full blur-3xl bg-gold/10" aria-hidden />
      <div className="pointer-events-none absolute -right-36 bottom-20 h-[18rem] w-[18rem] rounded-full blur-3xl bg-gold/08" aria-hidden />

      <DecorativeLeaves side="left" />
      <DecorativeLeaves side="right" />

      <div className="container relative mx-auto max-w-[min(1400px,calc(100%-2rem))] px-4">
        <DotGrid className="absolute left-4 top-0 md:left-8" />

        <div className="relative mx-auto max-w-3xl pt-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-lg border border-gold/25 px-5 py-2.5 shadow-sm" style={{ backgroundColor: "hsla(38, 52%, 92%, 0.95)" }}>
            <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground uppercase">
              Our achievements
            </span>
          </div>

          <h2 className="mt-8 font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl md:text-[2.85rem] md:leading-[1.18]">
            <span className="block md:inline md:mr-2">Awards &amp;</span>
            <span className="block font-semibold text-gold md:inline">Recognition</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl font-sans text-base leading-relaxed text-foreground/75 md:text-lg">
            Our commitment to excellence has been recognized throughout the industry
          </p>

          <div className="mt-8">
            <HeaderDivider bgCutout={CREAM} />
          </div>
        </div>

        <div className="relative mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-7">
          {AWARDS.map((item, index) => (
            <AwardFlipCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
