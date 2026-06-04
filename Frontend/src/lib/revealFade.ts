import { cn } from "@/lib/utils";

/** Scroll-triggered fade-up: inactive until intersecting — pair with {@link useInViewOnce}. */
export function revealFadeUpClass(active: boolean, className?: string) {
  return cn("reveal-fade-up", active && "reveal-fade-up-visible", className);
}
