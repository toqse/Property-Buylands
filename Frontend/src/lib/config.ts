export const DEFAULT_BACKEND_BASE_URL = "http://192.168.1.42:8000/api/";

/** Single switch for all API request/response console output */
export const display_console_logs = true;

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export function getApiBaseUrl(): string {
  // 1) An explicit env override always wins (set NEXT_PUBLIC_API_BASE_URL for prod).
  const envUrl =
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_API_BASE_URL : undefined;
  if (envUrl) return withTrailingSlash(envUrl);

  // 2) Otherwise always use the base URL configured above, regardless of which
  //    host the site was opened on.
  return withTrailingSlash(DEFAULT_BACKEND_BASE_URL);
}
