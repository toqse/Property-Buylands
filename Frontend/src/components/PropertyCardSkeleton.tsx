import { cn } from "@/lib/utils";

/**
 * GPay-style loading placeholders that mirror the real property cards.
 * The wrapper carries `.skeleton-shimmer` (the sweeping light band) and each
 * grey shape uses `.skeleton-block`.
 */

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "skeleton-shimmer overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06]",
        className,
      )}
    >
      <div className="skeleton-block aspect-[4/3] w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="skeleton-block h-5 w-4/5 rounded-md" />
            <div className="skeleton-block mt-2.5 h-3.5 w-3/5 rounded-md" />
          </div>
          <div className="shrink-0 space-y-2 text-right">
            <div className="skeleton-block ml-auto h-5 w-20 rounded-md" />
            <div className="skeleton-block ml-auto h-2.5 w-14 rounded-md" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="skeleton-block h-9 flex-1 rounded-lg" />
          <div className="skeleton-block h-9 flex-1 rounded-lg" />
          <div className="skeleton-block h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </article>
  );
}

export function MobilePropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        "skeleton-shimmer overflow-hidden rounded-xl bg-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] ring-1 ring-black/[0.06]",
        className,
      )}
    >
      <div className="skeleton-block aspect-square w-full" />
      <div className="p-2.5">
        <div className="skeleton-block h-2.5 w-2/5 rounded" />
        <div className="skeleton-block mt-1.5 h-3 w-4/5 rounded" />
        <div className="skeleton-block mt-2 h-2.5 w-3/5 rounded" />
      </div>
    </article>
  );
}
