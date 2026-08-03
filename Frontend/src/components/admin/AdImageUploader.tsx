"use client";

import { Label } from "@/components/ui/label";
import { Upload, XCircle } from "lucide-react";

type AdImageUploaderProps = {
  id: string;
  label: string;
  preview: string;
  onFile: (file: File | null | undefined) => void;
  onClear: () => void;
};

export function AdImageUploader({
  id,
  label,
  preview,
  onFile,
  onClear,
}: AdImageUploaderProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <label
        htmlFor={id}
        className="relative block h-32 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary hover:bg-primary/5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <XCircle className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              PNG, JPG, WebP up to 10MB
            </span>
          </div>
        )}
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
