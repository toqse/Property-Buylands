import { isBrowserReload } from "@/lib/browserReload";
import { clearAllListingFilterStorage } from "@/lib/listingFilterStorage";

/** Runs synchronously on the client before React state initialises. */
export function runListingFilterBootstrapOnReload(): void {
  if (typeof window === "undefined") return;
  if (!isBrowserReload()) return;
  clearAllListingFilterStorage();
}

if (typeof window !== "undefined") {
  runListingFilterBootstrapOnReload();
}
