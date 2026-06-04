import type { CSSProperties, ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { revealFadeUpClass } from "@/lib/revealFade";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  /** Extra delay once visible (for stagger across siblings) */
  delayMs?: number;
  threshold?: number;
};

export function RevealOnScroll({ children, className, delayMs = 0, threshold = 0.12 }: RevealOnScrollProps) {
  const { ref, active } = useInViewOnce<HTMLDivElement>(threshold);
  const style: CSSProperties | undefined =
    active && delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <div ref={ref} className={revealFadeUpClass(active, className)} style={style}>
      {children}
    </div>
  );
}
