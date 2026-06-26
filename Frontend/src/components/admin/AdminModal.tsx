"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Lightweight modal that portals to document.body after mount.
 * Used where Radix Dialog can fail to appear on static-export deployments.
 */
export function AdminModal({
  open,
  onClose,
  title,
  children,
  className,
}: AdminModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={cn(
          "relative z-[201] w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-border bg-background p-5 sm:p-6 shadow-lg",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 pr-8">
          <h2
            id="admin-modal-title"
            className="font-serif text-xl font-semibold leading-tight"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm text-foreground/80 opacity-70 transition-opacity hover:opacity-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
