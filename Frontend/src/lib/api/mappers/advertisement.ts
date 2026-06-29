import type { ApiAdvertisement } from "@/lib/api/types";
import type { Advertisement, AdRedirectType } from "@/data/advertisements";

function mapRedirectType(rt?: string): AdRedirectType {
  if (rt === "external_url") return "external";
  if (rt === "property") return "property";
  return "external";
}

export function mapApiAdToUi(ad: ApiAdvertisement): Advertisement {
  const placements = ad.placements ?? [];
  return {
    id: String(ad.id),
    title: ad.title,
    subtitle: ad.subtitle || "",
    adType: ad.ad_type || "generic",
    mediaType: ad.media_type,
    active: ad.is_active ?? true,
    desktopBanner: ad.desktop_image_url || ad.desktop_image || "",
    mobileBanner:
      ad.mobile_image_url ||
      ad.mobile_image ||
      ad.desktop_image_url ||
      ad.desktop_image ||
      "",
    videoUrl: ad.video_file_url || ad.video_file || "",
    videoThumbnail: ad.video_thumbnail_url || ad.video_thumbnail || "",
    videoProcessingStatus: ad.video_processing_status,
    redirectType: mapRedirectType(ad.redirect_type),
    linkedPropertyId: ad.linked_property != null ? String(ad.linked_property) : "",
    linkedPropertySlug: ad.linked_property_slug || "",
    externalUrl: ad.external_url || "",
    internalPage: "",
    country: "India",
    stateId: ad.state != null ? String(ad.state) : "",
    districtId: ad.district != null ? String(ad.district) : "",
    city: ad.city_name ?? "",
    latitude: ad.latitude != null ? String(ad.latitude) : "",
    longitude: ad.longitude != null ? String(ad.longitude) : "",
    radiusKm: ad.radius_km != null ? String(ad.radius_km) : "25",
    placement: {
      homepageFeed: placements.includes("homepage_feed"),
      propertyListingFeed: placements.includes("property_listing_feed"),
      searchResults: placements.includes("search_results"),
      propertyDetailsPage: placements.includes("property_details_page"),
      featuredSection: placements.includes("featured_section"),
    },
    startDate: ad.start_date || "",
    endDate: ad.end_date || "",
    priority: String(ad.priority ?? 1),
    createdAt: ad.created_at || "",
  };
}
