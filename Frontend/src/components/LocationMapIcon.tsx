import { cn } from "@/lib/utils";

/** Shared map marker asset for location fields and map picker triggers. */
export function LocationMapIcon({ className }: { className?: string }) {
  return (
    <img
      src="/map.png"
      alt=""
      aria-hidden
      className={cn("object-contain", className)}
    />
  );
}
