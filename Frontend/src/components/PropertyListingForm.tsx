"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type LegacyRef,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Property, PropertyStatus } from "@/data/mockData";
import {
  videoProcessingStatusLabel,
  videoProcessingStatusTone,
  type VideoProcessingStatus,
} from "@/lib/videoProcessingStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { OsmPlaceSearch } from "@/components/ui/osm-place-search";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useStates,
  useDistricts,
  usePropertyTypes,
  useFeatures,
} from "@/hooks/api/useCatalog";
import {
  MAX_PROPERTY_IMAGES,
  flagsFromPropertyType,
  type PropertyTypeFeatureFlags,
} from "@/lib/api/propertyForm";

export const OWNERSHIP_OPTIONS = ["Direct Owner", "Dealer", "Builder"] as const;

export const SIGHTING_DIRECTION_OPTIONS = [
  "North",
  "South",
  "East",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
] as const;

export const PROJECT_STATUS_OPTIONS = [
  "Ready to move",
  "Under construction",
  "New launch",
  "Pre-launch",
] as const;

/**
 * Scroll the listing form to the field that produced an error and focus it.
 * Fields are tagged with a `data-field` attribute matching the backend field
 * name (snake_case), so both client-side and API validation errors resolve to
 * the same target. The lookup is scoped to the topmost open dialog when present
 * so it works inside the admin add/edit modals.
 */
export function scrollToListingField(field?: string | null) {
  if (!field || typeof document === "undefined") return;
  const scopes = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"]'),
  );
  const scope = scopes.length ? scopes[scopes.length - 1] : document.body;
  const target =
    scope.querySelector<HTMLElement>(`[data-field="${field}"]`) ??
    document.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = target.querySelector<HTMLElement>(
    "input, textarea, select, button, [tabindex]",
  );
  window.setTimeout(() => focusable?.focus({ preventScroll: true }), 350);
}

export type NearbyPlaceRow = { name: string; distanceKm: string };

export type AddPropertyDraft = {
  propertyFor: Property["type"];
  ownership: string;
  contactName: string;
  contactEmail: string;
  whatsapp: string;
  phone: string;
  stateId: string;
  state: string;
  districtId: string;
  district: string;
  city: string;
  latitude: string;
  longitude: string;
  title: string;
  price: string;
  propertyCategory: Property["category"];
  area: string;
  areaUnit: NonNullable<Property["areaUnit"]>;
  bedrooms: string;
  bathrooms: string;
  description: string;
  youtubeLink: string;
  builtYear: string;
  furnishing: string;
  projectStatus: string;
  floors: string;
  sighting: string;
  areaCent: string;
  parkingSpaces: string;
  googleMapUrl: string;
  googleEmbedHtml: string;
  /** Selected feature PKs from the features catalog API. */
  featureIds: number[];
  nearbyPlaces: NearbyPlaceRow[];
};

export function defaultMapEmbedIframe(lat: number, lng: number): string {
  return `<iframe src="https://maps.google.com/maps?q=${lat}%2C${lng}&z=14&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Location map"></iframe>`;
}

const AREA_UNIT_OPTIONS: {
  value: NonNullable<Property["areaUnit"]>;
  label: string;
  placeholder: string;
  inputLabel: string;
}[] = [
  {
    value: "sqft",
    label: "Square feet",
    placeholder: "e.g. 3200.50",
    inputLabel: "Area (sq.ft)",
  },
  {
    value: "cents",
    label: "Cent",
    placeholder: "e.g. 5.75",
    inputLabel: "Area (Cents)",
  },
];

export const emptyDraft: AddPropertyDraft = {
  propertyFor: "For Sale",
  ownership: "",
  contactName: "",
  contactEmail: "",
  whatsapp: "",
  phone: "",
  stateId: "",
  state: "",
  districtId: "",
  district: "",
  city: "",
  latitude: "",
  longitude: "",
  title: "",
  price: "",
  propertyCategory: "Villa",
  area: "",
  areaUnit: "sqft",
  bedrooms: "",
  bathrooms: "",
  description: "",
  youtubeLink: "",
  builtYear: "",
  furnishing: "Unfurnished",
  projectStatus: "",
  floors: "",
  sighting: "",
  areaCent: "",
  parkingSpaces: "",
  googleMapUrl: "",
  googleEmbedHtml: "",
  featureIds: [],
  nearbyPlaces: [],
};

const formCardClass =
  "rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4";

const MAX_EMAIL_LEN = 254;
const MAX_CONTACT_NAME_LEN = 120;
/** Counted digit length (ignores +, spaces, punctuation). */
const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 18;
const MAX_PHONE_FIELD_LEN = 28;

function countPhoneDigits(s: string): number {
  return s.replace(/\D/g, "").length;
}

/** WhatsApp local part: digits only (country code +91 is shown as a fixed prefix). */
const WHATSAPP_LOCAL_MAX = 15;
function localWhatsappDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, WHATSAPP_LOCAL_MAX);
}
/** Strip an existing +91 / 91 country code from a stored number to get the local digits. */
function stripIndiaCountryCode(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  return digits.slice(0, WHATSAPP_LOCAL_MAX);
}
/** Prepend the +91 country code for the local WhatsApp digits (empty stays empty). */
function withIndiaCountryCode(digits: string): string {
  return digits ? `+91${digits}` : "";
}

/** Phone / WhatsApp: digits 10–18; allows + at start and spaces / () / -; blocks extra digits beyond 18. */
function sanitizePhoneLike(raw: string, maxLen = MAX_PHONE_FIELD_LEN): string {
  let out = "";
  for (let i = 0; i < raw.length && out.length < maxLen; i++) {
    const ch = raw[i];
    if (/\d/.test(ch)) {
      if (countPhoneDigits(out) >= PHONE_DIGITS_MAX) continue;
      out += ch;
    } else if (" ()-".includes(ch)) {
      out += ch;
    } else if (ch === "+" && out.length === 0) {
      out += ch;
    }
  }
  return out;
}

/** Email: strip characters that are never valid in an address; cap length so the field cannot grow unbounded. */
function sanitizeEmailInput(raw: string): string {
  return raw
    .replace(/\s/g, "")
    .replace(/[^a-zA-Z0-9@._+\-]/g, "")
    .slice(0, MAX_EMAIL_LEN);
}

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(t);
}

/** Price / area: digits and thousands separators only (no letters). */
function sanitizeMoneyOrArea(raw: string, maxLen = 14): string {
  const only = raw.replace(/[^\d,]/g, "");
  return only.slice(0, maxLen);
}

/** Area value sanitizer. Allows one decimal point (for acres/cents) plus digits and commas. */
function sanitizeAreaValue(raw: string, maxLen = 20): string {
  let s = raw.replace(/[^\d.,]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s.slice(0, maxLen);
}

function parseMoneyValue(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function sanitizeContactName(raw: string): string {
  return raw.replace(/[^\p{L}\s'.\d-]/gu, "").slice(0, MAX_CONTACT_NAME_LEN);
}

/** Map backend ownership values to the form's Select option values. */
function normalizeOwnership(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase().replace(/_/g, " ");
  if (lower === "direct owner" || lower === "owner") return "Direct Owner";
  if (lower === "builder") return "Builder";
  if (lower === "dealer") return "Dealer";
  if (lower === "management") return "Management";
  if ([...OWNERSHIP_OPTIONS, "Management"].includes(v as (typeof OWNERSHIP_OPTIONS)[number] | "Management"))
    return v;
  return v;
}

function ownershipSelectOptions(current: string): string[] {
  const normalized = normalizeOwnership(current);
  if (
    normalized &&
    !OWNERSHIP_OPTIONS.includes(normalized as (typeof OWNERSHIP_OPTIONS)[number])
  ) {
    return [normalized, ...OWNERSHIP_OPTIONS];
  }
  return [...OWNERSHIP_OPTIONS];
}

/** Map stored sighting text to one of the eight compass directions when possible. */
function normalizeSighting(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const compact = v.toLowerCase().replace(/\s+/g, " ").replace(/\s*facing\s*$/i, "").trim();
  for (const dir of SIGHTING_DIRECTION_OPTIONS) {
    if (compact === dir.toLowerCase()) return dir;
  }
  const aliases: Record<string, (typeof SIGHTING_DIRECTION_OPTIONS)[number]> = {
    "north east": "North-East",
    "north west": "North-West",
    "south east": "South-East",
    "south west": "South-West",
  };
  if (aliases[compact]) return aliases[compact];
  if (SIGHTING_DIRECTION_OPTIONS.includes(v as (typeof SIGHTING_DIRECTION_OPTIONS)[number]))
    return v;
  return v;
}

function sightingSelectOptions(current: string): string[] {
  const normalized = normalizeSighting(current);
  if (
    normalized &&
    !SIGHTING_DIRECTION_OPTIONS.includes(
      normalized as (typeof SIGHTING_DIRECTION_OPTIONS)[number],
    )
  ) {
    return [normalized, ...SIGHTING_DIRECTION_OPTIONS];
  }
  return [...SIGHTING_DIRECTION_OPTIONS];
}

/** Map stored project status to a known dropdown option when possible. */
function normalizeProjectStatus(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  for (const opt of PROJECT_STATUS_OPTIONS) {
    if (lower === opt.toLowerCase()) return opt;
  }
  const aliases: Record<string, (typeof PROJECT_STATUS_OPTIONS)[number]> = {
    ready: "Ready to move",
    "ready to move in": "Ready to move",
    "under-construction": "Under construction",
    "new launch": "New launch",
    "pre launch": "Pre-launch",
    prelaunch: "Pre-launch",
  };
  if (aliases[lower]) return aliases[lower];
  if (PROJECT_STATUS_OPTIONS.includes(v as (typeof PROJECT_STATUS_OPTIONS)[number]))
    return v;
  return v;
}

function projectStatusSelectOptions(current: string): string[] {
  const normalized = normalizeProjectStatus(current);
  if (
    normalized &&
    !PROJECT_STATUS_OPTIONS.includes(
      normalized as (typeof PROJECT_STATUS_OPTIONS)[number],
    )
  ) {
    return [normalized, ...PROJECT_STATUS_OPTIONS];
  }
  return [...PROJECT_STATUS_OPTIONS];
}

function clearFieldsForFlags(
  flags: PropertyTypeFeatureFlags,
): Partial<AddPropertyDraft> {
  return {
    ...(flags.has_bedrooms ? {} : { bedrooms: "" }),
    ...(flags.has_bathrooms ? {} : { bathrooms: "" }),
    ...(flags.has_built_year ? {} : { builtYear: "" }),
    ...(flags.has_parking_spaces ? {} : { parkingSpaces: "" }),
    ...(flags.has_project_status ? {} : { projectStatus: "" }),
    ...(flags.has_floors ? {} : { floors: "" }),
    ...(flags.has_sighting ? {} : { sighting: "" }),
    ...(flags.has_furnishing ? {} : { furnishing: "Unfurnished" }),
    ...(flags.has_area_both ? { areaUnit: "sqft" as const } : { areaCent: "" }),
  };
}

/** Map stored furnishing values back to the form's Select option casing. */
function normalizeFurnishing(raw: string | undefined): string {
  const v = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  if (!v) return "Unfurnished";
  if (v.startsWith("semi")) return "Semi-furnished";
  if (v.startsWith("fully")) return "Fully furnished";
  if (v.startsWith("un")) return "Unfurnished";
  return raw ?? "Unfurnished";
}

function parkingSpacesFromFeatures(
  features: string[] | undefined,
  stored: string | undefined,
): string {
  if (stored?.trim()) return stored.trim();
  for (const f of features ?? []) {
    const m = /^(\d+)\s+parking space\(s\)$/i.exec(f);
    if (m) return m[1];
  }
  return "";
}

export function propertyToDraft(p: Property): AddPropertyDraft {
  const state = p.state ?? "";
  const district = p.district ?? "";
  const city = p.city ?? "";
  const parkingFromFeat = parkingSpacesFromFeatures(
    p.features,
    p.parkingSpaces,
  );

  return {
    propertyFor: p.type,
    ownership: normalizeOwnership(p.ownership),
    contactName: p.ownerName,
    contactEmail: p.ownerEmail,
    whatsapp: stripIndiaCountryCode(p.contactWhatsApp ?? ""),
    phone: p.ownerPhone,
    stateId: p.stateId != null ? String(p.stateId) : "",
    state,
    districtId: p.districtId != null ? String(p.districtId) : "",
    district,
    city,
    latitude: String(p.lat ?? ""),
    longitude: String(p.lng ?? ""),
    title: p.title,
    price: p.price ? String(p.price) : "",
    propertyCategory: p.category,
    area: p.area ? String(p.area) : "",
    areaUnit: p.areaUnit ?? "sqft",
    bedrooms: p.bedrooms ? String(p.bedrooms) : "",
    bathrooms: p.bathrooms ? String(p.bathrooms) : "",
    description: p.description ?? "",
    youtubeLink: p.youtubeUrl ?? "",
    builtYear: p.builtYear ?? "",
    furnishing: normalizeFurnishing(p.furnishing),
    projectStatus: normalizeProjectStatus(p.projectStatus),
    floors: p.floors ?? "",
    sighting: normalizeSighting(p.sighting),
    areaCent: p.areaCent ?? "",
    parkingSpaces: parkingFromFeat,
    googleMapUrl: p.googleMapUrl ?? "",
    googleEmbedHtml:
      (p.googleEmbedHtml && p.googleEmbedHtml.trim()) ||
      defaultMapEmbedIframe(p.lat ?? 0, p.lng ?? 0),
    featureIds: [...(p.featureIds ?? [])],
    nearbyPlaces: [...(p.nearbyPlaces ?? [])],
  };
}

export type DraftParseOk = {
  priceNum: number;
  areaSq: number;
  latNum: number;
  lngNum: number;
  feats: string[];
  locationLine: string;
  nearbyFiltered: NearbyPlaceRow[];
  youtubeTrim: string;
};

export function validateAndParseDraft(
  draft: AddPropertyDraft,
):
  | { ok: false; message: string; field?: string }
  | { ok: true; data: DraftParseOk } {
  if (!draft.title.trim())
    return {
      ok: false,
      message: "Please add a title for your property",
      field: "title",
    };
  if (!draft.stateId)
    return { ok: false, message: "Please select a state", field: "state" };
  if (!draft.districtId)
    return {
      ok: false,
      message: "Please select a district",
      field: "district",
    };
  if (!draft.city.trim())
    return { ok: false, message: "Please select a place", field: "city" };
  if (!draft.ownership.trim())
    return {
      ok: false,
      message: "Please select property ownership",
      field: "ownership",
    };
  const latNum = Number.parseFloat(draft.latitude);
  const lngNum = Number.parseFloat(draft.longitude);
  if (!isValidEmail(draft.contactEmail)) {
    return {
      ok: false,
      message: "Enter a valid email address (no spaces or stray symbols)",
      field: "email",
    };
  }
  const phoneDigits = draft.phone.replace(/\D/g, "");
  const whatsDigits = draft.whatsapp.replace(/\D/g, "");
  if (draft.phone.trim()) {
    if (
      phoneDigits.length < PHONE_DIGITS_MIN ||
      phoneDigits.length > PHONE_DIGITS_MAX
    ) {
      return {
        ok: false,
        message: `Phone number must be ${PHONE_DIGITS_MIN}–${PHONE_DIGITS_MAX} digits`,
        field: "phone_number",
      };
    }
  }
  if (draft.whatsapp.trim()) {
    if (
      whatsDigits.length < PHONE_DIGITS_MIN ||
      whatsDigits.length > PHONE_DIGITS_MAX
    ) {
      return {
        ok: false,
        message: `WhatsApp number must be ${PHONE_DIGITS_MIN}–${PHONE_DIGITS_MAX} digits`,
        field: "whatsapp_number",
      };
    }
  }
  const priceNum = parseMoneyValue(draft.price);
  if (priceNum === null || priceNum <= 0)
    return {
      ok: false,
      message: "Price must be a positive number (digits only)",
      field: "price",
    };
  let areaSq = 0;
  if (!draft.area.trim()) {
    return {
      ok: false,
      message: "Area is required",
      field: "area",
    };
  }
  const parsedArea = parseMoneyValue(draft.area);
  if (parsedArea === null || parsedArea < 0) {
    return {
      ok: false,
      message: "Area must be zero or greater",
      field: "area",
    };
  }
  areaSq = parsedArea;
  if (draft.areaCent.trim()) {
    const parsedCent = parseMoneyValue(draft.areaCent);
    if (parsedCent === null || parsedCent < 0) {
      return {
        ok: false,
        message: "Area (cent) must be zero or greater",
        field: "area_cent",
      };
    }
  }
  const by = draft.builtYear.trim();
  if (by) {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2;
    if (by.length !== 4)
      return {
        ok: false,
        message: "Built year must be exactly 4 digits",
        field: "built_year",
      };
    const y = Number(by);
    if (!Number.isFinite(y) || y < 1800 || y > maxYear) {
      return {
        ok: false,
        message: `Built year must be from 1800 to ${maxYear}`,
        field: "built_year",
      };
    }
  }
  const feats: string[] = [];
  if (draft.parkingSpaces.trim())
    feats.push(`${draft.parkingSpaces.trim()} parking space(s)`);
  const locationLine =
    [draft.city, draft.district, draft.state].filter(Boolean).join(", ") || "—";
  const nearbyFiltered = draft.nearbyPlaces.filter(
    (n) => n.name.trim() || n.distanceKm.trim(),
  );
  const youtubeTrim = draft.youtubeLink.trim();

  return {
    ok: true,
    data: {
      priceNum,
      areaSq,
      latNum,
      lngNum,
      feats,
      locationLine,
      nearbyFiltered,
      youtubeTrim,
    },
  };
}

export type ListingFormUser = { name: string; email: string; phone?: string };

export function buildPropertyFromValidatedDraft(
  draft: AddPropertyDraft,
  parsed: DraftParseOk,
  ctx: {
    user: ListingFormUser;
    fallbackImage: string;
    mode: "create" | "edit";
    existing: Property | null;
    imageFiles: File[];
    videoFile: File | null;
    status: PropertyStatus;
  },
): Property {
  let image: string;
  let gallery: string[];
  if (ctx.imageFiles.length > 0) {
    gallery = ctx.imageFiles.map((f) => URL.createObjectURL(f));
    image = gallery[0];
  } else if (ctx.mode === "edit" && ctx.existing) {
    image = ctx.existing.image;
    gallery = ctx.existing.gallery.length
      ? [...ctx.existing.gallery]
      : [ctx.existing.image];
  } else {
    gallery = [];
    image = ctx.fallbackImage;
  }
  const mainGallery = gallery.length ? gallery : [image];

  let videoUrl: string | undefined;
  if (ctx.videoFile) videoUrl = URL.createObjectURL(ctx.videoFile);
  else if (parsed.youtubeTrim) videoUrl = parsed.youtubeTrim;
  else if (ctx.mode === "edit" && ctx.existing?.videoUrl)
    videoUrl = ctx.existing.videoUrl;

  const base: Property = {
    id:
      ctx.mode === "edit" && ctx.existing ? ctx.existing.id : `p_${Date.now()}`,
    title: draft.title.trim(),
    category: draft.propertyCategory,
    type: draft.propertyFor,
    price: parsed.priceNum,
    location: parsed.locationLine,
    city: draft.city.trim() || draft.district || draft.state || "—",
    bedrooms: Number(draft.bedrooms) || 0,
    bathrooms: Number(draft.bathrooms) || 0,
    area: parsed.areaSq,
    areaUnit: draft.areaUnit,
    features: parsed.feats,
    description: draft.description.trim(),
    image,
    gallery: mainGallery,
    ownerName: draft.contactName.trim() || ctx.user.name,
    ownerPhone: draft.phone.trim() || ctx.user.phone || "",
    ownerEmail: draft.contactEmail.trim() || ctx.user.email,
    status: ctx.status,
    videoUrl,
    lat: parsed.latNum,
    lng: parsed.lngNum,
    createdAt:
      ctx.mode === "edit" && ctx.existing
        ? ctx.existing.createdAt
        : new Date().toISOString().slice(0, 10),
    ownership: draft.ownership.trim() || undefined,
    state: draft.state || undefined,
    district: draft.district || undefined,
    contactWhatsApp: withIndiaCountryCode(draft.whatsapp.trim()) || undefined,
    youtubeUrl: parsed.youtubeTrim || undefined,
    googleMapUrl: draft.googleMapUrl.trim() || undefined,
    googleEmbedHtml: draft.googleEmbedHtml.trim(),
    builtYear: draft.builtYear.trim() || undefined,
    furnishing: draft.furnishing || undefined,
    parkingSpaces: draft.parkingSpaces.trim() || undefined,
    nearbyPlaces: parsed.nearbyFiltered.length
      ? parsed.nearbyFiltered
      : undefined,
  };

  if (ctx.mode === "edit" && ctx.existing) {
    if (ctx.existing.featured !== undefined)
      base.featured = ctx.existing.featured;
    if (ctx.existing.priceUnit !== undefined)
      base.priceUnit = ctx.existing.priceUnit;
  }

  return base;
}

export type ExistingImage = { id: number; url: string };

export type ListingFormFieldsProps = {
  draft: AddPropertyDraft;
  setDraft: Dispatch<SetStateAction<AddPropertyDraft>>;
  imageFiles: File[];
  setImageFiles: Dispatch<SetStateAction<File[]>>;
  videoFile: File | null;
  setVideoFile: Dispatch<SetStateAction<File | null>>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  videoInputRef: RefObject<HTMLInputElement | null>;
  /** Already-saved images (edit mode). Rendered with a delete control. */
  existingImages?: ExistingImage[];
  /** Called when the user deletes an already-saved image. */
  onDeleteExistingImage?: (id: number) => void;
  /** Set of image ids currently being deleted (shows a busy state). */
  deletingImageIds?: number[];
  /** Already-uploaded property video URL (edit mode). */
  existingVideoUrl?: string | null;
  /** Called when the user deletes the already-uploaded video. */
  onDeleteExistingVideo?: () => void;
  /** Whether the existing video is currently being deleted. */
  deletingVideo?: boolean;
  /** Background video compression status from the API (edit mode). */
  videoProcessingStatus?: VideoProcessingStatus;
  /** Retry failed background video processing. */
  onRetryVideoProcessing?: () => void;
  retryingVideoProcessing?: boolean;
  /** When true, hide Contact Information (owner uses account profile). */
  hideContact?: boolean;
  /** When true, hide Property Ownership (owner always lists their own property). */
  hideOwnership?: boolean;
};

export function ListingFormFields({
  draft,
  setDraft,
  imageFiles,
  setImageFiles,
  videoFile,
  setVideoFile,
  imageInputRef,
  videoInputRef,
  existingImages = [],
  onDeleteExistingImage,
  deletingImageIds = [],
  existingVideoUrl,
  onDeleteExistingVideo,
  deletingVideo = false,
  videoProcessingStatus,
  onRetryVideoProcessing,
  retryingVideoProcessing = false,
  hideContact = false,
  hideOwnership = false,
}: ListingFormFieldsProps) {
  const { data: statesData } = useStates();
  const { data: propertyTypesData } = usePropertyTypes();
  const { data: featuresData } = useFeatures();
  const stateIdNum = draft.stateId ? Number(draft.stateId) : undefined;
  const { data: districtsData } = useDistricts(stateIdNum);
  const states = statesData?.results ?? [];
  const districts = districtsData?.results ?? [];
  const featureOptions = featuresData?.results ?? [];

  const toggleFeature = (id: number, checked: boolean) => {
    setDraft((d) => {
      const set = new Set(d.featureIds);
      if (checked) set.add(id);
      else set.delete(id);
      return { ...d, featureIds: Array.from(set) };
    });
  };
  const propertyTypeOptions = propertyTypesData?.results?.length
    ? propertyTypesData.results.map((t) => t.name)
    : ["Villa", "Apartment", "Penthouse", "Townhouse", "Commercial", "Land"];

  const selectedType = propertyTypesData?.results?.find(
    (t) => t.name === draft.propertyCategory,
  );
  const typeFlags = flagsFromPropertyType(selectedType);

  useEffect(() => {
    if (!propertyTypesData?.results?.length) return;
    if (
      propertyTypesData.results.some((t) => t.name === draft.propertyCategory)
    )
      return;
    setDraft((d) => ({
      ...d,
      propertyCategory: propertyTypesData.results[0]
        .name as Property["category"],
    }));
  }, [draft.propertyCategory, propertyTypesData?.results, setDraft]);

  return (
    <>
      {/* Basic Information */}
      <div className={formCardClass}>
        <h3 className="font-semibold text-foreground">Basic Information</h3>
        <div className={cn("grid gap-4", !hideOwnership && "sm:grid-cols-2")}>
          <div className="space-y-2">
            <Label>Property For</Label>
            <Select
              value={draft.propertyFor}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, propertyFor: v as Property["type"] }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="For Sale">For Sale</SelectItem>
                <SelectItem value="For Rent">For Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!hideOwnership ? (
            <div className="space-y-2" data-field="ownership">
              <Label>Property Ownership</Label>
              <Select
                value={draft.ownership || undefined}
                onValueChange={(v) => setDraft((d) => ({ ...d, ownership: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ownership" />
                </SelectTrigger>
                <SelectContent>
                  {ownershipSelectOptions(draft.ownership).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      {!hideContact ? (
        <div className={formCardClass}>
          <h3 className="font-semibold text-foreground">Contact Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <Label>Contact Name</Label>
              <Input
                className="w-full min-w-0 max-w-full"
                placeholder="Full name"
                autoComplete="name"
                value={draft.contactName}
                maxLength={MAX_CONTACT_NAME_LEN}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    contactName: sanitizeContactName(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2 min-w-0" data-field="email">
              <Label>Email</Label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@example.com"
                maxLength={MAX_EMAIL_LEN}
                className="w-full min-w-0 max-w-full"
                value={draft.contactEmail}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    contactEmail: sanitizeEmailInput(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2 min-w-0" data-field="whatsapp_number">
              <Label>WhatsApp Number</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  +91
                </span>
                <Input
                  className="w-full min-w-0 max-w-full pl-12"
                  placeholder="98765 43210"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={draft.whatsapp}
                  maxLength={WHATSAPP_LOCAL_MAX}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      whatsapp: localWhatsappDigits(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2 min-w-0" data-field="phone_number">
              <Label>Phone Number</Label>
              <Input
                className="w-full min-w-0 max-w-full"
                placeholder="+91 …"
                inputMode="tel"
                autoComplete="tel"
                maxLength={MAX_PHONE_FIELD_LEN}
                value={draft.phone}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    phone: sanitizePhoneLike(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Location — state/district from API; city is free text */}
      <div className={formCardClass}>
        <h3 className="font-semibold text-foreground">Location</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2" data-field="state">
            <Label>State</Label>
            <SearchableSelect
              value={draft.stateId || undefined}
              onValueChange={(id) => {
                const st = states.find((s) => String(s.id) === id);
                setDraft((d) => ({
                  ...d,
                  stateId: id,
                  state: st?.name ?? "",
                  districtId: "",
                  district: "",
                  city: "",
                  latitude: "",
                  longitude: "",
                }));
              }}
              options={states.map((st) => ({
                value: String(st.id),
                label: st.name,
              }))}
              placeholder="Select state"
              searchPlaceholder="Search states…"
              emptyText="No states found."
            />
          </div>
          <div className="space-y-2" data-field="district">
            <Label>District</Label>
            <SearchableSelect
              value={draft.districtId || undefined}
              disabled={!draft.stateId}
              onValueChange={(id) => {
                const dist = districts.find((d) => String(d.id) === id);
                setDraft((d) => ({
                  ...d,
                  districtId: id,
                  district: dist?.name ?? "",
                  city: "",
                  latitude: "",
                  longitude: "",
                }));
              }}
              options={districts.map((dist) => ({
                value: String(dist.id),
                label: dist.name,
              }))}
              placeholder={
                draft.stateId ? "Select district" : "Select state first"
              }
              searchPlaceholder="Search districts…"
              emptyText="No districts found."
              className={cn(!draft.stateId && "opacity-60")}
            />
          </div>
          <div className="space-y-2" data-field="city">
            <Label>Place / City</Label>
            <OsmPlaceSearch
              value={draft.city}
              displayLabel={draft.city}
              stateName={draft.state}
              districtName={draft.district}
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
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className={formCardClass}>
        <h3 className="font-semibold text-foreground">Property Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0" data-field="title">
            <Label>Title</Label>
            <Input
              className="w-full min-w-0 max-w-full"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 min-w-0" data-field="price">
            <Label>Price</Label>
            <Input
              className="w-full min-w-0 max-w-full font-mono"
              placeholder="e.g. 2500000"
              inputMode="numeric"
              value={draft.price}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  price: sanitizeMoneyOrArea(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select
              value={draft.propertyCategory}
              onValueChange={(v) =>
                setDraft((d) => {
                  const type = propertyTypesData?.results?.find(
                    (t) => t.name === v,
                  );
                  const flags = flagsFromPropertyType(type);
                  return {
                    ...d,
                    propertyCategory: v as Property["category"],
                    ...clearFieldsForFlags(flags),
                  };
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypeOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!typeFlags.has_area_both ? (
            <div className="space-y-2 min-w-0">
              <Label>
                Area Unit <span className="text-red-500">*</span>
              </Label>
              <Select
                value={draft.areaUnit}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    areaUnit: v as NonNullable<Property["areaUnit"]>,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area unit" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {typeFlags.has_area_both ? (
            <>
              <div className="space-y-2 min-w-0" data-field="area">
                <Label>
                  Area (sq.ft) <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="w-full min-w-0 max-w-full font-mono"
                  placeholder="e.g. 3200.50"
                  inputMode="decimal"
                  value={draft.area}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      area: sanitizeAreaValue(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2 min-w-0" data-field="area_cent">
                <Label>Area (Cent)</Label>
                <Input
                  className="w-full min-w-0 max-w-full font-mono"
                  placeholder="e.g. 5.75"
                  inputMode="decimal"
                  value={draft.areaCent}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      areaCent: sanitizeAreaValue(e.target.value),
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <div className="space-y-2 min-w-0" data-field="area">
              <Label>
                {AREA_UNIT_OPTIONS.find((o) => o.value === draft.areaUnit)
                  ?.inputLabel ?? "Area"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                className="w-full min-w-0 max-w-full font-mono"
                placeholder={
                  AREA_UNIT_OPTIONS.find((o) => o.value === draft.areaUnit)
                    ?.placeholder ?? "e.g. 3200.50"
                }
                inputMode="decimal"
                value={draft.area}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    area: sanitizeAreaValue(e.target.value),
                  }))
                }
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Property Description (optional)</Label>
          <Textarea
            rows={5}
            placeholder="Enter a detailed description of the property..."
            value={draft.description}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Additional Details */}
      <div className={formCardClass}>
        <h3 className="font-semibold text-foreground">Additional Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {typeFlags.has_bedrooms ? (
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Input
                type="number"
                min={0}
                value={draft.bedrooms}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bedrooms: e.target.value }))
                }
              />
            </div>
          ) : null}
          {typeFlags.has_bathrooms ? (
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Input
                type="number"
                min={0}
                value={draft.bathrooms}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bathrooms: e.target.value }))
                }
              />
            </div>
          ) : null}
          {typeFlags.has_furnishing ? (
            <div className="space-y-2">
              <Label>Furnishing</Label>
              <Select
                value={draft.furnishing}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, furnishing: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                  <SelectItem value="Semi-furnished">Semi-furnished</SelectItem>
                  <SelectItem value="Fully furnished">Fully furnished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {typeFlags.has_parking_spaces ? (
            <div className="space-y-2">
              <Label>Parking Spaces (optional)</Label>
              <Input
                value={draft.parkingSpaces}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, parkingSpaces: e.target.value }))
                }
              />
            </div>
          ) : null}
          {typeFlags.has_project_status ? (
            <div className="space-y-2" data-field="project_status">
              <Label>Project Status</Label>
              <Select
                value={draft.projectStatus || undefined}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, projectStatus: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project status" />
                </SelectTrigger>
                <SelectContent>
                  {projectStatusSelectOptions(draft.projectStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {typeFlags.has_floors ? (
            <div className="space-y-2">
              <Label>Floors</Label>
              <Input
                placeholder="e.g. 2"
                value={draft.floors}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, floors: e.target.value }))
                }
              />
            </div>
          ) : null}
          {typeFlags.has_sighting ? (
            <div className="space-y-2" data-field="sighting">
              <Label>Sighting (facing direction)</Label>
              <Select
                value={draft.sighting || undefined}
                onValueChange={(v) => setDraft((d) => ({ ...d, sighting: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  {sightingSelectOptions(draft.sighting).map((dir) => (
                    <SelectItem key={dir} value={dir}>
                      {dir}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div
            className="space-y-2 sm:col-span-2 min-w-0"
            data-field="google_maps_url"
          >
            <Label>Google Map URL (optional)</Label>
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://maps.google.com/..."
              className="w-full min-w-0 max-w-full"
              value={draft.googleMapUrl}
              onChange={(e) =>
                setDraft((d) => ({ ...d, googleMapUrl: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Video file upload */}
      <div className={formCardClass}>
        <h3 className="font-semibold text-foreground">
          Property video (upload)
        </h3>
        <input
          ref={videoInputRef as LegacyRef<HTMLInputElement>}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setVideoFile(f ?? null);
          }}
        />
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const f = Array.from(e.dataTransfer.files).find((file) =>
              file.type.startsWith("video/"),
            );
            if (f) setVideoFile(f);
          }}
          onClick={() => videoInputRef.current?.click()}
          className={cn(
            "w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:border-gold/60 cursor-pointer",
            videoFile
              ? "border-gold/40 bg-gold/5"
              : "border-border bg-muted/20",
          )}
        >
          <Upload className="h-8 w-8 mx-auto text-gold mb-2" />
          <p className="font-medium text-sm">
            {videoFile
              ? videoFile.name
              : "Drag & drop video or click to select"}
          </p>
        </button>
        {videoFile ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              setVideoFile(null);
              if (videoInputRef.current) videoInputRef.current.value = "";
            }}
          >
            Remove video file
          </Button>
        ) : null}
        {videoProcessingStatus &&
        videoProcessingStatusLabel(videoProcessingStatus) ? (
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm",
                videoProcessingStatusTone(videoProcessingStatus) === "warning" &&
                  "text-amber-600",
                videoProcessingStatusTone(videoProcessingStatus) === "success" &&
                  "text-emerald-600",
                videoProcessingStatusTone(videoProcessingStatus) ===
                  "destructive" && "text-destructive",
              )}
            >
              {videoProcessingStatusLabel(videoProcessingStatus)}
            </p>
            {videoProcessingStatus === "failed" && onRetryVideoProcessing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={retryingVideoProcessing}
                onClick={onRetryVideoProcessing}
              >
                {retryingVideoProcessing ? "Retrying…" : "Retry compression"}
              </Button>
            ) : null}
          </div>
        ) : null}
        {existingVideoUrl && !videoFile ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Current video
            </p>
            <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-black/5">
              <video
                src={existingVideoUrl}
                controls
                className="h-44 w-full bg-black object-contain"
              />
              {onDeleteExistingVideo ? (
                <button
                  type="button"
                  aria-label="Delete current video"
                  disabled={deletingVideo}
                  onClick={onDeleteExistingVideo}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:bg-destructive/90 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Features — loaded from the features catalog API */}
      <div className={formCardClass}>
        <h3 className="font-semibold text-foreground">Features</h3>
        {featureOptions.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {featureOptions.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={draft.featureIds.includes(f.id)}
                  onCheckedChange={(c) => toggleFeature(f.id, c === true)}
                />
                {f.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No features available.
          </p>
        )}
      </div>

      {/* Property Images */}
      <div className={formCardClass}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground">Property Images</h3>
          <span className="text-xs text-muted-foreground">
            {existingImages.length + imageFiles.length}/{MAX_PROPERTY_IMAGES}{" "}
            (optional)
          </span>
        </div>
        {existingImages.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Current images
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {existingImages.map((img) => {
                const busy = deletingImageIds.includes(img.id);
                return (
                  <div
                    key={img.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/20"
                  >
                    <img
                      src={img.url}
                      alt="Property"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {onDeleteExistingImage ? (
                      <button
                        type="button"
                        aria-label="Delete image"
                        disabled={busy}
                        onClick={() => onDeleteExistingImage(img.id)}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:bg-destructive/90 disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <input
          ref={imageInputRef as LegacyRef<HTMLInputElement>}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) {
              setImageFiles((prev) => {
                const remaining =
                  MAX_PROPERTY_IMAGES - existingImages.length - prev.length;
                if (remaining <= 0) return prev;
                return [...prev, ...Array.from(list).slice(0, remaining)];
              });
            }
            if (imageInputRef.current) imageInputRef.current.value = "";
          }}
        />
        {existingImages.length + imageFiles.length < MAX_PROPERTY_IMAGES ? (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                imageInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/"),
              );
              if (files.length) {
                setImageFiles((prev) => {
                  const remaining =
                    MAX_PROPERTY_IMAGES - existingImages.length - prev.length;
                  if (remaining <= 0) return prev;
                  return [...prev, ...files.slice(0, remaining)];
                });
              }
            }}
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-gold/50 transition-colors cursor-pointer bg-muted/10"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium text-sm text-foreground">
              Drag & drop files or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Up to {MAX_PROPERTY_IMAGES} images. You can add{" "}
              {MAX_PROPERTY_IMAGES - existingImages.length - imageFiles.length}{" "}
              more.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border bg-muted/10 p-4 text-center">
            Maximum of {MAX_PROPERTY_IMAGES} images reached. Remove an image to
            add another.
          </p>
        )}
        {imageFiles.length > 0 ? (
          <ul className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
            {imageFiles.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  className="text-destructive shrink-0 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFiles((prev) => prev.filter((_, j) => j !== i));
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}

/** Helper hook bundle for components that host the ListingFormFields. */
export function useListingFormRefs() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  return { imageInputRef, videoInputRef };
}
