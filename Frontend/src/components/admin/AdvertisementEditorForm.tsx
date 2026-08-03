"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SubmitProgressButton } from "@/components/SubmitProgressButton";
import { PropertyUploadProgress } from "@/components/PropertyUploadProgress";
import { VideoProcessingStatusBadge } from "@/components/VideoProcessingStatusBadge";
import { OsmPlaceSearch } from "@/components/ui/osm-place-search";
import { AdImageUploader } from "@/components/admin/AdImageUploader";
import {
  emptyAd,
  type Advertisement,
  type AdMediaType,
  type AdRedirectType,
  type AdType,
} from "@/data/advertisements";
import type { Property } from "@/data/mockData";
import { buildAdFormData } from "@/lib/api/advertisementForm";
import { getErrorMessage } from "@/lib/api/errors";
import {
  useCatalogMutations,
  useDistricts,
  useStates,
} from "@/hooks/api/useCatalog";
import { useMyProperties, usePropertyList, type ListingFeedItem } from "@/hooks/api/useProperties";
import { usePropertyUploadProgress } from "@/hooks/usePropertyUploadProgress";
import { ChevronDown, Search, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AD_SUBMIT_MESSAGES = [
  "Saving advertisement…",
  "Uploading video…",
  "Almost there…",
  "Final moment…",
];

type AdImageKey = "desktopBanner" | "mobileBanner" | "videoThumbnail";

export type AdvertisementEditorMode = "admin" | "staff";

type AdvertisementEditorFormProps = {
  mode: AdvertisementEditorMode;
  editingId: string | null;
  initialAd?: Advertisement;
  onCancel: () => void;
  onSaved: () => void;
};

export function AdvertisementEditorForm({
  mode,
  editingId,
  initialAd,
  onCancel,
  onSaved,
}: AdvertisementEditorFormProps) {
  const catalogMutations = useCatalogMutations();
  const adUploadProgress = usePropertyUploadProgress();

  const [draft, setDraft] = useState<Advertisement>(emptyAd());
  const [adFiles, setAdFiles] = useState<{
    desktop?: File;
    mobile?: File;
    video?: File;
  }>({});
  const [linkedPropertySearch, setLinkedPropertySearch] = useState("");
  const [linkedPropertyPage, setLinkedPropertyPage] = useState(1);
  const [linkedPropertyPickerOpen, setLinkedPropertyPickerOpen] = useState(false);

  const { data: adStatesData } = useStates();
  const adStateNum = draft.stateId ? Number(draft.stateId) : undefined;
  const { data: adDistrictsData } = useDistricts(adStateNum);

  const staffPropsQuery = useMyProperties(
    {
      page_size: 20,
      page: linkedPropertyPage,
      moderationStatus: "approved",
      search: linkedPropertySearch.trim() || undefined,
    },
    { enabled: mode === "staff" },
  );

  const adminPropsQuery = usePropertyList(
    {
      moderationStatus: "approved",
      includeAds: false,
      page: linkedPropertyPage,
      pageSize: 20,
      search: linkedPropertySearch.trim() || undefined,
    },
    { auth: true, enabled: mode === "admin" },
  );

  const propsPage =
    mode === "staff" ? staffPropsQuery.data : adminPropsQuery.data;

  const linkableProperties = useMemo((): Property[] => {
    if (mode === "staff") {
      return (propsPage?.items ?? []) as Property[];
    }
    const items = (propsPage?.items ?? []) as ListingFeedItem[];
    return items
      .filter((x) => x.kind === "property")
      .map((x) => x.property);
  }, [mode, propsPage?.items]);

  const linkedPropertyTotalPages = Math.max(
    1,
    Math.ceil((propsPage?.count ?? 0) / 20),
  );

  const selectedLinkedProperty = linkableProperties.find(
    (p) => p.id === draft.linkedPropertyId,
  );

  useEffect(() => {
    setDraft(initialAd ? { ...initialAd } : emptyAd());
    setAdFiles({});
    setLinkedPropertySearch("");
    setLinkedPropertyPage(1);
    setLinkedPropertyPickerOpen(false);
  }, [initialAd, editingId]);

  useEffect(() => {
    setLinkedPropertyPage(1);
  }, [linkedPropertySearch]);

  const isPropertyAd = draft.adType === "property";
  const isImageAd = draft.mediaType === "image";
  const isVideoAd = draft.mediaType === "video";

  const adStates = useMemo(
    () => adStatesData?.results ?? [],
    [adStatesData?.results],
  );
  const districtsForState = useMemo(
    () => adDistrictsData?.results ?? [],
    [adDistrictsData?.results],
  );
  const selectedAdStateName = useMemo(
    () => adStates.find((s) => String(s.id) === draft.stateId)?.name ?? "",
    [adStates, draft.stateId],
  );
  const selectedAdDistrictName = useMemo(
    () =>
      districtsForState.find((d) => String(d.id) === draft.districtId)?.name ??
      "",
    [districtsForState, draft.districtId],
  );

  const setField = <K extends keyof Advertisement>(
    key: K,
    value: Advertisement[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleImageFile = (key: AdImageKey, file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    if (key === "desktopBanner") setAdFiles((f) => ({ ...f, desktop: file }));
    if (key === "mobileBanner") setAdFiles((f) => ({ ...f, mobile: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({
        ...d,
        [key]: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearAdImage = (key: AdImageKey) => {
    setField(key, "");
    if (key === "desktopBanner") {
      setAdFiles((f) => ({ ...f, desktop: undefined }));
    }
    if (key === "mobileBanner") {
      setAdFiles((f) => ({ ...f, mobile: undefined }));
    }
  };

  const handleVideoFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (file.size > 80 * 1024 * 1024) {
      toast.error("Video must be under 80 MB");
      return;
    }
    setAdFiles((f) => ({ ...f, video: file }));
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({
        ...d,
        videoUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearAdVideo = async () => {
    setField("videoUrl", "");
    setAdFiles((f) => ({ ...f, video: undefined }));
    if (!editingId) return;
    try {
      const fd = new FormData();
      fd.append("remove_video", "true");
      await catalogMutations.updateAd.mutateAsync({
        id: Number(editingId),
        form: fd,
      });
      toast.success("Video removed");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      toast.error("Ad title is required");
      return;
    }
    if (isImageAd && !draft.desktopBanner) {
      toast.error("Desktop banner image is required for image ads");
      return;
    }
    if (isVideoAd && !draft.videoUrl) {
      toast.error("Video file is required for video ads");
      return;
    }
    if (draft.redirectType === "property" && !draft.linkedPropertyId) {
      toast.error("Please select a linked property");
      return;
    }
    if (draft.redirectType === "external" && !draft.externalUrl.trim()) {
      toast.error("External URL is required");
      return;
    }
    if (
      isPropertyAd &&
      (!draft.stateId || !draft.districtId || !draft.city.trim())
    ) {
      toast.error(
        "Location targeting (state, district, city) is required for property ads",
      );
      return;
    }

    try {
      const fd = buildAdFormData(draft, adFiles);
      const hasNewVideo = isVideoAd && !!adFiles.video;
      const onUploadProgress =
        adUploadProgress.makeUploadProgressHandler(hasNewVideo);
      try {
        if (editingId) {
          await catalogMutations.updateAd.mutateAsync({
            id: Number(editingId),
            form: fd,
            onUploadProgress,
          });
          toast.success("Advertisement updated");
        } else {
          await catalogMutations.createAd.mutateAsync({
            form: fd,
            onUploadProgress,
          });
          toast.success("Advertisement created");
        }
        onSaved();
      } finally {
        adUploadProgress.clearUploadProgress();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filterSelectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  const isSaving =
    catalogMutations.createAd.isPending || catalogMutations.updateAd.isPending;

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-serif text-base text-primary">1. Basic information</h3>
        <div className="space-y-2">
          <Label className="text-xs">
            Ad title <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={draft.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Internal advertisement title"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Ad subtitle</Label>
          <Textarea
            value={draft.subtitle}
            onChange={(e) => setField("subtitle", e.target.value)}
            placeholder="Small supporting description"
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">
              Ad type <span className="text-rose-500">*</span>
            </Label>
            <select
              value={draft.adType}
              onChange={(e) => setField("adType", e.target.value as AdType)}
              className={filterSelectClass}
            >
              <option value="property">Property ad</option>
              <option value="generic">Generic ad</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">
              Media type <span className="text-rose-500">*</span>
            </Label>
            <select
              value={draft.mediaType}
              onChange={(e) =>
                setField("mediaType", e.target.value as AdMediaType)
              }
              className={filterSelectClass}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
          <div>
            <div className="text-sm font-medium">Ad status</div>
            <div className="text-xs text-muted-foreground">
              Toggle to enable or pause this ad.
            </div>
          </div>
          <Switch
            checked={draft.active}
            onCheckedChange={(v) => setField("active", v)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-base text-primary">2. Media upload</h3>
        {isImageAd && (
          <div className="grid gap-3 sm:grid-cols-2">
            <AdImageUploader
              id="ad-desktop-banner"
              label="Desktop banner *"
              preview={draft.desktopBanner}
              onFile={(f) => handleImageFile("desktopBanner", f)}
              onClear={() => clearAdImage("desktopBanner")}
            />
            <AdImageUploader
              id="ad-mobile-banner"
              label="Mobile banner"
              preview={draft.mobileBanner}
              onFile={(f) => handleImageFile("mobileBanner", f)}
              onClear={() => clearAdImage("mobileBanner")}
            />
          </div>
        )}
        {isVideoAd && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">
                Video file <span className="text-rose-500">*</span>
              </Label>
              <label
                htmlFor="ad-video-upload"
                className="relative block h-32 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary hover:bg-primary/5"
              >
                {draft.videoUrl ? (
                  <>
                    <video
                      src={draft.videoUrl}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void clearAdVideo();
                      }}
                      className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label="Remove video"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      MP4, MOV, WebM up to 80MB
                    </span>
                  </div>
                )}
                <input
                  id="ad-video-upload"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,video/x-m4v,video/3gpp"
                  className="sr-only"
                  onChange={(e) => handleVideoFile(e.target.files?.[0])}
                />
              </label>
              {draft.videoProcessingStatus &&
              draft.mediaType === "video" &&
              Boolean(draft.videoUrl) ? (
                <VideoProcessingStatusBadge
                  variant="card"
                  status={draft.videoProcessingStatus}
                  hasUploadedVideo={Boolean(draft.videoUrl)}
                />
              ) : null}
            </div>
            <AdImageUploader
              id="ad-video-thumb"
              label="Video thumbnail"
              preview={draft.videoThumbnail}
              onFile={(f) => handleImageFile("videoThumbnail", f)}
              onClear={() => clearAdImage("videoThumbnail")}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-base text-primary">3. Redirect configuration</h3>
        <div className="space-y-2">
          <Label className="text-xs">
            Redirect type <span className="text-rose-500">*</span>
          </Label>
          <select
            value={draft.redirectType}
            onChange={(e) =>
              setField("redirectType", e.target.value as AdRedirectType)
            }
            className={filterSelectClass}
          >
            <option value="property">Property</option>
            <option value="external">External URL</option>
            <option value="internal">Internal page</option>
          </select>
        </div>
        {draft.redirectType === "property" && (
          <div className="space-y-2">
            <Label className="text-xs">
              Linked property <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => setLinkedPropertyPickerOpen((v) => !v)}
              >
                <span
                  className={cn(
                    "truncate",
                    !draft.linkedPropertyId && "text-muted-foreground",
                  )}
                >
                  {selectedLinkedProperty?.title ??
                    (draft.linkedPropertyId
                      ? `Selected property #${draft.linkedPropertyId}`
                      : "Select property…")}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              {linkedPropertyPickerOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-border bg-background p-2 shadow-lg">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={linkedPropertySearch}
                      onChange={(e) => setLinkedPropertySearch(e.target.value)}
                      placeholder="Search property name…"
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded border border-border/70">
                    {linkableProperties.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                        {mode === "staff"
                          ? "No approved properties found. Create a property first."
                          : "No approved properties found"}
                      </div>
                    ) : (
                      linkableProperties.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={cn(
                            "block w-full px-3 py-2 text-left text-sm transition hover:bg-muted",
                            draft.linkedPropertyId === p.id &&
                              "bg-muted font-semibold",
                          )}
                          onClick={() => {
                            setField("linkedPropertyId", p.id);
                            setLinkedPropertyPickerOpen(false);
                          }}
                        >
                          <span className="block truncate">{p.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {p.location}, {p.city}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Page {linkedPropertyPage} of {linkedPropertyTotalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={linkedPropertyPage <= 1}
                        onClick={() =>
                          setLinkedPropertyPage((p) => Math.max(1, p - 1))
                        }
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={
                          linkedPropertyPage >= linkedPropertyTotalPages
                        }
                        onClick={() =>
                          setLinkedPropertyPage((p) =>
                            Math.min(linkedPropertyTotalPages, p + 1),
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mode === "staff"
                ? "Link one of your approved properties."
                : "Showing approved properties. Use search to filter."}
            </p>
          </div>
        )}
        {draft.redirectType === "external" && (
          <div className="space-y-2">
            <Label className="text-xs">
              External URL <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="url"
              value={draft.externalUrl}
              onChange={(e) => setField("externalUrl", e.target.value)}
              placeholder="https://example.com/landing-page"
            />
          </div>
        )}
        {draft.redirectType === "internal" && (
          <div className="space-y-2">
            <Label className="text-xs">Internal page path</Label>
            <Input
              value={draft.internalPage}
              onChange={(e) => setField("internalPage", e.target.value)}
              placeholder="/buy or /contact"
            />
          </div>
        )}
      </section>

      {isPropertyAd && (
        <section className="space-y-3">
          <h3 className="font-serif text-base text-primary">4. Location targeting</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">
                State <span className="text-rose-500">*</span>
              </Label>
              <select
                value={draft.stateId}
                onChange={(e) => {
                  setDraft((d) => ({
                    ...d,
                    stateId: e.target.value,
                    districtId: "",
                    city: "",
                    latitude: "",
                    longitude: "",
                  }));
                }}
                className={filterSelectClass}
              >
                <option value="">Select state…</option>
                {adStates.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                District <span className="text-rose-500">*</span>
              </Label>
              <select
                value={draft.districtId}
                onChange={(e) => {
                  setDraft((d) => ({
                    ...d,
                    districtId: e.target.value,
                    city: "",
                    latitude: "",
                    longitude: "",
                  }));
                }}
                disabled={!draft.stateId}
                className={cn(
                  filterSelectClass,
                  !draft.stateId && "opacity-50",
                )}
              >
                <option value="">
                  {draft.stateId ? "Select district…" : "Select a state first"}
                </option>
                {districtsForState.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">
                Place / city <span className="text-rose-500">*</span>
              </Label>
              <OsmPlaceSearch
                value={draft.city}
                displayLabel={draft.city}
                stateName={selectedAdStateName}
                districtName={selectedAdDistrictName}
                disabled={!draft.districtId}
                placeholder={
                  draft.districtId ? "Search place…" : "Select district first"
                }
                searchPlaceholder="Type city, town, or locality…"
                className={cn(!draft.districtId && "opacity-60")}
                onSelect={(place) =>
                  setDraft((d) => ({
                    ...d,
                    city: place.city,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    radiusKm: d.radiusKm || "25",
                  }))
                }
              />
            </div>
          </div>
        </section>
      )}

      {isPropertyAd && (
        <section className="space-y-3">
          <h3 className="font-serif text-base text-primary">5. Geo targeting (radius)</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={draft.latitude}
                onChange={(e) => setField("latitude", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={draft.longitude}
                onChange={(e) => setField("longitude", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Radius (KM)</Label>
              <Input
                type="number"
                min={0}
                value={draft.radiusKm}
                onChange={(e) => setField("radiusKm", e.target.value)}
                placeholder="25"
              />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-serif text-base text-primary">6. Schedule &amp; priority</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Start date</Label>
            <Input
              type="date"
              value={draft.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End date</Label>
            <Input
              type="date"
              value={draft.endDate}
              onChange={(e) => setField("endDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Priority</Label>
            <Input
              type="number"
              min={1}
              value={draft.priority}
              onChange={(e) => setField("priority", e.target.value)}
              placeholder="1 (highest)"
            />
          </div>
        </div>
      </section>

      <PropertyUploadProgress
        active={isSaving && adUploadProgress.trackingVideo}
        progress={adUploadProgress.progress}
      />
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
        <SubmitProgressButton
          type="submit"
          submitting={isSaving}
          idleLabel={editingId ? "Save changes" : "Create advertisement"}
          messages={
            adUploadProgress.trackingVideo
              ? ["Uploading video…"]
              : AD_SUBMIT_MESSAGES
          }
        />
      </div>
    </form>
  );
}
