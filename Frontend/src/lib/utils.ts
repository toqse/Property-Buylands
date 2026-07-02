import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True when an event target is inside a Radix/cmdk layer portaled outside a dialog. */
export function isPortaledOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "[data-radix-select-content]",
        "[data-radix-popover-content]",
        "[data-radix-dropdown-menu-content]",
        "[data-radix-context-menu-content]",
        "[data-radix-alert-dialog-content]",
        "[data-radix-popper-content-wrapper]",
        "[cmdk-root]",
        '[role="listbox"]',
        '[role="alertdialog"]',
      ].join(", "),
    ),
  );
}
