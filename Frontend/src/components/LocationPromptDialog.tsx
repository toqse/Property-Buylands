"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LocationPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  onDismiss: () => void;
  loading?: boolean;
};

export function LocationPromptDialog({
  open,
  onOpenChange,
  onAllow,
  onDismiss,
  loading = false,
}: LocationPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Show properties near you
          </DialogTitle>
          <DialogDescription>
            Allow location access once to see the nearest properties and ads first. You can
            continue without sharing your location.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDismiss} disabled={loading}>
            Not now
          </Button>
          <Button type="button" variant="luxe" onClick={onAllow} disabled={loading}>
            {loading ? "Detecting…" : "Allow location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
