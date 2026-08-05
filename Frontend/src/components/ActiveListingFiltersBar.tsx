"use client";

import { ChevronDown } from "lucide-react";
import type { ActiveListingFilterChip } from "@/lib/listingActiveFilters";
import { RADIUS_OPTIONS } from "@/lib/locationFilter";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActiveListingFiltersBarProps = {
  chips: ActiveListingFilterChip[];
  onClearAll: () => void;
  searchRadius?: string;
  onRadiusChange?: (radiusKm: string) => void;
  className?: string;
};

function chipClassName(interactive = false) {
  return cn(
    "inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-medium text-emerald-900 ring-1 ring-emerald-100",
    interactive &&
      "cursor-pointer transition hover:bg-emerald-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
  );
}

export function ActiveListingFiltersBar({
  chips,
  onClearAll,
  searchRadius,
  onRadiusChange,
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
      {chips.map((chip) => {
        if (chip.kind === "radius" && onRadiusChange) {
          const currentRadius = searchRadius || chip.label.replace(/\D/g, "") || "10";
          return (
            <DropdownMenu key={chip.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={chipClassName(true)}
                  aria-label={`Change search radius, currently ${chip.label}`}
                >
                  <span className="truncate">{chip.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="min-w-[10.5rem] rounded-xl border-border/80 p-1 shadow-md"
              >
                <DropdownMenuRadioGroup
                  value={currentRadius}
                  onValueChange={onRadiusChange}
                >
                  {RADIUS_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem
                      key={opt.value}
                      value={opt.value}
                      className="rounded-lg py-1.5 text-[13px]"
                    >
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <span key={chip.id} className={chipClassName()}>
            <span className="truncate">{chip.label}</span>
          </span>
        );
      })}
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
