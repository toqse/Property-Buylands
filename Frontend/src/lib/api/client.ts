import { display_console_logs, getApiBaseUrl } from "@/lib/config";
import { ApiError } from "@/lib/api/errors";

export const TOKEN_STORAGE_KEY = "p4u_token";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function redactForLog(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  if (body instanceof FormData) {
    const entries: Record<string, string> = {};
    body.forEach((v, k) => {
      const key = String(k);
      if (/password/i.test(key)) entries[key] = "[REDACTED]";
      else if (v instanceof File) entries[key] = `[File: ${v.name}]`;
      else entries[key] = String(v);
    });
    return entries;
  }
  const copy = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(copy)) {
    if (/password/i.test(key)) copy[key] = "[REDACTED]";
  }
  return copy;
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalized}`;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    auth = false,
    headers: extraHeaders = {},
    signal,
  } = options;

  const url = buildUrl(path);
  const headers: Record<string, string> = { ...extraHeaders };

  const authToken =
    token !== undefined ? token : auth ? getStoredToken() : null;
  if (authToken) {
    headers.Authorization = `Token ${authToken}`;
  }

  let fetchBody: BodyInit | undefined;
  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  if (display_console_logs) {
    console.group(`[API] ${method} ${url}`);
    console.log("Body:", redactForLog(body ?? null));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      signal,
    });
  } catch (err) {
    if (display_console_logs) {
      console.log("Network error:", err);
      console.groupEnd();
    }
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  let parsed: unknown = null;
  if (response.status !== 204) {
    if (contentType.includes("application/json")) {
      parsed = await response.json();
    } else {
      const text = await response.text();
      parsed = text || null;
    }
  }

  if (display_console_logs) {
    console.log("Status:", response.status);
    console.log("Response:", parsed);
    console.groupEnd();
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed !== null && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : `HTTP ${response.status}`;
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}

export function unwrapPaginated<T>(data: PaginatedResponse<T>): PaginatedResponse<T> {
  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: data.results ?? [],
  };
}

/** Normalize plain-array list responses or paginated objects. */
export function asList<T>(data: T[] | PaginatedResponse<T>): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return unwrapPaginated(data);
}

export function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
