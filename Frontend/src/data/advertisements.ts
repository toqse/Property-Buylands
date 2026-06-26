import { PROPERTIES } from "./mockData";

export type AdType = "property" | "generic";
export type AdMediaType = "image" | "video";
export type AdRedirectType = "property" | "external" | "internal";

export type AdPlacementFlags = {
  homepageFeed: boolean;
  propertyListingFeed: boolean;
  searchResults: boolean;
  propertyDetailsPage: boolean;
  featuredSection: boolean;
};

export type Advertisement = {
  id: string;
  title: string;
  subtitle: string;
  adType: AdType;
  mediaType: AdMediaType;
  active: boolean;
  desktopBanner: string;
  mobileBanner: string;
  videoUrl: string;
  videoThumbnail: string;
  redirectType: AdRedirectType;
  linkedPropertyId: string;
  linkedPropertySlug?: string;
  externalUrl: string;
  internalPage: string;
  country: string;
  stateId: string;
  districtId: string;
  city: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
  placement: AdPlacementFlags;
  startDate: string;
  endDate: string;
  priority: string;
  createdAt: string;
};

export const emptyAd = (): Advertisement => ({
  id: "",
  title: "",
  subtitle: "",
  adType: "property",
  mediaType: "image",
  active: true,
  desktopBanner: "",
  mobileBanner: "",
  videoUrl: "",
  videoThumbnail: "",
  redirectType: "property",
  linkedPropertyId: "",
  externalUrl: "",
  internalPage: "",
  country: "India",
  stateId: "",
  districtId: "",
  city: "",
  latitude: "",
  longitude: "",
  radiusKm: "25",
  placement: {
    homepageFeed: false,
    propertyListingFeed: true,
    searchResults: false,
    propertyDetailsPage: false,
    featuredSection: false,
  },
  startDate: "",
  endDate: "",
  priority: "1",
  createdAt: "",
});

export const ADVERTISEMENTS: Advertisement[] = [
  {
    ...emptyAd(),
    id: "ad1",
    title: "Premium Sea-View Villas",
    subtitle: "Exclusive launch in Calicut — book a private tour today.",
    adType: "property",
    mediaType: "image",
    active: true,
    desktopBanner: "/new banner.png",
    mobileBanner: "/new banner.png",
    redirectType: "property",
    linkedPropertyId: PROPERTIES[0]?.id ?? "",
    stateId: "s1",
    districtId: "d7",
    city: "Kozhikode",
    latitude: "11.2588",
    longitude: "75.7804",
    radiusKm: "25",
    placement: {
      homepageFeed: true,
      propertyListingFeed: true,
      searchResults: false,
      propertyDetailsPage: false,
      featuredSection: true,
    },
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    priority: "1",
    createdAt: new Date().toISOString().slice(0, 10),
  },
  {
    ...emptyAd(),
    id: "ad2",
    title: "Kalyan Jewellers",
    subtitle: "The new wedding collection is here — handcrafted gold & diamonds.",
    adType: "generic",
    mediaType: "video",
    active: true,
    desktopBanner: "",
    mobileBanner: "",
    // Small (~1MB) public sample so the inline video autoplays immediately.
    // Swap this with `/kalyan-collection.mp4` once you place the real
    // Kalyan Jewellers video in the `public/` folder.
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoThumbnail: "",
    redirectType: "external",
    linkedPropertyId: "",
    externalUrl: "https://www.kalyanjewellers.net/",
    placement: {
      homepageFeed: true,
      propertyListingFeed: true,
      searchResults: false,
      propertyDetailsPage: false,
      featuredSection: false,
    },
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    priority: "2",
    createdAt: new Date().toISOString().slice(0, 10),
  },
  {
    ...emptyAd(),
    id: "ad3",
    title: "Asian Paints",
    subtitle: "Refresh your new home — premium interior shades, free site visit.",
    adType: "generic",
    mediaType: "video",
    active: true,
    desktopBanner: "",
    mobileBanner: "",
    // Public sample (~1MB, bright opening frames so playback is clearly visible).
    // Swap with `/asian-paints.mp4` (or your hosted asset) when the real
    // creative is available — the previous Google sample opened on a dark
    // scene and made the card look black for the first few seconds.
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    videoThumbnail: "",
    redirectType: "external",
    linkedPropertyId: "",
    externalUrl: "https://www.asianpaints.com/",
    placement: {
      homepageFeed: true,
      propertyListingFeed: true,
      searchResults: false,
      propertyDetailsPage: false,
      featuredSection: false,
    },
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    priority: "3",
    createdAt: new Date().toISOString().slice(0, 10),
  },
];

/**
 * Interleave a list of items with advertisements at a fixed cadence.
 *
 * `everyN` is interpreted as: insert an ad after every `everyN` items.
 * If multiple ads are provided, they cycle in order. If no ads are active,
 * the items list is returned unchanged.
 */
export type FeedSlot<T> =
  | { kind: "item"; value: T }
  | { kind: "ad"; value: Advertisement };

export function injectAds<T>(
  items: T[],
  ads: Advertisement[],
  everyN: number,
  startAdIndex = 0,
): FeedSlot<T>[] {
  if (ads.length === 0 || everyN <= 0) {
    return items.map((value) => ({ kind: "item" as const, value }));
  }
  const out: FeedSlot<T>[] = [];
  let adIdx = startAdIndex;
  items.forEach((value, i) => {
    out.push({ kind: "item", value });
    if ((i + 1) % everyN === 0) {
      out.push({ kind: "ad", value: ads[adIdx % ads.length] });
      adIdx += 1;
    }
  });
  return out;
}
