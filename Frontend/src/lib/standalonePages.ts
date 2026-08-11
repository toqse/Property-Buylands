const STANDALONE_PUBLIC_PATHS = [
  "/privacy-policy",
  "/terms-conditions",
  "/delete-my-account",
] as const;

export function isStandalonePublicPage(pathname: string): boolean {
  return STANDALONE_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
