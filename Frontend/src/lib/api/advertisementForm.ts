import type { Advertisement } from "@/data/advertisements";

export function buildAdFormData(
  draft: Advertisement,
  files: { desktop?: File; mobile?: File; video?: File },
  options: { removeVideo?: boolean } = {},
): FormData {
  const fd = new FormData();
  fd.append("title", draft.title.trim());
  if (draft.subtitle) fd.append("subtitle", draft.subtitle);
  fd.append("ad_type", draft.adType);
  fd.append("media_type", draft.mediaType);
  fd.append("is_active", draft.active ? "true" : "false");
  fd.append(
    "redirect_type",
    draft.redirectType === "property" ? "property" : "external_url",
  );
  if (draft.redirectType === "property" && draft.linkedPropertyId) {
    fd.append("linked_property", draft.linkedPropertyId);
  }
  if (draft.redirectType === "external" && draft.externalUrl) {
    fd.append("external_url", draft.externalUrl);
  }
  if (draft.adType === "property") {
    if (draft.stateId) fd.append("state", draft.stateId);
    if (draft.districtId) fd.append("district", draft.districtId);
    if (draft.city.trim()) fd.append("city", draft.city.trim());
    if (draft.latitude.trim()) fd.append("latitude", draft.latitude.trim());
    if (draft.longitude.trim()) fd.append("longitude", draft.longitude.trim());
    fd.append("radius_km", draft.radiusKm.trim() || "25");
  }
  if (draft.priority) fd.append("priority", draft.priority);
  if (draft.startDate) fd.append("start_date", draft.startDate);
  if (draft.endDate) fd.append("end_date", draft.endDate);

  if (files.desktop) fd.append("desktop_image", files.desktop);
  if (files.mobile) fd.append("mobile_image", files.mobile);
  if (files.video) fd.append("video_file", files.video);
  if (options.removeVideo) fd.append("remove_video", "true");

  return fd;
}
