"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isBrowserReload } from "@/lib/browserReload";
import {
  hasListingFilterQueryParams,
  isListingFilterRoute,
} from "@/lib/listingFilterStorage";

/**
 * Strips listing filter query params from the URL after a browser refresh so
 * views do not rehydrate from stale URL state.
 */
export function FilterResetOnReload() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!isBrowserReload()) return;
    if (!isListingFilterRoute(pathname)) return;
    const search = searchParams?.toString() ?? "";
    if (!hasListingFilterQueryParams(search)) return;
    router.replace(pathname);
  }, [pathname, router, searchParams]);

  return null;
}
