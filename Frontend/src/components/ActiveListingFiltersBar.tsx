"use client";

import type { ActiveListingFilterChip } from "@/lib/listingActiveFilters";
import { cn } from "@/lib/utils";

type ActiveListingFiltersBarProps = {
  chips: ActiveListingFilterChip[];
  onClearAll: () => void;
  className?: string;
};

export function ActiveListingFiltersBar({
  chips,
  onClearAll,
  className,
}: ActiveListingFiltersBarProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-2 text-sm",
        className,
      )}
      aria-live="polite"
    >
      <span className="shrink-0 text-muted-foreground">Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-full items-center rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-medium text-emerald-900 ring-1 ring-emerald-100"
        >
          <span className="truncate">{chip.label}</span>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="shrink-0 text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
