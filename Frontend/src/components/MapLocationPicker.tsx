"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserLocation } from "@/context/UserLocationContext";
import { reverseGeocodeOsm } from "@/lib/osmSearch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const LOCAL_ZOOM = 14;

export type MapLocationConfirm = {
  latitude: number;
  longitude: number;
  label: string;
};

type MapLocationPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCenter?: { latitude: number; longitude: number } | null;
  onConfirm: (result: MapLocationConfirm) => void;
};

const MapLocationPickerMap = dynamic(
  () =>
    import("@/components/MapLocationPickerMap").then((m) => m.MapLocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

function formatFallbackLabel(latitude: number, longitude: number): string {
  return `Selected location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
}

function shortenLabel(label: string): string {
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 3) return label;
  return parts.slice(0, 3).join(", ");
}

export function MapLocationPinButton({
  onClick,
  active = false,
  className,
  size = "navbar",
}: {
  onClick: () => void;
  active?: boolean;
  className?: string;
  size?: "navbar" | "modal";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Pick location on map"
      title="Pick location on map"
      className={cn(
        "inline-flex shrink-0 items-center justify-center border transition",
        "border-[rgba(14,48,93,0.18)] bg-white text-[#1c5fa8]",
        "hover:border-[#1c5fa8] hover:bg-[#1c5fa8]/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c5fa8]/35",
        active && "border-[#1c5fa8] bg-[#1c5fa8]/10 text-[#0e305d]",
        size === "navbar" ? "h-10 w-10 rounded-full" : "h-12 w-12 rounded-xl",
        className,
      )}
    >
      <MapPin className={cn("h-5 w-5", active && "fill-[#1c5fa8]/25")} />
    </button>
  );
}

export function MapLocationPicker({
  open,
  onOpenChange,
  initialCenter: _initialCenter,
  onConfirm,
}: MapLocationPickerProps) {
  const isMobile = useIsMobile();
  const { requestLocationForFilter } = useUserLocation();
  /** Map viewport only — not a selected filter point until the user picks. */
  const [viewCenter, setViewCenter] = useState<[number, number]>(INDIA_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pickedPosition, setPickedPosition] = useState<[number, number] | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [mapMountKey, setMapMountKey] = useState(0);
  const [mapVisible, setMapVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const initializedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      abortRef.current?.abort();
      setConfirming(false);
      setLocating(false);
      setMapVisible(false);
      setPickedPosition(null);
      setPreviewLabel("");
      setGeocoding(false);
      return;
    }

    if (!initializedForOpenRef.current) {
      initializedForOpenRef.current = true;
      setViewCenter(INDIA_CENTER);
      setZoom(DEFAULT_ZOOM);
      setPickedPosition(null);
      setPreviewLabel("");
      setRecenterKey(0);
      setMapMountKey((k) => k + 1);
    }

    const t = window.setTimeout(() => setMapVisible(true), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !pickedPosition) {
      setGeocoding(false);
      return;
    }
    const [lat, lng] = pickedPosition;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeocoding(true);

    const timer = window.setTimeout(() => {
      void reverseGeocodeOsm(lat, lng, controller.signal)
        .then((place) => {
          if (controller.signal.aborted) return;
          if (place?.label) {
            setPreviewLabel(shortenLabel(place.label));
          } else {
            setPreviewLabel(formatFallbackLabel(lat, lng));
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (!controller.signal.aborted) {
            setPreviewLabel(formatFallbackLabel(lat, lng));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setGeocoding(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, pickedPosition?.[0], pickedPosition?.[1]]);

  const handlePick = useCallback((latitude: number, longitude: number) => {
    setPickedPosition([latitude, longitude]);
    setViewCenter([latitude, longitude]);
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const result = await requestLocationForFilter();
      if (!result) return;
      const next: [number, number] = [result.latitude, result.longitude];
      setPickedPosition(next);
      setViewCenter(next);
      setZoom(LOCAL_ZOOM);
      setRecenterKey((k) => k + 1);
    } finally {
      setLocating(false);
    }
  }, [requestLocationForFilter]);

  const handleConfirm = useCallback(async () => {
    if (!pickedPosition) return;
    setConfirming(true);
    const [latitude, longitude] = pickedPosition;
    try {
      let label = previewLabel;
      if (!label || geocoding) {
        const place = await reverseGeocodeOsm(latitude, longitude);
        label = place?.label
          ? shortenLabel(place.label)
          : formatFallbackLabel(latitude, longitude);
      }
      onConfirm({ latitude, longitude, label });
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  }, [pickedPosition, previewLabel, geocoding, onConfirm, onOpenChange]);

  const hasSelection = pickedPosition != null;

  const selectedLocationBlock = (
    <div className="shrink-0 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Selected location
      </p>
      <p className="line-clamp-2 text-sm text-foreground">
        {geocoding
          ? "Looking up address…"
          : previewLabel || "Tap the map to drop a pin"}
      </p>
      {/* <p className="text-xs text-muted-foreground">
        Drag the pin or tap the map to choose a spot. Nearby properties use this point.
      </p> */}
    </div>
  );

  const currentLocationButton = (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full shrink-0 rounded-xl border-[#1c5fa8]/50 bg-white text-[#1c5fa8] hover:bg-[#1c5fa8]/5 hover:text-[#1c5fa8] focus-visible:text-[#1c5fa8] active:bg-[#1c5fa8]/10 active:text-[#1c5fa8]"
      onClick={() => void handleUseCurrentLocation()}
      disabled={locating || confirming}
    >
      <LocateFixed className="h-4 w-4 text-current" />
      {locating ? "Detecting…" : "Use my current location"}
    </Button>
  );

  const mapBlock = (
    <div
      className="relative min-h-[240px] flex-1 overflow-hidden rounded-xl border border-border/70 bg-[#e8eef5] md:min-h-[420px]"
      data-vaul-no-drag
    >
      {open && mapVisible ? (
        <MapLocationPickerMap
          key={mapMountKey}
          center={viewCenter}
          zoom={zoom}
          markerPosition={pickedPosition}
          onPick={handlePick}
          recenterKey={recenterKey}
        />
      ) : (
        <div className="flex h-full min-h-[240px] w-full items-center justify-center text-sm text-muted-foreground md:min-h-[420px]">
          Loading map…
        </div>
      )}
    </div>
  );

  const confirmButton = (
    <Button
      type="button"
      className="h-11 w-full rounded-xl bg-gradient-to-r from-[#0e305d] to-[#2f7bc4] font-semibold text-white hover:opacity-95 disabled:opacity-50"
      onClick={() => void handleConfirm()}
      disabled={confirming || !hasSelection}
    >
      {confirming ? "Applying…" : "Use this location"}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bottom-[60px] z-[120] mt-0 flex max-h-[calc(100dvh-5rem)] flex-col rounded-t-3xl">
          <DrawerHeader className="shrink-0 px-5 pb-2 pt-1 text-left">
            <DrawerTitle className="text-lg font-semibold tracking-tight">
              Pick location on map
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Drop a pin to filter nearby properties.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-5 pb-2">
            {mapBlock}
            {selectedLocationBlock}
          </div>
          <DrawerFooter className="shrink-0 gap-2 border-t border-border/70 px-5 py-2.5">
            {currentLocationButton}
            {confirmButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[110]"
        className="z-[120] flex h-[90vh] max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl border-white/70 bg-white p-0 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.45)] sm:w-[calc(100vw-3rem)]"
      >
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 pb-4 pt-5 text-left md:px-7 md:pt-6">
          <DialogTitle className="font-serif text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            Pick location on map
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground md:text-sm">
            Drop a pin to filter nearby properties.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5 md:px-7 md:py-6">
          {mapBlock}
          {selectedLocationBlock}
          {currentLocationButton}
        </div>
        <DialogFooter className="shrink-0 border-t border-border/70 px-5 py-3 md:px-7">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {confirmButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
