"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { type Property, type PropertyStatus } from "@/data/mockData";
import {
  useMyProperties,
  usePropertyMutations,
} from "@/hooks/api/useProperties";
import { usePropertyTypes } from "@/hooks/api/useCatalog";
import { accountsApi } from "@/lib/api/accounts";
import {
  buildPropertyFormData,
  resolveFeatureIds,
  validatePropertyImages,
} from "@/lib/api/propertyForm";
import { getApiErrorField, getErrorMessage } from "@/lib/api/errors";
import { mapApiUserToSession } from "@/lib/api/mappers/user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Maximize,
  MapPin,
  Lightbulb,
  MailCheck,
  Lock,
  Phone,
  MessageCircle,
  MapPinned,
  CheckCircle2,
  Circle,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { SubmitProgressButton } from "@/components/SubmitProgressButton";
import { cn } from "@/lib/utils";
import {
  ListingFormFields,
  emptyDraft,
  propertyToDraft,
  validateAndParseDraft,
  scrollToListingField,
  type AddPropertyDraft,
} from "@/components/PropertyListingForm";

const Dashboard = () => {
  const { user, hydrated, login, loginWithToken, getToken } = useAuth();
  const navigate = useNavigate();
  const [propertySearch, setPropertySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Unfiltered portfolio — drives the summary cards and the "has any listings" check.
  const { data: allData, refetch } = useMyProperties({ page_size: 50 });
  // Server-side search — only the visible listing table reacts to the query.
  const { data: myData, isFetching: isSearching } = useMyProperties({
    page_size: 50,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const propertyMutations = usePropertyMutations();
  const { data: propertyTypesData } = usePropertyTypes();
  const allProperties = allData?.items ?? [];
  const properties = myData?.items ?? [];
  const hasSearch = debouncedSearch.trim().length > 0;

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<AddPropertyDraft>(emptyDraft);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [editDraft, setEditDraft] = useState<AddPropertyDraft>(emptyDraft);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editStatus, setEditStatus] = useState<PropertyStatus>("Pending");
  const [editExistingImages, setEditExistingImages] = useState<
    { id: number; url: string }[]
  >([]);
  const [editExistingVideo, setEditExistingVideo] = useState<string | null>(
    null,
  );
  const [deletingImageIds, setDeletingImageIds] = useState<number[]>([]);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const [propertiesPage, setPropertiesPage] = useState(1);
  const [propertiesPageSize, setPropertiesPageSize] = useState(5);
  const [activeTab, setActiveTab] = useState<"properties" | "profile">(
    "properties",
  );

  useEffect(() => {
    // Wait for the session to rehydrate from localStorage before redirecting,
    // otherwise a refresh kicks the user out to the home page.
    if (!hydrated) return;
    if (!user) navigate("/");
    else if (user.role === "admin") navigate("/admin");
  }, [navigate, user, hydrated]);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(propertySearch.trim()), 350);
    return () => clearTimeout(id);
  }, [propertySearch]);

  // Reset to page 1 whenever the list size, page-size, or search changes.
  useEffect(() => {
    setPropertiesPage(1);
  }, [properties.length, propertiesPageSize, debouncedSearch]);

  // NOTE: All hooks must run on every render. Keep `useMemo` above any early
  // returns to avoid "Rendered fewer hooks than expected" when signing out.
  const counts = useMemo(
    () => ({
      total: allProperties.length,
      approved: allProperties.filter((p) => p.status === "Approved").length,
      pending: allProperties.filter((p) => p.status === "Pending").length,
    }),
    [allProperties],
  );

  // `properties` is already filtered server-side by `debouncedSearch`.
  const filteredProperties = properties;

  if (!hydrated) return null;
  if (!user || user.role === "admin") return null;

  const propertiesTotalPages = Math.max(
    1,
    Math.ceil(filteredProperties.length / propertiesPageSize),
  );
  const propertiesSafePage = Math.min(
    Math.max(propertiesPage, 1),
    propertiesTotalPages,
  );
  const propertiesStartIdx = (propertiesSafePage - 1) * propertiesPageSize;
  const propertiesEndIdx = Math.min(
    filteredProperties.length,
    propertiesStartIdx + propertiesPageSize,
  );
  const pagedProperties = filteredProperties.slice(
    propertiesStartIdx,
    propertiesEndIdx,
  );

  const propertiesPageButtons = (() => {
    const max = propertiesTotalPages;
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
    const s = new Set<number>([
      1,
      max,
      propertiesSafePage,
      propertiesSafePage - 1,
      propertiesSafePage + 1,
    ]);
    return Array.from(s)
      .filter((n) => n >= 1 && n <= max)
      .sort((a, b) => a - b);
  })();

  const fallbackImage = properties[0]?.image ?? "/placeholder-property.jpg";

  const resetAddPropertyForm = () => {
    setDraft(emptyDraft);
    setImageFiles([]);
    setVideoFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const resetEditPropertyForm = () => {
    setEditDraft(emptyDraft);
    setEditImageFiles([]);
    setEditVideoFile(null);
    setEditExistingImages([]);
    setEditExistingVideo(null);
    setDeletingImageIds([]);
    setDeletingVideo(false);
    if (editImageInputRef.current) editImageInputRef.current.value = "";
    if (editVideoInputRef.current) editVideoInputRef.current.value = "";
  };

  const submitProp = async () => {
    if (!user) return;
    const parsed = validateAndParseDraft(draft);
    if (!parsed.ok) {
      toast.error(parsed.message);
      scrollToListingField(parsed.field);
      return;
    }
    const imageError = validatePropertyImages({ newImages: imageFiles.length });
    if (imageError) {
      toast.error(imageError);
      return;
    }
    try {
      const typeId = propertyTypesData?.results?.find(
        (t) => t.name.toLowerCase() === draft.propertyCategory.toLowerCase(),
      )?.id;
      if (!typeId) {
        toast.error("Please select a valid property type");
        return;
      }
      const fd = buildPropertyFormData(draft, imageFiles, videoFile, {
        propertyTypeId: typeId,
        featureIds: resolveFeatureIds(draft),
        includeContact: false,
      });
      await propertyMutations.create.mutateAsync(fd);
      toast.success("Property created and submitted for approval");
      setAddOpen(false);
      resetAddPropertyForm();
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
      scrollToListingField(getApiErrorField(err));
    }
  };

  const openEdit = (p: Property) => {
    setEditDraft(propertyToDraft(p));
    setEditStatus(p.status);
    setEditImageFiles([]);
    setEditVideoFile(null);
    setEditExistingImages(p.images ?? []);
    const isUploadedVideo =
      p.videoUrl &&
      !p.videoUrl.includes("youtube.com") &&
      !p.videoUrl.includes("youtu.be");
    setEditExistingVideo(isUploadedVideo ? p.videoUrl! : null);
    setDeletingImageIds([]);
    setDeletingVideo(false);
    if (editImageInputRef.current) editImageInputRef.current.value = "";
    if (editVideoInputRef.current) editVideoInputRef.current.value = "";
    setEditTarget(p);
  };

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!editTarget) return;
    setDeletingImageIds((prev) => [...prev, imageId]);
    try {
      await propertyMutations.deleteImage.mutateAsync({
        id: editTarget.id,
        imageId,
      });
      setEditExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingImageIds((prev) => prev.filter((id) => id !== imageId));
    }
  };

  const handleDeleteExistingVideo = async () => {
    if (!editTarget) return;
    setDeletingVideo(true);
    try {
      await propertyMutations.removeVideo.mutateAsync(editTarget.id);
      setEditExistingVideo(null);
      toast.success("Video removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingVideo(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget || !user) return;
    const parsed = validateAndParseDraft(editDraft);
    if (!parsed.ok) {
      toast.error(parsed.message);
      scrollToListingField(parsed.field);
      return;
    }
    const imageError = validatePropertyImages({
      newImages: editImageFiles.length,
      existingImages: editExistingImages.length,
    });
    if (imageError) {
      toast.error(imageError);
      return;
    }
    try {
      const typeId = propertyTypesData?.results?.find(
        (t) =>
          t.name.toLowerCase() === editDraft.propertyCategory.toLowerCase(),
      )?.id;
      const fd = buildPropertyFormData(
        editDraft,
        editImageFiles,
        editVideoFile,
        {
          propertyTypeId: typeId ?? editTarget.propertyTypeId,
          featureIds: resolveFeatureIds(editDraft),
          includeContact: false,
        },
      );
      await propertyMutations.update.mutateAsync({
        id: editTarget.id,
        form: fd,
      });
      toast.success(`“${editDraft.title.trim()}” updated`);
      setEditTarget(null);
      resetEditPropertyForm();
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
      scrollToListingField(getApiErrorField(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const removed = deleteTarget;
    try {
      await propertyMutations.remove.mutateAsync(removed.id);
      toast.success(`“${removed.title}” has been removed`);
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      const updated = await accountsApi.patchProfile({
        full_name: String(fd.get("name") || user.name),
        phone: String(fd.get("phone") || user.phone),
        whatsapp_number: String(fd.get("whatsapp") || ""),
        address: String(fd.get("address") || ""),
      });
      if ("id" in updated) {
        const token = getToken();
        if (token) loginWithToken(token, mapApiUserToSession(updated));
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Editorial banner */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(60%_80%_at_20%_20%,rgba(255,255,255,0.10),transparent_60%),radial-gradient(40%_60%_at_90%_90%,rgba(255,255,255,0.06),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <RevealOnScroll className="mx-auto w-full max-w-[1800px] px-6 lg:px-10 relative py-16">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-white">
              Dashboard
            </div>
            <h1 className="font-serif text-5xl md:text-6xl mt-3 text-white">
              Welcome, <span className="text-white">{user.name}</span>
            </h1>
            <p className="mt-3 text-sm text-white/85 max-w-md">
              Manage your listings and keep your profile up to date.
            </p>
          </div>
        </RevealOnScroll>
      </section>

      <section className="mx-auto w-full max-w-[1800px] px-6 lg:px-10 py-12 -mt-10 relative z-10">
        <RevealOnScroll>
          <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-10">
            {[
              { icon: Building2, l: "My Properties", v: counts.total },
              { icon: Building2, l: "Approved", v: counts.approved },
              { icon: Building2, l: "Pending", v: counts.pending },
            ].map((s, i) => (
              <div
                key={s.l}
                className="group relative p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-card hover-lift animate-fade-in overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/5 group-hover:bg-gold/10 transition-colors" />
                <div className="grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-xl border border-gold/30 bg-gold/10 mb-3 sm:mb-4">
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
                </div>
                <div className="font-serif text-2xl sm:text-4xl text-foreground">
                  {s.v}
                </div>
                <div className="text-[9px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.22em] text-muted-foreground mt-1.5 sm:mt-2">
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "properties" | "profile")}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <TabsList className="bg-muted/60 rounded-full p-1 w-fit">
                <TabsTrigger
                  value="properties"
                  className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  My Properties
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Profile
                </TabsTrigger>
              </TabsList>
              <Button
                variant="luxe"
                size="lg"
                onClick={() => setAddOpen(true)}
                className="rounded-full shadow-luxe shrink-0"
              >
                <Plus className="h-4 w-4" /> Add property
              </Button>
            </div>

            <TabsContent value="properties" className="mt-6 animate-fade-in">
              {allProperties.length > 0 && (
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={propertySearch}
                      onChange={(event) =>
                        setPropertySearch(event.target.value)
                      }
                      placeholder="Search your properties..."
                      className="h-11 rounded-full pl-10 pr-10"
                      aria-label="Search your properties"
                    />
                    {propertySearch ? (
                      <button
                        type="button"
                        onClick={() => setPropertySearch("")}
                        aria-label="Clear property search"
                        className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {hasSearch ? (
                    <p className="text-xs text-muted-foreground">
                      {isSearching ? (
                        "Searching…"
                      ) : (
                        <>
                          Found{" "}
                          <span className="font-medium text-foreground">
                            {filteredProperties.length}
                          </span>{" "}
                          matching{" "}
                          {filteredProperties.length === 1
                            ? "property"
                            : "properties"}
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
              )}

              {/* MOBILE: stacked card list */}
              <div className="md:hidden space-y-3">
                {allProperties.length === 0 && !hasSearch && (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground shadow-card">
                    You don&apos;t have any properties yet. Tap{" "}
                    <span className="text-gold font-medium">Add property</span>{" "}
                    to list your first one.
                  </div>
                )}
                {hasSearch &&
                  !isSearching &&
                  filteredProperties.length === 0 && (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground shadow-card">
                      No properties match{" "}
                      <span className="font-medium text-foreground">
                        &quot;{debouncedSearch}&quot;
                      </span>
                      .
                    </div>
                  )}
                {pagedProperties.map((p, i) => (
                  <article
                    key={p.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-card animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex gap-3 p-3">
                      <img
                        src={p.image}
                        alt=""
                        className="h-20 w-24 shrink-0 rounded-xl object-cover ring-1 ring-border"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">
                              {p.title}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground inline-flex items-center gap-1 max-w-full">
                              <MapPin className="h-3 w-3 text-gold shrink-0" />
                              <span className="truncate">
                                {p.location}
                                {p.city ? `, ${p.city}` : ""}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                              p.status === "Approved"
                                ? "bg-[hsl(28_18%_10%)] text-background"
                                : p.status === "Pending"
                                  ? "bg-gold/15 text-[hsl(35_60%_28%)]"
                                  : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          <span>{p.category}</span>
                          <span className="text-foreground/30">·</span>
                          <span>{p.type}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/75">
                          <span className="inline-flex items-center gap-1">
                            <Bed className="h-3.5 w-3.5 text-gold" />{" "}
                            {p.bedrooms}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Bath className="h-3.5 w-3.5 text-gold" />{" "}
                            {p.bathrooms}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Maximize className="h-3.5 w-3.5 text-gold" />{" "}
                            {p.area.toLocaleString("en-US")} ft²
                          </span>
                        </div>

                        {p.description ? (
                          <p className="mt-2 text-xs text-foreground/70 leading-snug line-clamp-2">
                            {p.description}
                          </p>
                        ) : null}

                        {(p.features?.length ?? 0) > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.features.slice(0, 3).map((f) => (
                              <span
                                key={f}
                                className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-[hsl(35_60%_28%)]"
                              >
                                {f}
                              </span>
                            ))}
                            {p.features.length > 3 && (
                              <span
                                className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                                title={p.features.slice(3).join(", ")}
                              >
                                +{p.features.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-2 text-base font-semibold text-foreground">
                          ₹{p.price.toLocaleString("en-US")}
                          {p.priceUnit ? (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              {p.priceUnit}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t border-border/60 px-2 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gold hover:text-gold hover:bg-gold/10 gap-1.5"
                        onClick={() => navigate(`/properties/${p.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 hover:text-gold hover:bg-gold/10"
                        onClick={() => openEdit(p)}
                        aria-label={`Edit ${p.title}`}
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`Delete ${p.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              {/* DESKTOP / TABLET: table */}
              <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-card w-full">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-[15px] min-w-[1600px]">
                    <thead className="bg-muted/70 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-4 font-semibold">
                          Property
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Category
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Type
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Description
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Features
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Beds
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Baths
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Area
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Price
                        </th>
                        <th className="text-left px-3 py-4 font-semibold">
                          Status
                        </th>
                        <th className="text-right px-4 py-4 font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProperties.length === 0 && !hasSearch && (
                        <tr>
                          <td
                            colSpan={11}
                            className="p-12 text-center text-muted-foreground"
                          >
                            You don&apos;t have any properties yet. Click{" "}
                            <span className="text-gold font-medium">
                              Add property
                            </span>{" "}
                            to list your first one.
                          </td>
                        </tr>
                      )}
                      {hasSearch &&
                        !isSearching &&
                        filteredProperties.length === 0 && (
                          <tr>
                            <td
                              colSpan={11}
                              className="p-12 text-center text-muted-foreground"
                            >
                              No properties match{" "}
                              <span className="font-medium text-foreground">
                                &quot;{debouncedSearch}&quot;
                              </span>
                              .
                            </td>
                          </tr>
                        )}
                      {pagedProperties.map((p, i) => (
                        <tr
                          key={p.id}
                          className="border-t border-border/70 hover:bg-muted/40 transition-colors animate-fade-in [&>td]:align-top"
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3 min-w-[280px]">
                              <img
                                src={p.image}
                                alt=""
                                className="h-16 w-24 object-cover rounded-lg ring-1 ring-border flex-shrink-0"
                              />
                              <div className="min-w-0 max-w-[260px]">
                                <div className="font-semibold text-[15px] text-foreground truncate">
                                  {p.title}
                                </div>
                                <div className="text-[13px] text-muted-foreground mt-1 truncate inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                                  <span className="truncate">
                                    {p.location}
                                    {p.city ? `, ${p.city}` : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[14px] text-foreground/85 whitespace-nowrap">
                            {p.category}
                          </td>
                          <td className="px-3 py-4 text-[14px] text-foreground/85 whitespace-nowrap">
                            {p.type}
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p
                              className="text-[13px] text-foreground/80 leading-relaxed max-w-[340px] line-clamp-2"
                              title={p.description}
                            >
                              {p.description || (
                                <span className="text-muted-foreground/70 italic">
                                  No description
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                              {(p.features?.length ?? 0) === 0 ? (
                                <span className="text-[13px] text-muted-foreground/70 italic">
                                  —
                                </span>
                              ) : (
                                <>
                                  {p.features.slice(0, 2).map((f) => (
                                    <span
                                      key={f}
                                      className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[12px] font-medium text-[hsl(35_60%_28%)]"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                  {p.features.length > 2 && (
                                    <span
                                      className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[12px] font-medium text-foreground/70"
                                      title={p.features.slice(2).join(", ")}
                                    >
                                      +{p.features.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[14px] text-foreground/85 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Bed className="h-4 w-4 text-gold" /> {p.bedrooms}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-[14px] text-foreground/85 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Bath className="h-4 w-4 text-gold" />{" "}
                              {p.bathrooms}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-[14px] text-foreground/85 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Maximize className="h-4 w-4 text-gold" />{" "}
                              {p.area.toLocaleString("en-US")} ft²
                            </span>
                          </td>
                          <td className="px-3 py-4 text-[15px] text-foreground whitespace-nowrap font-semibold">
                            ₹{p.price.toLocaleString("en-US")}
                            {p.priceUnit ? (
                              <span className="text-[12px] font-normal text-muted-foreground ml-1">
                                {p.priceUnit}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ${
                                p.status === "Approved"
                                  ? "bg-[hsl(28_18%_10%)] text-background"
                                  : p.status === "Pending"
                                    ? "bg-gold/15 text-[hsl(35_60%_28%)]"
                                    : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[14px] text-gold hover:text-gold hover:bg-gold/10 gap-1.5"
                                onClick={() => navigate(`/properties/${p.id}`)}
                                title="View property"
                              >
                                <Eye className="h-4 w-4" /> View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 hover:text-gold hover:bg-gold/10"
                                onClick={() => openEdit(p)}
                                title="Edit property"
                                aria-label={`Edit ${p.title}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(p)}
                                title="Delete property"
                                aria-label={`Delete ${p.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination — shared across mobile cards & desktop table */}
              {filteredProperties.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  {/* Left — results-per-page selector */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Results per page:</span>
                    <Select
                      value={String(propertiesPageSize)}
                      onValueChange={(v) => setPropertiesPageSize(Number(v))}
                    >
                      <SelectTrigger className="h-9 w-[78px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="hidden sm:inline ml-3">
                      Showing{" "}
                      <span className="text-foreground font-medium">
                        {propertiesStartIdx + 1}
                      </span>
                      –
                      <span className="text-foreground font-medium">
                        {propertiesEndIdx}
                      </span>{" "}
                      of{" "}
                      <span className="text-foreground font-medium">
                        {filteredProperties.length}
                      </span>
                    </span>
                  </div>

                  {/* Right — pagination buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPropertiesPage((p) => Math.max(1, p - 1))
                      }
                      disabled={propertiesSafePage === 1}
                      aria-label="Previous page"
                      className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-foreground/70 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {propertiesPageButtons.map((p, idx) => {
                      const prev = propertiesPageButtons[idx - 1];
                      const needsDots = prev != null && p - prev > 1;
                      return (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1.5"
                        >
                          {needsDots ? (
                            <span className="px-1 text-muted-foreground">
                              …
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setPropertiesPage(p)}
                            aria-current={
                              p === propertiesSafePage ? "page" : undefined
                            }
                            aria-label={`Go to page ${p}`}
                            className={cn(
                              "h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition",
                              p === propertiesSafePage
                                ? "bg-gold text-white shadow-sm"
                                : "border border-border bg-white text-foreground/80 hover:bg-muted",
                            )}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() =>
                        setPropertiesPage((p) =>
                          Math.min(propertiesTotalPages, p + 1),
                        )
                      }
                      disabled={propertiesSafePage === propertiesTotalPages}
                      aria-label="Next page"
                      className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-foreground/70 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-6 animate-fade-in">
              {(() => {
                const completion = [
                  {
                    key: "name",
                    label: "Full name",
                    done: !!user.name?.trim(),
                  },
                  { key: "email", label: "Email", done: !!user.email?.trim() },
                  { key: "phone", label: "Phone", done: !!user.phone?.trim() },
                  {
                    key: "whatsapp",
                    label: "WhatsApp",
                    done: !!(user.whatsapp ?? "").trim(),
                  },
                  {
                    key: "address",
                    label: "Address",
                    done: !!(user.address ?? "").trim(),
                  },
                ];
                const completedCount = completion.filter((c) => c.done).length;
                const completionPct = Math.round(
                  (completedCount / completion.length) * 100,
                );
                return (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,_360px)_minmax(0,_1fr)]">
                    {/* LEFT — Account details form */}
                    <form
                      onSubmit={updateProfile}
                      className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
                    >
                      <div>
                        <h3 className="font-serif text-xl font-medium text-foreground">
                          Account details
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Update how buyers and our team can reach you.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Full name</Label>
                        <Input
                          id="profile-name"
                          name="name"
                          defaultValue={user.name}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-email">Email</Label>
                        <Input
                          id="profile-email"
                          defaultValue={user.email}
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-phone">Phone</Label>
                        <Input
                          id="profile-phone"
                          name="phone"
                          defaultValue={user.phone}
                          placeholder="+971 50 000 0000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-whatsapp">
                          WhatsApp number
                        </Label>
                        <Input
                          id="profile-whatsapp"
                          name="whatsapp"
                          defaultValue={user.whatsapp ?? ""}
                          placeholder="+971 50 000 0000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-address">Address</Label>
                        <Textarea
                          id="profile-address"
                          name="address"
                          defaultValue={user.address ?? ""}
                          placeholder="Street, city, state, postal code"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm">
                        <span className="font-medium text-foreground">
                          Change password
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            toast.info("Password reset link sent to your email")
                          }
                          className="text-[#1c5fa8] font-medium hover:underline"
                        >
                          Update password
                        </button>
                      </div>

                      <Button
                        type="submit"
                        className="rounded-lg bg-[#1c5fa8] text-white hover:bg-[#0e305d]"
                      >
                        Save changes
                      </Button>
                    </form>

                    {/* RIGHT — info cards stack */}
                    <div className="space-y-6">
                      {/* Identity card */}
                      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#1c5fa8]/10" />
                        <div className="relative flex items-center gap-4">
                          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1c5fa8] font-sans text-lg font-semibold text-white">
                            {user.name?.[0]?.toUpperCase() ?? "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">
                              {user.name}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {user.email}
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                              <MailCheck className="h-3 w-3" />
                              Email verified
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Your listings */}
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Your listings
                          </span>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Total", value: counts.total },
                            { label: "Approved", value: counts.approved },
                            { label: "Pending", value: counts.pending },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="rounded-xl bg-muted/40 px-4 py-5 text-center"
                            >
                              <div className="font-serif text-2xl text-foreground">
                                {s.value}
                              </div>
                              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {s.label}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="rounded-full bg-[#1c5fa8] text-white hover:bg-[#0e305d]"
                          >
                            <Plus className="h-4 w-4" /> Add property
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("properties")}
                            className="rounded-full"
                          >
                            View all
                          </Button>
                        </div>
                      </div>

                      {/* Profile completeness */}
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Profile completeness
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {completionPct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-[#1c5fa8] transition-all"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                        <ul className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                          {completion.map((item) => (
                            <li
                              key={item.key}
                              className={cn(
                                "flex items-center gap-2",
                                item.done
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.done ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/60" />
                              )}
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Buyer contact tips */}
                      <div className="rounded-2xl border border-[#1c5fa8]/15 bg-[#eef4fc] p-6">
                        <div className="mb-3 inline-flex items-center gap-2 font-semibold text-foreground">
                          <Lightbulb className="h-4 w-4 text-[#1c5fa8]" />
                          Buyer contact tips
                        </div>
                        <ul className="space-y-2 text-sm text-foreground/80">
                          <li className="flex items-start gap-2">
                            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#1c5fa8]" />
                            Phone and WhatsApp on your profile are used when a
                            listing does not specify its own numbers.
                          </li>
                          <li className="flex items-start gap-2">
                            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1c5fa8]" />
                            Keep WhatsApp updated so enquiries can reach you
                            quickly.
                          </li>
                          <li className="flex items-start gap-2">
                            <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[#1c5fa8]" />
                            Changing your email requires a verification code
                            sent to the new address.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </RevealOnScroll>
      </section>

      <Footer />

      {/* Add property — single scrollable form */}
      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) resetAddPropertyForm();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0 space-y-1">
            <DialogTitle className="font-serif text-2xl">
              Add property
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 pb-4 flex-1 space-y-6 min-h-0">
            <ListingFormFields
              draft={draft}
              setDraft={setDraft}
              imageFiles={imageFiles}
              setImageFiles={setImageFiles}
              videoFile={videoFile}
              setVideoFile={setVideoFile}
              imageInputRef={imageInputRef}
              videoInputRef={videoInputRef}
              hideContact
              hideOwnership
            />
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={propertyMutations.create.isPending}
              onClick={() => {
                setAddOpen(false);
                resetAddPropertyForm();
              }}
            >
              Cancel
            </Button>
            <SubmitProgressButton
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              submitting={propertyMutations.create.isPending}
              idleLabel="Create Property"
              onClick={submitProp}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit property dialog — same fields as Add */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) {
            setEditTarget(null);
            resetEditPropertyForm();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="font-serif text-2xl">
              Edit property
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-4 flex-1 space-y-6 min-h-0">
            <ListingFormFields
              draft={editDraft}
              setDraft={setEditDraft}
              imageFiles={editImageFiles}
              setImageFiles={setEditImageFiles}
              videoFile={editVideoFile}
              setVideoFile={setEditVideoFile}
              imageInputRef={editImageInputRef}
              videoInputRef={editVideoInputRef}
              existingImages={editExistingImages}
              onDeleteExistingImage={handleDeleteExistingImage}
              deletingImageIds={deletingImageIds}
              existingVideoUrl={editExistingVideo}
              onDeleteExistingVideo={handleDeleteExistingVideo}
              deletingVideo={deletingVideo}
              hideContact
              hideOwnership
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 w-full sm:max-w-[220px]">
              <Label>Listing status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as PropertyStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "Approved",
                      "Pending",
                      "Rejected",
                      "Sold",
                      "Rented",
                    ] as const
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={propertyMutations.update.isPending}
                onClick={() => {
                  setEditTarget(null);
                  resetEditPropertyForm();
                }}
              >
                Cancel
              </Button>
              <SubmitProgressButton
                type="button"
                variant="luxe"
                submitting={propertyMutations.update.isPending}
                idleLabel="Save changes"
                onClick={saveEdit}
              />
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">
              Delete this property?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                “{deleteTarget?.title}”
              </span>{" "}
              from your listings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
