"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { type Property } from "@/data/mockData";
import {
  useMyProperties,
  usePropertyMutations,
} from "@/hooks/api/useProperties";
import { usePropertyVideoStatusPolling } from "@/hooks/api/usePropertyVideoStatusPolling";
import { usePropertyUploadProgress } from "@/hooks/usePropertyUploadProgress";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePropertyTypes } from "@/hooks/api/useCatalog";
import { accountsApi } from "@/lib/api/accounts";
import {
  buildPropertyFormData,
  resolveFeatureIds,
  validatePropertyImages,
  validatePropertyMedia,
  findPropertyTypeFlags,
} from "@/lib/api/propertyForm";
import { getApiErrorField, getErrorMessage } from "@/lib/api/errors";
import { formatPropertyAreaDisplay } from "@/lib/api/mappers/property";
import { mapApiUserToSession } from "@/lib/api/mappers/user";
import { BRAND_LOGO_URL } from "@/lib/site";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  EyeOff,
  ChevronLeft,
  ChevronRight,
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
import { PropertyUploadProgress } from "@/components/PropertyUploadProgress";
import {
  VideoProcessingStatusBadge,
  hasPropertyUploadedVideo,
} from "@/components/VideoProcessingStatusBadge";
import { cn } from "@/lib/utils";
import {
  ListingFormFields,
  emptyDraft,
  propertyToDraft,
  validateAndParseDraft,
  applyListingValidationError,
  type AddPropertyDraft,
  type ListingFieldErrors,
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
  const addUploadProgress = usePropertyUploadProgress();
  const editUploadProgress = usePropertyUploadProgress();
  const { data: propertyTypesData } = usePropertyTypes();
  const allProperties = allData?.items ?? [];
  const properties = myData?.items ?? [];
  const polledProperties = useMemo(() => {
    const byId = new Map<string, Property>();
    for (const p of [...allProperties, ...properties]) {
      byId.set(p.id, p);
    }
    return Array.from(byId.values());
  }, [allProperties, properties]);
  usePropertyVideoStatusPolling(polledProperties);
  const hasSearch = debouncedSearch.trim().length > 0;

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<AddPropertyDraft>(emptyDraft);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [addFieldErrors, setAddFieldErrors] = useState<ListingFieldErrors>({});

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [editDraft, setEditDraft] = useState<AddPropertyDraft>(emptyDraft);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editExistingImages, setEditExistingImages] = useState<
    { id: number; url: string }[]
  >([]);
  const [editExistingVideo, setEditExistingVideo] = useState<string | null>(
    null,
  );
  const [editFieldErrors, setEditFieldErrors] = useState<ListingFieldErrors>(
    {},
  );
  const [deletingImageIds, setDeletingImageIds] = useState<number[]>([]);
  const [pendingDeleteImageIds, setPendingDeleteImageIds] = useState<number[]>(
    [],
  );
  const [imageDeleteConfirmId, setImageDeleteConfirmId] = useState<
    number | null
  >(null);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [retryingVideoId, setRetryingVideoId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [propertiesPage, setPropertiesPage] = useState(1);
  const [propertiesPageSize, setPropertiesPageSize] = useState(5);
  const [activeTab, setActiveTab] = useState<"properties" | "profile">(
    "properties",
  );

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const fallbackImage = properties[0]?.image ?? BRAND_LOGO_URL;

  const resetAddPropertyForm = () => {
    setDraft(emptyDraft);
    setImageFiles([]);
    setVideoFile(null);
    setAddFieldErrors({});
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
    setPendingDeleteImageIds([]);
    setImageDeleteConfirmId(null);
    setDeletingVideo(false);
    setEditFieldErrors({});
    if (editImageInputRef.current) editImageInputRef.current.value = "";
    if (editVideoInputRef.current) editVideoInputRef.current.value = "";
  };

  const submitProp = async () => {
    if (!user) return;
    setAddFieldErrors({});
    const parsed = validateAndParseDraft(draft);
    if (!parsed.ok) {
      applyListingValidationError(
        setAddFieldErrors,
        parsed.message,
        parsed.field,
      );
      return;
    }
    const imageError = validatePropertyImages({ newImages: imageFiles.length });
    if (imageError) {
      applyListingValidationError(
        setAddFieldErrors,
        imageError,
        "uploaded_images",
      );
      return;
    }
    const mediaError = validatePropertyMedia({
      newImages: imageFiles.length,
      hasVideo: !!videoFile || !!draft.youtubeLink.trim(),
    });
    if (mediaError) {
      applyListingValidationError(
        setAddFieldErrors,
        mediaError,
        "uploaded_images",
      );
      return;
    }
    try {
      const typeId = propertyTypesData?.results?.find(
        (t) => t.name.toLowerCase() === draft.propertyCategory.toLowerCase(),
      )?.id;
      if (!typeId) {
        applyListingValidationError(
          setAddFieldErrors,
          "Please select a valid property type",
          "property_type",
        );
        return;
      }
      const fd = buildPropertyFormData(draft, imageFiles, videoFile, {
        propertyTypeId: typeId,
        featureIds: resolveFeatureIds(draft),
        includeContact: false,
        typeFlags: findPropertyTypeFlags(
          propertyTypesData?.results,
          draft.propertyCategory,
        ),
      });
      const onUploadProgress = addUploadProgress.makeUploadProgressHandler(
        !!videoFile,
      );
      try {
        await propertyMutations.create.mutateAsync({
          form: fd,
          onUploadProgress,
        });
        toast.success("Property created and submitted for approval");
        setAddOpen(false);
        resetAddPropertyForm();
        void refetch();
      } finally {
        addUploadProgress.clearUploadProgress();
      }
    } catch (err) {
      const apiField = getApiErrorField(err);
      const message = getErrorMessage(err);
      if (apiField) {
        applyListingValidationError(setAddFieldErrors, message, apiField);
      } else {
        toast.error(message);
      }
    }
  };

  const openEdit = (p: Property) => {
    setEditDraft(propertyToDraft(p));
    setEditImageFiles([]);
    setEditVideoFile(null);
    setEditExistingImages(p.images ?? []);
    const isUploadedVideo =
      p.videoUrl &&
      !p.videoUrl.includes("youtube.com") &&
      !p.videoUrl.includes("youtu.be");
    setEditExistingVideo(isUploadedVideo ? p.videoUrl! : null);
    setDeletingImageIds([]);
    setPendingDeleteImageIds([]);
    setImageDeleteConfirmId(null);
    setDeletingVideo(false);
    if (editImageInputRef.current) editImageInputRef.current.value = "";
    if (editVideoInputRef.current) editVideoInputRef.current.value = "";
    setEditTarget(p);
  };

  const requestDeleteExistingImage = (imageId: number) => {
    setImageDeleteConfirmId(imageId);
  };

  const confirmDeleteExistingImage = async () => {
    if (!editTarget || imageDeleteConfirmId == null) return;
    const imageId = imageDeleteConfirmId;
    setImageDeleteConfirmId(null);
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

  const handleReplaceExistingImage = (imageId: number, file: File) => {
    setEditExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    setEditImageFiles([file]);
    setPendingDeleteImageIds((prev) =>
      prev.includes(imageId) ? prev : [...prev, imageId],
    );
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

  const handleRetryVideoProcessing = async (property: Property) => {
    setRetryingVideoId(property.id);
    try {
      await propertyMutations.retryVideoProcessing.mutateAsync(property.id);
      if (editTarget?.id === property.id) {
        setEditTarget((prev) =>
          prev ? { ...prev, videoProcessingStatus: "processing" } : prev,
        );
      }
      await refetch();
      toast.success("Video compression restarted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRetryingVideoId(null);
    }
  };

  const saveEdit = async () => {
    if (!editTarget || !user) return;
    setEditFieldErrors({});
    const parsed = validateAndParseDraft(editDraft);
    if (!parsed.ok) {
      applyListingValidationError(
        setEditFieldErrors,
        parsed.message,
        parsed.field,
      );
      return;
    }
    const imageError = validatePropertyImages({
      newImages: editImageFiles.length,
      existingImages: editExistingImages.length,
    });
    if (imageError) {
      applyListingValidationError(
        setEditFieldErrors,
        imageError,
        "uploaded_images",
      );
      return;
    }
    const mediaError = validatePropertyMedia({
      newImages: editImageFiles.length,
      existingImages: editExistingImages.length,
      hasVideo:
        !!editVideoFile ||
        !!editExistingVideo ||
        !!editDraft.youtubeLink.trim(),
    });
    if (mediaError) {
      applyListingValidationError(
        setEditFieldErrors,
        mediaError,
        "uploaded_images",
      );
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
          typeFlags: findPropertyTypeFlags(
            propertyTypesData?.results,
            editDraft.propertyCategory,
          ),
          mode: "update",
        },
      );
      const onUploadProgress = editUploadProgress.makeUploadProgressHandler(
        !!editVideoFile,
      );
      try {
        await propertyMutations.update.mutateAsync({
          id: editTarget.id,
          form: fd,
          onUploadProgress,
        });
        for (const imageId of pendingDeleteImageIds) {
          await propertyMutations.deleteImage.mutateAsync({
            id: editTarget.id,
            imageId,
          });
        }
        toast.success(`“${editDraft.title.trim()}” updated`);
        setEditTarget(null);
        resetEditPropertyForm();
        void refetch();
      } finally {
        editUploadProgress.clearUploadProgress();
      }
    } catch (err) {
      const apiField = getApiErrorField(err);
      const message = getErrorMessage(err);
      if (apiField) {
        applyListingValidationError(setEditFieldErrors, message, apiField);
      } else {
        toast.error(message);
      }
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

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const updated = await accountsApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      });
      const token = getToken();
      if (token) loginWithToken(token, mapApiUserToSession(updated));
      toast.success("Password updated successfully");
      setPasswordDialogOpen(false);
      resetPasswordForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Editorial banner */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(60%_80%_at_20%_20%,rgba(255,255,255,0.10),transparent_60%),radial-gradient(40%_60%_at_90%_90%,rgba(255,255,255,0.06),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <RevealOnScroll className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10 relative py-16">
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

      <section className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10 py-12 -mt-10 relative z-10">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="bg-muted/60 rounded-full p-1 h-11 w-full sm:w-fit grid grid-cols-2 sm:inline-flex">
                <TabsTrigger
                  value="properties"
                  className="rounded-full flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  My Properties
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="rounded-full flex-1 sm:flex-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Profile
                </TabsTrigger>
              </TabsList>
              <Button
                variant="luxe"
                size="lg"
                onClick={() => setAddOpen(true)}
                className="h-11 w-full rounded-full shadow-luxe sm:w-auto sm:shrink-0"
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

              {/* Property cards — 1 col mobile, 2 tablet, 3 desktop */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {allProperties.length === 0 && !hasSearch && (
                  <div className="col-span-full rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
                    You don&apos;t have any properties yet. Click{" "}
                    <span className="font-medium text-gold">Add property</span>{" "}
                    to list your first one.
                  </div>
                )}
                {hasSearch &&
                  !isSearching &&
                  filteredProperties.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
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
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-lg animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={p.image}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                      <span className="absolute bottom-3 left-3 inline-flex items-center rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                        {formatPropertyAreaDisplay(p)}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <h3 className="min-w-0 font-semibold leading-snug text-foreground line-clamp-2">
                          {p.title}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                            p.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : p.status === "Pending"
                                ? "bg-gold/15 text-[hsl(35_60%_28%)]"
                                : "bg-destructive/15 text-destructive",
                          )}
                        >
                          {p.status === "Approved" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : null}
                          {p.status}
                        </span>
                      </div>

                      <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                        <span className="line-clamp-2 leading-snug">
                          {p.location}
                          {p.city ? `, ${p.city}` : ""}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-[#eef4fc] px-2.5 py-1 text-[11px] font-medium text-[#1c5fa8]">
                          {p.type}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/75">
                          {p.category}
                        </span>
                        <VideoProcessingStatusBadge
                          variant="card"
                          status={p.videoProcessingStatus}
                          hasUploadedVideo={hasPropertyUploadedVideo(p.videoUrl)}
                          onRetry={
                            p.videoProcessingStatus === "failed"
                              ? () => void handleRetryVideoProcessing(p)
                              : undefined
                          }
                          retrying={retryingVideoId === p.id}
                        />
                      </div>

                      {(p.features?.length ?? 0) > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Features
                          </div>
                          <div className="flex flex-wrap gap-1.5">
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
                        </div>
                      )}

                      <div className="mt-auto flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-end sm:justify-between sm:border-0 sm:pt-4">
                        <div className="w-full sm:w-auto">
                          <div className="font-serif text-xl font-semibold text-foreground">
                            ₹{p.price.toLocaleString("en-US")}
                          </div>
                          {p.priceUnit ? (
                            <div className="text-[11px] text-muted-foreground">
                              {p.priceUnit}
                            </div>
                          ) : null}
                        </div>

                        <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 min-w-0 gap-1.5 rounded-lg border-border px-2 text-foreground hover:border-[#1c5fa8]/30 hover:bg-[#eef4fc] hover:text-[#1c5fa8] sm:h-8 sm:px-3"
                            onClick={() =>
                              navigate(
                                `/properties/${p.slug || p.id}?from=dashboard`,
                              )
                            }
                          >
                            <Eye className="h-3.5 w-3.5 shrink-0" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 min-w-0 gap-1.5 rounded-lg border-border px-2 hover:border-gold/40 hover:bg-gold/10 hover:text-gold sm:h-8 sm:px-3"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.title}`}
                          >
                            <Edit className="h-3.5 w-3.5 shrink-0" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 shrink-0 rounded-lg border-border p-0 text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Delete ${p.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {filteredProperties.length > 0 && (
                <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  {/* Left — results-per-page selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground sm:justify-start">
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
                    <span className="sm:ml-3">
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
                  <div className="flex items-center justify-center gap-1.5 sm:justify-end">
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

                      <div className="rounded-lg border border-dashed border-border px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setPasswordDialogOpen(true)}
                          className="text-sm font-medium text-[#1c5fa8] hover:underline"
                        >
                          Change Password
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
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                          <Button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="h-11 w-full rounded-full bg-[#1c5fa8] text-white hover:bg-[#0e305d] sm:w-auto"
                          >
                            <Plus className="h-4 w-4" /> Add property
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("properties")}
                            className="h-11 w-full rounded-full sm:w-auto"
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

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) resetPasswordForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a strong new password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitPasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="current-password"
                  className="pl-10 pr-10"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showCurrentPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  className="pl-10 pr-10"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  className="pl-10 pr-10"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={changingPassword}
                onClick={() => {
                  setPasswordDialogOpen(false);
                  resetPasswordForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changingPassword}
                className="rounded-lg bg-[#1c5fa8] text-white hover:bg-[#0e305d]"
              >
                {changingPassword ? "Changing…" : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add property — bottom sheet on mobile, dialog on desktop */}
      {isMobile ? (
        <Drawer
          open={addOpen}
          onOpenChange={(v) => {
            setAddOpen(v);
            if (!v) resetAddPropertyForm();
          }}
        >
          <DrawerContent className="bottom-[60px] z-50 mt-0 max-h-[calc(100dvh-5rem)] rounded-t-3xl flex flex-col gap-0 p-0">
            <div className="px-6 pt-2 pb-2 shrink-0">
              <DrawerTitle className="font-serif text-2xl">
                Add property
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Add a new property listing
              </DrawerDescription>
            </div>
            <div className="overflow-y-auto overflow-x-hidden px-6 pb-4 flex-1 space-y-6 min-h-0 min-w-0">
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
                fieldErrors={addFieldErrors}
                lockVideoChanges={propertyMutations.create.isPending}
              />
            </div>
            <div className="px-6 py-4 border-t border-border shrink-0 gap-3 flex flex-col">
              <PropertyUploadProgress
                active={
                  propertyMutations.create.isPending &&
                  addUploadProgress.trackingVideo
                }
                progress={addUploadProgress.progress}
              />
              <div className="flex w-full gap-2">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  submitting={propertyMutations.create.isPending}
                  idleLabel="Create Property"
                  messages={
                    addUploadProgress.trackingVideo
                      ? ["Uploading video…"]
                      : undefined
                  }
                  onClick={submitProp}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
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

            <div className="overflow-y-auto overflow-x-hidden px-6 pb-4 flex-1 space-y-6 min-h-0 min-w-0">
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
                fieldErrors={addFieldErrors}
                lockVideoChanges={propertyMutations.create.isPending}
              />
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-3 flex-col sm:flex-col">
              <PropertyUploadProgress
                active={
                  propertyMutations.create.isPending &&
                  addUploadProgress.trackingVideo
                }
                progress={addUploadProgress.progress}
              />
              <div className="flex w-full gap-2 sm:justify-end">
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
                  messages={
                    addUploadProgress.trackingVideo
                      ? ["Uploading video…"]
                      : undefined
                  }
                  onClick={submitProp}
                />
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit property — bottom sheet on mobile, dialog on desktop */}
      {isMobile ? (
        <Drawer
          open={!!editTarget}
          onOpenChange={(v) => {
            if (!v) {
              setEditTarget(null);
              resetEditPropertyForm();
            }
          }}
        >
          <DrawerContent className="bottom-[60px] z-50 mt-0 max-h-[calc(100dvh-5rem)] rounded-t-3xl flex flex-col gap-0 p-0">
            <div className="px-6 pt-2 pb-2 shrink-0">
              <DrawerTitle className="font-serif text-2xl">
                Edit property
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Edit your property listing
              </DrawerDescription>
            </div>
            <div className="overflow-y-auto overflow-x-hidden px-6 pb-4 flex-1 space-y-6 min-h-0 min-w-0">
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
                onDeleteExistingImage={requestDeleteExistingImage}
                onReplaceExistingImage={handleReplaceExistingImage}
                deletingImageIds={deletingImageIds}
                existingVideoUrl={editExistingVideo}
                onDeleteExistingVideo={handleDeleteExistingVideo}
                deletingVideo={deletingVideo}
                videoProcessingStatus={editTarget?.videoProcessingStatus}
                onRetryVideoProcessing={
                  editTarget?.videoProcessingStatus === "failed"
                    ? () => void handleRetryVideoProcessing(editTarget)
                    : undefined
                }
              retryingVideoProcessing={retryingVideoId === editTarget?.id}
              hideContact
              fieldErrors={editFieldErrors}
              lockVideoChanges={propertyMutations.update.isPending}
            />
            </div>
            <div className="px-6 py-4 border-t border-border shrink-0 flex flex-col gap-4">
              <PropertyUploadProgress
                active={
                  propertyMutations.update.isPending &&
                  editUploadProgress.trackingVideo
                }
                progress={editUploadProgress.progress}
              />
              <div className="flex gap-2 w-full">
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
                  className="flex-1"
                  submitting={propertyMutations.update.isPending}
                  idleLabel="Save changes"
                  messages={
                    editUploadProgress.trackingVideo
                      ? ["Uploading video…"]
                      : undefined
                  }
                  onClick={saveEdit}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
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
            <div className="overflow-y-auto overflow-x-hidden px-6 pb-4 flex-1 space-y-6 min-h-0 min-w-0">
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
                onDeleteExistingImage={requestDeleteExistingImage}
                onReplaceExistingImage={handleReplaceExistingImage}
                deletingImageIds={deletingImageIds}
                existingVideoUrl={editExistingVideo}
                onDeleteExistingVideo={handleDeleteExistingVideo}
                deletingVideo={deletingVideo}
                videoProcessingStatus={editTarget?.videoProcessingStatus}
                onRetryVideoProcessing={
                  editTarget?.videoProcessingStatus === "failed"
                    ? () => void handleRetryVideoProcessing(editTarget)
                    : undefined
                }
              retryingVideoProcessing={retryingVideoId === editTarget?.id}
              hideContact
              fieldErrors={editFieldErrors}
              lockVideoChanges={propertyMutations.update.isPending}
            />
            </div>
            <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-3 flex-col sm:flex-col">
              <PropertyUploadProgress
                active={
                  propertyMutations.update.isPending &&
                  editUploadProgress.trackingVideo
                }
                progress={editUploadProgress.progress}
              />
              <div className="flex gap-2 justify-end w-full">
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
                  messages={
                    editUploadProgress.trackingVideo
                      ? ["Uploading video…"]
                      : undefined
                  }
                  onClick={saveEdit}
                />
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete image confirmation */}
      <AlertDialog
        open={imageDeleteConfirmId != null}
        onOpenChange={(open) => {
          if (!open) setImageDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">
              Remove this image?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This image will be deleted from the property. You can add another
              image before saving if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteExistingImage()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
