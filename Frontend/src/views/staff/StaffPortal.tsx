"use client";

import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api/accounts";
import { getApiErrorField, getErrorMessage } from "@/lib/api/errors";
import { useQuery } from "@tanstack/react-query";
import {
  useMyProperties,
  usePropertyMutations,
} from "@/hooks/api/useProperties";
import {
  useAdminAds,
  useCatalogMutations,
  usePropertyTypes,
} from "@/hooks/api/useCatalog";
import {
  buildPropertyFormData,
  findPropertyTypeFlags,
  resolveFeatureIds,
  validatePropertyMedia,
} from "@/lib/api/propertyForm";
import type { Advertisement } from "@/data/advertisements";
import {
  ListingFormFields,
  emptyDraft,
  propertyToDraft,
  validateAndParseDraft,
  applyListingValidationError,
  type AddPropertyDraft,
  type ListingFieldErrors,
} from "@/components/PropertyListingForm";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdvertisementEditorForm } from "@/components/admin/AdvertisementEditorForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import type { Property } from "@/data/mockData";
import type { ApiStaffDashboard } from "@/lib/api/types";
import { toast } from "sonner";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { to: "/staff", label: "Dashboard", icon: LayoutDashboard, end: true, perm: null },
  {
    to: "/staff/properties",
    label: "Properties",
    icon: Building2,
    end: false,
    perm: "can_manage_properties" as const,
  },
  {
    to: "/staff/advertisements",
    label: "Advertisements",
    icon: Megaphone,
    end: false,
    perm: "can_manage_advertisements" as const,
  },
];

function StaffSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const perms = user?.permissions;

  const visible = navItems.filter((item) => {
    if (!item.perm) return true;
    return perms?.[item.perm] !== false;
  });

  return (
    <aside className="flex flex-col h-full w-64 border-r border-border bg-slate-950 text-slate-100">
      <div className="p-5 border-b border-slate-800">
        <Logo />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={async () => {
            await logout();
            navigate("/staff/login");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

function StaffTopNavbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex items-center border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6 h-14">
      <div className="flex w-10 shrink-0 items-center md:w-0 md:overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <h1 className="flex-1 text-center text-sm sm:text-base font-semibold tracking-wide text-foreground">
        Staff Portal
      </h1>
      <div className="flex min-w-10 shrink-0 items-center justify-end max-w-[40%]">
        <span className="truncate text-sm font-medium text-foreground" title={user?.name}>
          {user?.name}
        </span>
      </div>
    </header>
  );
}

function StaffDashboardSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["staffMeDashboard"],
    queryFn: () => accountsApi.staffMeDashboard(),
    staleTime: 0,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading dashboard…</p>;
  if (error) return <p className="text-destructive">{getErrorMessage(error)}</p>;

  const dash = data as ApiStaffDashboard;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your properties and advertisements.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">My properties</p>
          <p className="text-3xl font-semibold mt-1">{dash.properties_count}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">My advertisements</p>
          <p className="text-3xl font-semibold mt-1">{dash.advertisements_count}</p>
        </div>
      </div>
    </div>
  );
}

function StaffPropertiesSection() {
  const { user } = useAuth();
  const canManage = user?.permissions?.can_manage_properties !== false;
  const { data, refetch, isFetching } = useMyProperties(
    { page_size: 50 },
    { staleTime: 0 },
  );
  const mutations = usePropertyMutations();
  const { data: propertyTypesData } = usePropertyTypes();
  const properties = data?.items ?? [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [draft, setDraft] = useState<AddPropertyDraft>({ ...emptyDraft });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ListingFieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!canManage) {
    return <p className="text-muted-foreground">You do not have permission to manage properties.</p>;
  }

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setImageFiles([]);
    setVideoFile(null);
    setFieldErrors({});
    setOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setDraft(propertyToDraft(p));
    setImageFiles([]);
    setVideoFile(null);
    setFieldErrors({});
    setOpen(true);
  };

  const save = async () => {
    setFieldErrors({});
    const parsed = validateAndParseDraft(draft);
    if (!parsed.ok) {
      applyListingValidationError(setFieldErrors, parsed.message, parsed.field);
      return;
    }
    const mediaError = validatePropertyMedia({
      newImages: imageFiles.length,
      existingImages: editing?.images?.length ?? 0,
      hasVideo: !!(videoFile || editing?.videoUrl),
    });
    if (mediaError) {
      applyListingValidationError(setFieldErrors, mediaError, "uploaded_images");
      return;
    }
    setSaving(true);
    try {
      const typeId = propertyTypesData?.results?.find(
        (t) => t.name.toLowerCase() === draft.propertyCategory.toLowerCase(),
      )?.id;
      if (!typeId) {
        applyListingValidationError(
          setFieldErrors,
          "Please select a valid property type",
          "property_type",
        );
        return;
      }
      const form = buildPropertyFormData(draft, imageFiles, videoFile, {
        propertyTypeId: typeId,
        featureIds: resolveFeatureIds(draft),
        typeFlags: findPropertyTypeFlags(
          propertyTypesData?.results,
          draft.propertyCategory,
        ),
        mode: editing ? "update" : "create",
      });
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id, form });
        toast.success("Property updated");
      } else {
        const created = await mutations.create.mutateAsync(form);
        const pending =
          (created as { moderation_status?: string })?.moderation_status === "pending";
        toast.success(
          pending
            ? "Property created — awaiting admin approval"
            : "Property created and published",
        );
      }
      await refetch();
      setOpen(false);
    } catch (err) {
      const apiField = getApiErrorField(err);
      const message = getErrorMessage(err);
      if (apiField) applyListingValidationError(setFieldErrors, message, apiField);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mutations.remove.mutateAsync(deleteTarget.id);
      toast.success("Property deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My properties</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Properties you created. Other staff cannot see these listings.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add property
        </Button>
      </div>

      {isFetching && !properties.length ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No properties yet. Create your first listing.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Price</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{p.status || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{p.price ?? "—"}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit property" : "Add property"}
        className="max-w-3xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <ListingFormFields
            draft={draft}
            setDraft={setDraft}
            imageFiles={imageFiles}
            setImageFiles={setImageFiles}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            imageInputRef={imageInputRef}
            videoInputRef={videoInputRef}
            existingImages={editing?.images ?? []}
            existingVideoUrl={editing?.videoUrl}
            fieldErrors={fieldErrors}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete property"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Delete &ldquo;{deleteTarget?.title}&rdquo;? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}

function StaffAdsSection() {
  const { user } = useAuth();
  const canManage = user?.permissions?.can_manage_advertisements !== false;
  const { data, refetch, isFetching } = useAdminAds(
    { page_size: 50, ordering: "newest" },
    { staleTime: 0 },
  );
  const catalogMutations = useCatalogMutations();
  const ads = data?.items ?? [];

  const [open, setOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null);

  if (!canManage) {
    return (
      <p className="text-muted-foreground">You do not have permission to manage advertisements.</p>
    );
  }

  const openCreate = () => {
    setEditingAd(null);
    setOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await catalogMutations.deleteAd.mutateAsync(Number(deleteTarget.id));
      toast.success("Advertisement deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAdSaved = async () => {
    await refetch();
    setOpen(false);
    setEditingAd(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My advertisements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ads you created. Scoped to your account only.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add advertisement
        </Button>
      </div>

      {isFetching && !ads.length ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : ads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No advertisements yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{ad.title}</td>
                  <td className="px-4 py-3 hidden sm:table-cell capitalize">{ad.adType}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {ad.active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(ad)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(ad)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title={editingAd ? "Edit advertisement" : "Add advertisement"}
        className="max-w-2xl max-h-[90vh]"
      >
        <AdvertisementEditorForm
          mode="staff"
          editingId={editingAd?.id ?? null}
          initialAd={editingAd ?? undefined}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            void handleAdSaved();
          }}
        />
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete advertisement"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Delete &ldquo;{deleteTarget?.title}&rdquo;?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}

const StaffPortal = () => {
  const { user, hydrated, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || user.role !== "staff") navigate("/staff/login");
  }, [hydrated, user, navigate]);

  // Pick up permission changes made by admin without requiring re-login.
  useEffect(() => {
    if (!hydrated || !user || user.role !== "staff") return;
    void refreshProfile();
  }, [hydrated, user?.id, refreshProfile]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!hydrated) return null;
  if (!user || user.role !== "staff") return null;

  const current = pathname.replace(/\/+$/, "");
  const section =
    current === "/staff"
      ? "dashboard"
      : current.split("/").filter(Boolean)[1] || "dashboard";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <div className="hidden md:block sticky top-0 h-screen">
        <StaffSidebar />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Staff navigation</SheetTitle>
          <StaffSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 min-w-0 flex flex-col">
        <StaffTopNavbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-10">
          {section === "properties" && <StaffPropertiesSection />}
          {section === "advertisements" && <StaffAdsSection />}
          {(section === "dashboard" || section === undefined) && <StaffDashboardSection />}
        </main>
      </div>
    </div>
  );
};

export default StaffPortal;
