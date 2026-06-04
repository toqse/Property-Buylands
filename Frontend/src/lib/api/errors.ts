export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Returns the first field key from a DRF-style validation error body, e.g.
 * `{ latitude: ["Ensure that there are no more than 6 decimal places."] }`
 * returns `"latitude"`. Generic keys that don't map to a form field
 * (`detail`, `non_field_errors`, `message`) are ignored.
 */
export function getApiErrorField(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (typeof error.body !== "object" || error.body === null) return null;
  const b = error.body as Record<string, unknown>;
  const ignored = new Set(["detail", "non_field_errors", "message"]);
  for (const key of Object.keys(b)) {
    if (ignored.has(key)) continue;
    const val = b[key];
    if (Array.isArray(val) || typeof val === "string") return key;
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (typeof error.body === "object" && error.body !== null) {
      const b = error.body as Record<string, unknown>;
      if (typeof b.detail === "string") return b.detail;
      if (Array.isArray(b.non_field_errors) && b.non_field_errors[0]) {
        return String(b.non_field_errors[0]);
      }
      if (typeof b.message === "string") return b.message;
      const firstKey = Object.keys(b)[0];
      if (firstKey) {
        const val = b[firstKey];
        if (Array.isArray(val) && val[0]) return `${firstKey}: ${val[0]}`;
        if (typeof val === "string") return `${firstKey}: ${val}`;
      }
    }
    return error.message || `Request failed (${error.status})`;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
