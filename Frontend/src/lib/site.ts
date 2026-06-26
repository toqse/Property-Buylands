export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.buylandsindia.com";

export const SITE_NAME = "Buy Lands India";

export const SITE_DESCRIPTION =
  "Buy Lands India — premium residential and commercial properties across the country. Browse verified homes, villas, apartments and land for sale or rent.";

/** Default image when a listing has no photo — must never use third-party branding. */
export const BRAND_LOGO_URL = "/brand/logo.png";
