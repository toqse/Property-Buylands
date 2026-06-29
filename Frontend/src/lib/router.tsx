"use client";

import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

type To = string;

const LISTING_PATH_PREFIXES = ["/buy", "/rent", "/properties"];

function isListingNavigation(to: string): boolean {
  const path = to.split("?")[0] ?? to;
  return LISTING_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
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

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    if (options?.replace) router.replace(to);
    else router.push(to);
    if (isListingNavigation(to)) {
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
  return [new URLSearchParams(params?.toString() ?? "")] as const;
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
