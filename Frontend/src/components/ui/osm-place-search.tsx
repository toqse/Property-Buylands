"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatCoordinateForApi,
  getBrowserCoordinates,
  reverseGeocodeOsm,
  searchOsmPlaces,
} from "@/lib/osmSearch";

export type OsmPlaceSelection = {
  city: string;
  latitude: string;
  longitude: string;
  displayName: string;
};

type OsmPlaceSearchProps = {
  value?: string;
  displayLabel?: string;
  onSelect: (place: OsmPlaceSelection) => void;
  stateName?: string;
  districtName?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  includeCurrentLocation?: boolean;
  currentLocationLabel?: string;
};

function geolocationErrorMessage(code: string): string {
  switch (code) {
    case "unsupported":
      return "Geolocation is not supported by your browser.";
    case "denied":
      return "Location permission denied. Allow access in your browser settings.";
    case "timeout":
      return "Could not detect your location in time. Please try again.";
    default:
      return "Could not detect your location. Please try again.";
  }
}

/**
 * Async place search powered by OpenStreetMap Nominatim.
 * Biases results toward the selected district/state within India.
 */
export function OsmPlaceSearch({
  value,
  displayLabel,
  onSelect,
  stateName,
  districtName,
  placeholder = "Search place…",
  searchPlaceholder = "Type city, town, or locality…",
  disabled = false,
  className,
  includeCurrentLocation = true,
  currentLocationLabel = "Use current location",
}: OsmPlaceSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<
    Awaited<ReturnType<typeof searchOsmPlaces>>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [locating, setLocating] = React.useState(false);

  const selectedLabel = displayLabel || value;

  React.useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      searchOsmPlaces(trimmed, controller.signal, { districtName, stateName })
        .then((data) => {
          setResults(data);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
          setLoading(false);
          setError("Could not load places. Please try again.");
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, districtName, stateName]);

  const applySelection = React.useCallback(
    (selection: OsmPlaceSelection) => {
      onSelect(selection);
      setOpen(false);
      setQuery("");
      setResults([]);
      setError(null);
    },
    [onSelect],
  );

  const handleSelect = (place: (typeof results)[number]) => {
    applySelection({
      city: place.city,
      latitude: formatCoordinateForApi(place.latitude),
      longitude: formatCoordinateForApi(place.longitude),
      displayName: place.label,
    });
  };

  const handleCurrentLocation = React.useCallback(async () => {
    if (locating) return;
    setLocating(true);
    setError(null);

    try {
      const coords = await getBrowserCoordinates();
      let city = "Current location";
      let displayName = city;

      try {
        const place = await reverseGeocodeOsm(
          coords.latitude,
          coords.longitude,
        );
        if (place?.city) {
          city = place.city;
          displayName = place.label;
        }
      } catch {
        /* reverse geocode failed — keep fallback label */
      }

      applySelection({
        city,
        latitude: formatCoordinateForApi(coords.latitude),
        longitude: formatCoordinateForApi(coords.longitude),
        displayName,
      });
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "unavailable";
      toast.error(geolocationErrorMessage(code));
    } finally {
      setLocating(false);
    }
  }, [applySelection, locating]);

  const showSearchHint = query.trim().length < 2;
  const showSearchResults = query.trim().length >= 2;

  return (
    <div className="min-w-0">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setResults([]);
            setError(null);
            setLocating(false);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 w-full min-w-0 justify-between rounded-md border-input bg-background px-3 font-normal",
              !selectedLabel && "text-muted-foreground",
              className,
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedLabel || placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
            />
            <CommandList>
              {includeCurrentLocation ? (
                <CommandGroup>
                  <CommandItem
                    value="__current_location__"
                    disabled={locating}
                    onSelect={() => void handleCurrentLocation()}
                  >
                    {locating ? (
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <LocateFixed className="mr-2 h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span>
                      {locating ? "Detecting location…" : currentLocationLabel}
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}

              {includeCurrentLocation && showSearchResults ? (
                <CommandSeparator />
              ) : null}

              {showSearchResults ? (
                loading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : error ? (
                  <div className="py-6 text-center text-sm text-destructive">
                    {error}
                  </div>
                ) : results.length === 0 ? (
                  <CommandEmpty>No places found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {results.map((result) => (
                      <CommandItem
                        key={`${result.latitude}-${result.longitude}-${result.label}`}
                        value={result.label}
                        onSelect={() => handleSelect(result)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value && result.city === value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="line-clamp-2">{result.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              ) : showSearchHint ? (
                <CommandEmpty>
                  Type at least 2 characters to search.
                </CommandEmpty>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
