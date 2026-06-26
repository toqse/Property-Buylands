import { cn } from "@/lib/utils";

export const Logo = ({
  src,
  className,
  imgClassName,
  variant = "dark",
  withWordmark = false,
}: {
  src?: string;
  className?: string;
  imgClassName?: string;
  variant?: "dark" | "light" | "hero";
  withWordmark?: boolean;
}) => {
  return (
    <div className={cn("flex items-center gap-5", className)}>
      <img
        src={src ?? "/brand/logo.png"}
        alt="Buy Lands India"
        className={cn(
          "w-auto shrink-0 object-contain origin-left max-h-full",
          variant === "hero"
            ? "h-22 md:h-26"
            : "h-14 md:h-14",
          variant === "light" && "brightness-[1.06] contrast-[1.02]",
          imgClassName,
        )}
      />
      {withWordmark && (
        <div className="pl-1 leading-none">
          <div className="font-serif text-[1.15rem] font-semibold tracking-[0.18em] text-[hsl(30_12%_12%)]">
            BUYLANDS
          </div>
          <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.52em] text-gold">
            India
          </div>
        </div>
      )}
    </div>
  );
};
