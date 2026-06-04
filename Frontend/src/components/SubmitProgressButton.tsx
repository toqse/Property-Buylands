"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGES = [
  "Saving your Property...",
  "Compressing the Video...",
  "Almost there...",
  "Final Moment..",
];

export interface SubmitProgressButtonProps extends ButtonProps {
  /** When true, the button shows the cycling progress messages and is disabled. */
  submitting: boolean;
  /** Content shown when the button is idle (not submitting). */
  idleLabel: React.ReactNode;
  /** Ordered progress messages shown while submitting. */
  messages?: string[];
  /** Delay between progress messages, in milliseconds. */
  intervalMs?: number;
}

/**
 * A submit button that walks through a sequence of reassuring progress
 * messages while an async request is in flight. The text advances on a timer
 * and holds on the final message until the request resolves, so users have
 * something to watch during slow uploads (e.g. video compression).
 */
export function SubmitProgressButton({
  submitting,
  idleLabel,
  messages = DEFAULT_MESSAGES,
  intervalMs = 2500,
  className,
  disabled,
  ...props
}: SubmitProgressButtonProps) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (!submitting) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      // Advance through the messages and hold on the last one until done.
      setIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [submitting, intervalMs, messages.length]);

  return (
    <Button
      {...props}
      disabled={disabled || submitting}
      aria-busy={submitting}
      className={cn(
        submitting &&
          "h-auto min-h-[2.75rem] min-w-[210px] whitespace-normal py-2.5 text-center leading-snug",
        className,
      )}
    >
      {submitting ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span>{messages[index] ?? messages[messages.length - 1]}</span>
        </span>
      ) : (
        idleLabel
      )}
    </Button>
  );
}
