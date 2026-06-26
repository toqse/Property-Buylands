import type { BrowserCoordinates } from "@/lib/osmSearch";

export type GeolocationErrorCode = "unsupported" | "denied" | "timeout" | "unavailable";

export function geolocationErrorMessage(code: GeolocationErrorCode): string {
  switch (code) {
    case "unsupported":
      return "Geolocation is not supported by your browser.";
    case "denied":
      return "Location permission denied. Allow access in your browser settings.";
    case "timeout":
      return "Could not detect your location in time. Please try again.";
    case "unavailable":
      return "Could not detect your location. Turn on GPS/location on your device and try again.";
    default:
      return "Could not detect your location. Please try again.";
  }
}

function mapGeolocationError(err: GeolocationPositionError): GeolocationErrorCode {
  if (err.code === 1) return "denied";
  if (err.code === 3) return "timeout";
  return "unavailable";
}

type GeolocationOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
};

function readPosition(options: GeolocationOptions): Promise<BrowserCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(mapGeolocationError(err)));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0,
      },
    );
  });
}

/** GPS read for explicit "use my location" — uses the browser permission UI. */
export async function requestGeolocationForFilter(): Promise<BrowserCoordinates> {
  return readPosition({
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 600000,
  });
}

/** Faster read for the first-visit permission popup (may reuse a recent fix). */
export async function requestGeolocationForPrompt(): Promise<BrowserCoordinates> {
  return readPosition({
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 1800000,
  });
}
