import { display_console_logs, getApiBaseUrl } from "@/lib/config";
import { ApiError } from "@/lib/api/errors";

export const TOKEN_STORAGE_KEY = "p4u_token";

/**
 * Dispatched on `window` when an authenticated request returns 401, signalling
 * that the stored token is no longer valid and the session should be cleared.
 */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

function emitUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type UploadProgressCallback = (info: {
  loaded: number;
  total: number;
  /** 0–100 when Content-Length is known; null otherwise. */
  percent: number | null;
}) => void;

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onUploadProgress?: UploadProgressCallback;
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

function resolveAuthToken(
  token: string | null | undefined,
  auth: boolean,
): string | null {
  if (token !== undefined) return token;
  return auth ? getStoredToken() : null;
}

function parseXhrResponse<T>(xhr: XMLHttpRequest): T {
  const contentType = xhr.getResponseHeader("content-type") || "";
  let parsed: unknown = null;
  if (xhr.status !== 204) {
    const text = xhr.responseText;
    if (contentType.includes("application/json")) {
      parsed = text ? JSON.parse(text) : null;
    } else {
      parsed = text || null;
    }
  }

  if (xhr.status >= 200 && xhr.status < 300) {
    return parsed as T;
  }

  const message =
    typeof parsed === "object" && parsed !== null && "detail" in parsed
      ? String((parsed as { detail: unknown }).detail)
      : `HTTP ${xhr.status}`;
  throw new ApiError(message, xhr.status, parsed);
}

function apiRequestViaXhr<T>(
  url: string,
  options: ApiRequestOptions,
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    auth = false,
    headers: extraHeaders = {},
    signal,
    onUploadProgress,
  } = options;

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    const authToken = resolveAuthToken(token, auth);
    if (authToken) {
      xhr.setRequestHeader("Authorization", `Token ${authToken}`);
    }
    for (const [key, value] of Object.entries(extraHeaders)) {
      xhr.setRequestHeader(key, value);
    }

    if (onUploadProgress && body instanceof FormData) {
      xhr.upload.addEventListener("progress", (event) => {
        onUploadProgress({
          loaded: event.loaded,
          total: event.total,
          percent: event.lengthComputable
            ? Math.min(100, Math.round((event.loaded / event.total) * 100))
            : null,
        });
      });
    }

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.onload = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (display_console_logs) {
        console.log("Status:", xhr.status);
        console.log("Response:", xhr.responseText);
        console.groupEnd();
      }
      try {
        if (xhr.status === 401 && authToken) {
          emitUnauthorized();
        }
        resolve(parseXhrResponse<T>(xhr));
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (display_console_logs) {
        console.log("Network error");
        console.groupEnd();
      }
      reject(new Error("Network error"));
    };

    xhr.onabort = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (display_console_logs) {
        console.groupEnd();
      }
      reject(new DOMException("Aborted", "AbortError"));
    };

    let xhrBody: Document | XMLHttpRequestBodyInit | null | undefined;
    if (body instanceof FormData) {
      xhrBody = body;
    } else if (body !== undefined && body !== null) {
      xhr.setRequestHeader("Content-Type", "application/json");
      xhrBody = JSON.stringify(body);
    }

    xhr.send(xhrBody);
  });
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
    onUploadProgress,
  } = options;

  const url = buildUrl(path);

  if (onUploadProgress && body instanceof FormData) {
    if (display_console_logs) {
      console.group(`[API] ${method} ${url} (xhr upload)`);
      console.log("Body:", redactForLog(body));
    }
    return apiRequestViaXhr<T>(url, options);
  }

  const headers: Record<string, string> = { ...extraHeaders };

  const authToken = resolveAuthToken(token, auth);
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
    // Token-authenticated request rejected: the stored token is invalid/stale,
    // so clear the session everywhere that listens for this event.
    if (response.status === 401 && authToken) {
      emitUnauthorized();
    }
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
