"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { forwardRef, useEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

type To = string;

const LISTING_PATH_PREFIXES = ["/buy", "/rent", "/properties"];

function normalizeAppPath(to: string): string {
  if (!to.startsWith("/")) return to;
  const hashIndex = to.indexOf("#");
  const queryIndex = to.indexOf("?");
  const cutIndex =
    hashIndex === -1
      ? queryIndex
      : queryIndex === -1
        ? hashIndex
        : Math.min(queryIndex, hashIndex);
  const pathOnly = cutIndex === -1 ? to : to.slice(0, cutIndex);
  const suffix = cutIndex === -1 ? "" : to.slice(cutIndex);
  if (pathOnly === "/" || pathOnly.endsWith("/")) return to;
  return `${pathOnly}/${suffix}`;
}

function normalizeListingPath(path: string): string {
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function splitAppPath(to: string): { pathname: string; search: string; hash: string } {
  const normalized = normalizeAppPath(to);
  const hashIndex = normalized.indexOf("#");
  const withoutHash = hashIndex === -1 ? normalized : normalized.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : normalized.slice(hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex === -1) {
    return { pathname: withoutHash, search: "", hash };
  }
  return {
    pathname: withoutHash.slice(0, queryIndex),
    search: withoutHash.slice(queryIndex + 1),
    hash,
  };
}

function isSameListingPath(a: string, b: string): boolean {
  return normalizeListingPath(a) === normalizeListingPath(b);
}

function isListingNavigation(to: string): boolean {
  const path = to.split("?")[0] ?? to;
  return LISTING_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Update listing query params without Next.js router navigation.
 * Static export (S3/CloudFront) cannot soft-navigate query changes — router.replace
 * triggers RSC/chunk fetches that 403 and fall back to a full document reload.
 */
export function replaceListingQuery(pathname: string, queryString?: string): void {
  if (typeof window === "undefined") return;
  const base = normalizeListingPath(pathname);
  const qs = queryString?.replace(/^\?/, "") ?? "";
  const url = qs ? `${base}?${qs}` : base;
  window.history.replaceState(window.history.state, "", url);
  notifyListingSearchChanged();
}

function shouldUseHistoryForListingQuery(currentPath: string, to: string): boolean {
  if (!isListingNavigation(to)) return false;
  const { pathname: targetPath } = splitAppPath(to);
  return isSameListingPath(currentPath, targetPath);
}

export function notifyListingSearchChanged(): void {
  if (typeof window !== "undefined") {
    queueMicrotask(() => window.dispatchEvent(new Event("buylands:listing-search")));
  }
}

/** Build an app path respecting `trailingSlash: true` in next.config. */
export function buildAppPath(pathname: string, queryString?: string): string {
  const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const qs = queryString?.replace(/^\?/, "") ?? "";
  return qs ? `${base}?${qs}` : base;
}

export type NavigateOptions = { replace?: boolean };

export function Link({
  to,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: To; children: ReactNode }) {
  return (
    <NextLink href={to} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    const nextTo = normalizeAppPath(to);

    if (shouldUseHistoryForListingQuery(pathname, nextTo)) {
      const { pathname: targetPath, search, hash } = splitAppPath(nextTo);
      const base = normalizeListingPath(targetPath);
      const qs = search ? `?${search}` : "";
      const url = `${base}${qs}${hash}`;
      if (options?.replace) window.history.replaceState(window.history.state, "", url);
      else window.history.pushState(window.history.state, "", url);
      notifyListingSearchChanged();
      return;
    }

    if (options?.replace) router.replace(nextTo);
    else router.push(nextTo);
    if (isListingNavigation(nextTo)) {
      notifyListingSearchChanged();
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  return { pathname: pathname ?? "/" };
}

export function useSearchParams() {
  const params = useNextSearchParams();
  const [liveVersion, setLiveVersion] = useState(0);

  useEffect(() => {
    const sync = () => setLiveVersion((v) => v + 1);
    window.addEventListener("popstate", sync);
    window.addEventListener("buylands:listing-search", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("buylands:listing-search", sync);
    };
  }, []);

  const searchParams = useMemo(() => {
    if (typeof window !== "undefined") {
      const live = window.location.search.slice(1);
      if (live) return new URLSearchParams(live);
    }
    return new URLSearchParams(params?.toString() ?? "");
    // liveVersion keeps search params in sync after history.replaceState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, liveVersion]);

  return [searchParams] as const;
}

export function useParams<T extends Record<string, string>>() {
  return useNextParams() as T;
}

type NavClassName = string | ((args: { isActive: boolean }) => string);

interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> {
  to: string;
  end?: boolean;
  className?: NavClassName;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end = false, className, ...props },
  ref,
) {
  const pathname = usePathname() ?? "/";
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;

  return (
    <NextLink
      ref={ref}
      href={to}
      className={resolvedClassName}
      aria-current={isActive ? "page" : undefined}
      {...props}
    />
  );
});
