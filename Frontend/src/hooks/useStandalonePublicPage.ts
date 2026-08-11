"use client";

import { useEffect } from "react";

/** Removes mobile bottom-nav padding on standalone legal/info pages. */
export function useStandalonePublicPage() {
  useEffect(() => {
    document.body.classList.remove("pb-16");
    return () => {
      document.body.classList.add("pb-16");
    };
  }, []);
}
