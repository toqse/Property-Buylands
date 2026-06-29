"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { NavLink, useLocation, useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { AdminModal } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/button";
import { SubmitProgressButton } from "@/components/SubmitProgressButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type Property,
  type PropertyStatus,
  type Enquiry,
  type AppUser,
} from "@/data/mockData";
import {
  emptyAd,
  type Advertisement,
  type AdType,
  type AdMediaType,
  type AdRedirectType,
} from "@/data/advertisements";
import {
  usePropertyList,
  usePropertyMutations,
} from "@/hooks/api/useProperties";
import {
  useOwners,
  useContacts,
  usePropertyTypes,
  useAdminPropertyTypesPaged,
  useFeatures,
  useFeaturesPaged,
  useStates,
  useStatesPaged,
  useDistricts,
  useDistrictsPaged,
  useCities,
  useAllDistricts,
  useAllCities,
  useAdminAds,
  useAdminTestimonials,
  useSiteSettings,
  useMobileAppSettings,
  useHeroBanners,
  useOfferBanners,
  useCatalogMutations,
} from "@/hooks/api/useCatalog";
import {
  buildTestimonialFormData,
  type UiTestimonial,
} from "@/lib/api/mappers/testimonial";
import type {
  ApiPropertyType,
  ApiFeature,
  ApiState,
  ApiDistrict,
  ApiCity,
  ApiOwner,
} from "@/lib/api/types";
import {
  buildPropertyFormData,
  resolveFeatureIds,
  validatePropertyImages,
  validatePropertyMedia,
  findPropertyTypeFlags,
  appendPropertyTypeFlagsToFormData,
  flagsFromPropertyType,
  DEFAULT_PROPERTY_TYPE_FLAGS,
  type PropertyTypeFeatureFlags,
} from "@/lib/api/propertyForm";
import { buildAdFormData } from "@/lib/api/advertisementForm";
import { getApiErrorField, getErrorMessage } from "@/lib/api/errors";
import { contentApi } from "@/lib/api/content";
import { catalogApi } from "@/lib/api/catalog";
import { mapApiAdToUi } from "@/lib/api/mappers/advertisement";
import { mapApiOwnerToAppUser } from "@/lib/api/mappers/owner";
import type { ApiAdvertisement } from "@/lib/api/types";
import {
  LayoutDashboard,
  Building2,
  Users,
  Tag,
  Image as ImageIcon,
  Settings,
  LogOut,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Plus,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Star,
  Upload,
  MapPin,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone as PhoneIcon,
  Reply,
  Search,
  Store,
  Map as MapIcon,
  Home as HomeIcon,
  Landmark,
  Menu,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  videoProcessingStatusLabel,
  videoProcessingStatusTone,
} from "@/lib/videoProcessingStatus";
import {
  ListingFormFields,
  emptyDraft,
  propertyToDraft,
  validateAndParseDraft,
  buildPropertyFromValidatedDraft,
  scrollToListingField,
  type AddPropertyDraft,
} from "@/components/PropertyListingForm";
import { OsmPlaceSearch } from "@/components/ui/osm-place-search";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type LeafNavItem = {
  to: string;
  icon?: IconType;
  label: string;
  end?: boolean;
};

type GroupNavItem = {
  label: string;
  icon: IconType;
  /** Path prefix used to mark the parent active and auto-expand the group. */
  basePath: string;
  children: LeafNavItem[];
};

type NavEntry = LeafNavItem | GroupNavItem;

const navItems: NavEntry[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/properties", icon: Building2, label: "Properties" },
  { to: "/admin/approvals", icon: CheckCircle2, label: "Approvals" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/categories", icon: Tag, label: "Categories" },
  { to: "/admin/banners", icon: ImageIcon, label: "Banners" },
  { to: "/admin/testimonials", icon: Star, label: "Testimonials" },
  {
    label: "Location Management",
    icon: MapIcon,
    basePath: "/admin/locations",
    children: [
      { to: "/admin/locations/states", icon: Landmark, label: "Add State" },
      { to: "/admin/locations/districts", icon: MapPin, label: "Add District" },
    ],
  },
  { to: "/admin/enquiry", icon: MessageSquare, label: "Enquiry" },
  { to: "/admin/advertisements", icon: Megaphone, label: "Advertisements" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

function isGroup(item: NavEntry): item is GroupNavItem {
  return "children" in item;
}

/** Shared pagination footer used by all admin tables/lists. */
type PaginationFooterProps = {
  page: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

const PaginationFooter = ({
  page,
  total,
  pageSize,
  onPrev,
  onNext,
  className,
}: PaginationFooterProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div
      className={cn(
        "flex items-center justify-between mt-4 text-sm text-muted-foreground flex-wrap gap-3",
        className,
      )}
    >
      <div>
        Page {Math.min(page, totalPages)} of {totalPages} · {total} total
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

/** Convenience hook that returns page state, derived bounds, and helpers. */
function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const reset = () => setPage(1);
  return {
    page: safePage,
    setPage,
    totalPages,
    paginated,
    goPrev,
    goNext,
    reset,
  };
}

/** Reusable confirmation dialog shown before destructive actions. */
type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

const ConfirmDeleteDialog = ({
  open,
  onOpenChange,
  title = "Delete this item?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmDeleteDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">{title}</DialogTitle>
      </DialogHeader>
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button
          variant="destructive"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/** Captures a pending destructive action plus a friendly label for the dialog. */
type PendingDelete = { label: string; action: () => void } | null;

type SidebarBodyProps = {
  onNavigate?: () => void;
  showInlineSignOut?: boolean;
};

const SidebarBody = ({
  onNavigate,
  showInlineSignOut = false,
}: SidebarBodyProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auto-expand the group whose basePath matches the current route.
  const initialOpenGroups = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const item of navItems) {
      if (
        isGroup(item) &&
        (pathname === item.basePath || pathname.startsWith(`${item.basePath}/`))
      ) {
        open[item.label] = true;
      }
    }
    return open;
  }, [pathname]);
  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>(initialOpenGroups);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  const handleSignOut = () => {
    onNavigate?.();
    logout();
    navigate("/");
  };

  return (
    <>
      <Logo variant="light" />
      <nav className="mt-8 md:mt-10 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          if (isGroup(item)) {
            const isParentActive =
              pathname === item.basePath ||
              pathname.startsWith(`${item.basePath}/`);
            const expanded = openGroups[item.label] ?? isParentActive;
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  aria-expanded={expanded}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                    isParentActive
                      ? "bg-background/10 text-background font-semibold"
                      : "text-background/80 hover:bg-background/5 hover:text-background",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  ) : (
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  )}
                </button>
                {expanded && (
                  <div className="mt-1 ml-3 space-y-1 border-l border-background/10 pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md text-[13px] transition-all",
                              isActive
                                ? "bg-background/10 text-background font-medium"
                                : "text-background/70 hover:bg-background/5 hover:text-background",
                            )
                          }
                        >
                          {ChildIcon ? <ChildIcon className="h-4 w-4" /> : null}
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-background/10 text-background font-semibold"
                    : "text-background/80 hover:bg-background/5 hover:text-background",
                )
              }
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {item.label}
            </NavLink>
          );
        })}
        {showInlineSignOut && (
          <Button
            variant="ghost"
            className="mt-3 w-full justify-start border-t border-background/10 rounded-none px-4 pt-5 text-background/80 hover:bg-background/5 hover:text-background"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        )}
      </nav>
      {!showInlineSignOut && (
        <Button
          variant="ghost"
          className="text-background/80 hover:bg-background/5 hover:text-background justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      )}
    </>
  );
};

const Sidebar = () => {
  return (
    <aside className="hidden md:flex w-64 bg-[#05070a] text-background min-h-screen p-6 flex-col sticky top-0">
      <SidebarBody />
    </aside>
  );
};

type MobileTopBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MobileTopBar = ({ open, onOpenChange }: MobileTopBarProps) => (
  <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#05070a] text-background px-4 py-3 border-b border-white/5">
    <Logo variant="light" imgClassName="h-9 brightness-0 invert" />
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-background hover:bg-white/10"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 max-w-[85vw] bg-[#05070a] text-background border-r border-white/10 p-6 flex flex-col"
      >
        <SidebarBody onNavigate={() => onOpenChange(false)} showInlineSignOut />
      </SheetContent>
    </Sheet>
  </header>
);

const Overview = () => {
  const { data: allProps } = usePropertyList(
    { moderationStatus: "all", includeAds: false, pageSize: 1 },
    { auth: true },
  );
  const { data: pendingProps } = usePropertyList(
    { moderationStatus: "pending", includeAds: false, pageSize: 1 },
    { auth: true },
  );
  const { data: ownersPage } = useOwners({ page_size: 1 });
  const { data: contactsPage } = useContacts({ page_size: 5 });
  const { data: recentPage } = usePropertyList(
    { moderationStatus: "all", includeAds: false, pageSize: 4 },
    { auth: true },
  );
  const recentList = (recentPage?.items ?? [])
    .filter((x) => x.kind === "property")
    .map((x) => x.property);
  const enquiries = contactsPage?.items ?? [];
  const [viewTarget, setViewTarget] = useState<Property | null>(null);

  if (viewTarget) {
    return (
      <PropertyDetailView
        property={viewTarget}
        onBack={() => setViewTarget(null)}
      />
    );
  }

  const stats = [
    { i: Building2, l: "Total Listings", v: allProps?.count ?? 0, c: "" },
    { i: Users, l: "Registered Users", v: ownersPage?.count ?? 0, c: "" },
    {
      i: MessageSquare,
      l: "New Enquiries",
      v: enquiries.filter((e) => e.status === "New").length,
      c: "",
    },
    {
      i: DollarSign,
      l: "Pending Approvals",
      v: pendingProps?.count ?? 0,
      c: "",
    },
  ];
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6 md:mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">Overview</h1>
        <NavLink
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          Go to website
        </NavLink>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 md:mb-10">
        {stats.map((s, i) => (
          <div
            key={s.l}
            className="p-4 sm:p-6 rounded-2xl bg-card border border-border hover-lift animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex justify-between">
              <s.i className="h-5 w-5 text-gold" />
              {s.c && (
                <span className="text-[11px] sm:text-xs text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {s.c}
                </span>
              )}
            </div>
            <div className="font-serif text-2xl sm:text-3xl mt-3">{s.v}</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Recent listings</h2>
          <div className="space-y-3">
            {recentList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setViewTarget(p)}
                className="flex w-full items-center gap-3 p-3 rounded-lg text-left hover:bg-muted transition-colors"
              >
                <img
                  src={p.image}
                  className="h-12 w-16 object-cover rounded"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.ownerName}
                  </div>
                </div>
                <Badge
                  variant={p.status === "Approved" ? "default" : "secondary"}
                >
                  {p.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Latest enquiries</h2>
          <div className="space-y-3">
            {enquiries.map((e) => (
              <div key={e.id} className="p-3 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{e.fromName}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.propertyTitle}
                    </div>
                  </div>
                  <Badge variant={e.status === "New" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                </div>
                <p className="text-sm text-foreground/70 mt-2 line-clamp-2">
                  {e.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

type PropertyDetailViewProps = {
  property: Property;
  onBack: () => void;
};

const PropertyDetailView = ({ property, onBack }: PropertyDetailViewProps) => {
  const fmt = (n: number) => n.toLocaleString("en-IN");
  const galleryImages =
    property.gallery && property.gallery.length
      ? property.gallery
      : property.image
        ? [property.image]
        : [];
  const addressParts = [
    property.location,
    property.city,
    property.district,
    property.state,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  const address = Array.from(new Set(addressParts)).join(", ");

  const detailRows: { label: string; value: ReactNode }[] = [
    { label: "Listing type", value: property.type },
    { label: "Category", value: property.category },
    {
      label: "Price",
      value: `₹${fmt(property.price)}${property.priceUnit ? ` ${property.priceUnit}` : ""}`,
    },
    {
      label: "Area",
      value: property.areaCent
        ? `${fmt(property.area)} sq.ft / ${fmt(Number(property.areaCent) || 0)} cent`
        : `${fmt(property.area)} ${property.areaUnit === "cents" ? "cent" : "sq.ft"}`,
    },
    ...(property.bedrooms
      ? [{ label: "Bedrooms", value: String(property.bedrooms) }]
      : []),
    ...(property.bathrooms
      ? [{ label: "Bathrooms", value: String(property.bathrooms) }]
      : []),
    ...(property.furnishing
      ? [{ label: "Furnishing", value: property.furnishing }]
      : []),
    ...(property.parkingSpaces
      ? [{ label: "Parking", value: property.parkingSpaces }]
      : []),
    ...(property.projectStatus
      ? [{ label: "Project status", value: property.projectStatus }]
      : []),
    ...(property.floors ? [{ label: "Floors", value: property.floors }] : []),
    ...(property.sighting
      ? [{ label: "Sighting", value: property.sighting }]
      : []),
    ...(property.ownership
      ? [{ label: "Ownership", value: property.ownership }]
      : []),
    { label: "Featured", value: property.featured ? "Yes" : "No" },
    ...(property.createdAt
      ? [{ label: "Listed on", value: property.createdAt }]
      : []),
  ];

  return (
    <div className="animate-fade-in max-w-3xl">
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        className="rounded-full bg-card shadow-sm hover:bg-muted/60"
      >
        Back to properties
      </Button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">{property.title}</h1>
          <div className="text-gold-gradient font-semibold text-base md:text-lg mt-1">
            ₹{fmt(property.price)}
            {property.priceUnit ? (
              <span className="ml-1">{property.priceUnit}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={property.status === "Approved" ? "default" : "secondary"}
          >
            {property.status}
          </Badge>
          {property.featured ? (
            <Badge variant="secondary">Featured</Badge>
          ) : null}
        </div>
      </div>

      {address ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-gold" />
          {address}
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl overflow-hidden bg-muted border border-border">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-64 md:h-80 object-cover"
        />
      </div>

      {galleryImages.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {galleryImages.map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src}
              alt={`${property.title} ${i + 1}`}
              className="h-16 w-full rounded-lg object-cover border border-border"
            />
          ))}
        </div>
      ) : null}

      {property.videoUrl ? (
        <div className="mt-4">
          <div className="text-sm font-semibold text-foreground mb-2">
            Property video
          </div>
          {property.videoProcessingStatus &&
          videoProcessingStatusLabel(property.videoProcessingStatus) ? (
            <p
              className={cn(
                "mb-2 text-sm",
                videoProcessingStatusTone(property.videoProcessingStatus) ===
                  "warning" && "text-amber-600",
                videoProcessingStatusTone(property.videoProcessingStatus) ===
                  "success" && "text-emerald-600",
                videoProcessingStatusTone(property.videoProcessingStatus) ===
                  "destructive" && "text-destructive",
              )}
            >
              {videoProcessingStatusLabel(property.videoProcessingStatus)}
            </p>
          ) : null}
          <video
            src={property.videoUrl}
            poster={property.videoThumbnail || property.image}
            controls
            playsInline
            className="w-full rounded-xl border border-border bg-black"
          />
        </div>
      ) : null}

      <div className="mt-6 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-foreground mb-3">
          Property details
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          {detailRows.map((row) => (
            <div key={row.label}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {row.label}
              </dt>
              <dd className="text-sm text-foreground/90 mt-0.5 break-words">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-foreground mb-3">
          Owner / contact
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold text-foreground">Name:</span>{" "}
            <span className="text-foreground/80">
              {property.ownerName || "—"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-foreground">Phone:</span>{" "}
            {property.ownerPhone ? (
              <a
                href={`tel:${property.ownerPhone}`}
                className="text-gold hover:underline"
              >
                {property.ownerPhone}
              </a>
            ) : (
              <span className="text-foreground/80">—</span>
            )}
          </div>
          <div>
            <span className="font-semibold text-foreground">Email:</span>{" "}
            {property.ownerEmail ? (
              <a
                href={`mailto:${property.ownerEmail}`}
                className="text-gold hover:underline"
              >
                {property.ownerEmail}
              </a>
            ) : (
              <span className="text-foreground/80">—</span>
            )}
          </div>
          {property.contactWhatsApp ? (
            <div>
              <span className="font-semibold text-foreground">WhatsApp:</span>{" "}
              <span className="text-foreground/80">
                {property.contactWhatsApp}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {property.features && property.features.length ? (
        <div className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-foreground mb-3">
            Features &amp; amenities
          </div>
          <div className="flex flex-wrap gap-2">
            {property.features.map((f) => (
              <Badge key={f} variant="secondary">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {property.nearbyPlaces && property.nearbyPlaces.length ? (
        <div className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-semibold text-foreground mb-3">
            Nearby places
          </div>
          <ul className="space-y-1 text-sm text-foreground/80">
            {property.nearbyPlaces.map((np, i) => (
              <li
                key={`${np.name}-${i}`}
                className="flex justify-between gap-3"
              >
                <span>{np.name}</span>
                <span className="text-muted-foreground">
                  {np.distanceKm} km
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {property.googleMapUrl ||
      property.youtubeUrl ||
      property.lat ||
      property.lng ? (
        <div className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2 text-sm">
          <div className="text-sm font-semibold text-foreground mb-1">
            Location &amp; links
          </div>
          {property.lat || property.lng ? (
            <div className="text-foreground/80">
              Coordinates: {property.lat}, {property.lng}
            </div>
          ) : null}
          {property.googleMapUrl ? (
            <div>
              <a
                href={property.googleMapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gold hover:underline"
              >
                Open in Google Maps
              </a>
            </div>
          ) : null}
          {property.youtubeUrl ? (
            <div>
              <a
                href={property.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gold hover:underline"
              >
                YouTube video
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-foreground mb-1">
          Description
        </div>
        {property.description ? (
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
            {property.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No description provided.
          </p>
        )}
      </div>
    </div>
  );
};

const PropertiesAdmin = () => {
  const { data: listData, refetch } = usePropertyList(
    {
      moderationStatus: "all",
      includeAds: false,
      pageSize: 100,
    },
    { auth: true },
  );
  const propertyMutations = usePropertyMutations();
  const list = useMemo(
    () =>
      (listData?.items ?? [])
        .filter((x) => x.kind === "property")
        .map((x) => x.property),
    [listData],
  );
  const fallbackImage = list[0]?.image ?? "";

  // Add dialog state — uses the shared listing form (same fields as user dashboard)
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddPropertyDraft>(emptyDraft);
  const [addImageFiles, setAddImageFiles] = useState<File[]>([]);
  const [addVideoFile, setAddVideoFile] = useState<File | null>(null);
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const addVideoInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [editDraft, setEditDraft] = useState<AddPropertyDraft>(emptyDraft);
  const [editStatus, setEditStatus] = useState<PropertyStatus>("Pending");
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
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
  const [viewTarget, setViewTarget] = useState<Property | null>(null);

  const { data: propertyTypesData } = usePropertyTypes();

  const [featuredPendingId, setFeaturedPendingId] = useState<string | null>(
    null,
  );
  const toggleFeatured = async (p: Property) => {
    setFeaturedPendingId(p.id);
    const form = new FormData();
    form.append("is_featured", String(!p.featured));
    try {
      await propertyMutations.update.mutateAsync({ id: p.id, form });
      await refetch();
      toast.success(
        p.featured ? "Removed from featured" : "Marked as featured",
      );
    } catch {
      toast.error("Could not update featured status");
    } finally {
      setFeaturedPendingId(null);
    }
  };

  const resetAdd = () => {
    setAddDraft(emptyDraft);
    setAddImageFiles([]);
    setAddVideoFile(null);
    if (addImageInputRef.current) addImageInputRef.current.value = "";
    if (addVideoInputRef.current) addVideoInputRef.current.value = "";
  };
  const resetEdit = () => {
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

  const submitAdd = async () => {
    const parsed = validateAndParseDraft(addDraft);
    if (!parsed.ok) {
      toast.error(parsed.message);
      scrollToListingField(parsed.field);
      return;
    }
    const imageError = validatePropertyImages({
      newImages: addImageFiles.length,
    });
    if (imageError) {
      toast.error(imageError);
      return;
    }
    const mediaError = validatePropertyMedia({
      newImages: addImageFiles.length,
      hasVideo: !!addVideoFile || !!addDraft.youtubeLink.trim(),
    });
    if (mediaError) {
      toast.error(mediaError);
      return;
    }
    try {
      const typeId = propertyTypesData?.results?.find(
        (t) => t.name.toLowerCase() === addDraft.propertyCategory.toLowerCase(),
      )?.id;
      if (!typeId) {
        toast.error("Please select a valid property type");
        return;
      }
      const fd = buildPropertyFormData(addDraft, addImageFiles, addVideoFile, {
        propertyTypeId: typeId,
        featureIds: resolveFeatureIds(addDraft),
        typeFlags: findPropertyTypeFlags(
          propertyTypesData?.results,
          addDraft.propertyCategory,
        ),
      });
      await propertyMutations.create.mutateAsync(fd);
      toast.success("Property added");
      setAddOpen(false);
      resetAdd();
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

  const submitEdit = async () => {
    if (!editTarget) return;
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
    const mediaError = validatePropertyMedia({
      newImages: editImageFiles.length,
      existingImages: editExistingImages.length,
      hasVideo:
        !!editVideoFile || !!editExistingVideo || !!editDraft.youtubeLink.trim(),
    });
    if (mediaError) {
      toast.error(mediaError);
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
          typeFlags: findPropertyTypeFlags(
            propertyTypesData?.results,
            editDraft.propertyCategory,
          ),
          mode: "update",
        },
      );
      await propertyMutations.update.mutateAsync({
        id: editTarget.id,
        form: fd,
      });
      toast.success(`“${editDraft.title.trim()}” updated`);
      setEditTarget(null);
      resetEdit();
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

  const propertiesPager = usePagination(list, 10);

  if (viewTarget) {
    return (
      <PropertyDetailView
        property={viewTarget}
        onBack={() => setViewTarget(null)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">All Properties</h1>
        <Button
          variant="luxe"
          onClick={() => setAddOpen(true)}
          className="self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add property
        </Button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Mobile: stacked cards (the table is too wide for small screens) */}
        <div className="md:hidden divide-y divide-border">
          {propertiesPager.paginated.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No properties yet.
            </div>
          ) : (
            propertiesPager.paginated.map((p) => (
              <div key={p.id} className="p-3">
                <div className="flex gap-3">
                  <img
                    src={p.image}
                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">
                      {p.location}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        Owner:
                      </span>{" "}
                      {p.ownerName}
                    </div>
                    <div className="text-gold-gradient mt-1 text-sm font-semibold">
                      ₹{p.price.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge
                      variant={
                        p.status === "Approved" ? "default" : "secondary"
                      }
                    >
                      {p.status}
                    </Badge>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={!!p.featured}
                        disabled={featuredPendingId === p.id}
                        onCheckedChange={() => toggleFeatured(p)}
                      />
                      Featured
                    </label>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewTarget(p)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(p)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-4">Property</th>
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Featured</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {propertiesPager.paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-muted-foreground"
                  >
                    No properties yet.
                  </td>
                </tr>
              ) : (
                propertiesPager.paginated.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          className="h-12 w-16 object-cover rounded"
                          alt=""
                        />
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{p.ownerName}</td>
                    <td className="p-4 text-gold-gradient">
                      ₹{p.price.toLocaleString("en-US")}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          p.status === "Approved" ? "default" : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Switch
                        checked={!!p.featured}
                        disabled={featuredPendingId === p.id}
                        onCheckedChange={() => toggleFeatured(p)}
                      />
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewTarget(p)}
                        title="View"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(p)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <PaginationFooter
        page={propertiesPager.page}
        total={list.length}
        pageSize={10}
        onPrev={propertiesPager.goPrev}
        onNext={propertiesPager.goNext}
      />

      {/* Add property — same comprehensive fields as the user dashboard */}
      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) resetAdd();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="font-serif text-2xl">
              Add property
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-4 flex-1 space-y-6 min-h-0">
            <ListingFormFields
              draft={addDraft}
              setDraft={setAddDraft}
              imageFiles={addImageFiles}
              setImageFiles={setAddImageFiles}
              videoFile={addVideoFile}
              setVideoFile={setAddVideoFile}
              imageInputRef={addImageInputRef}
              videoInputRef={addVideoInputRef}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2 sm:justify-end">
            <div className="flex gap-2 justify-end w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={propertyMutations.create.isPending}
                onClick={() => {
                  setAddOpen(false);
                  resetAdd();
                }}
              >
                Cancel
              </Button>
              <SubmitProgressButton
                type="button"
                variant="luxe"
                submitting={propertyMutations.create.isPending}
                idleLabel="Create property"
                onClick={submitAdd}
              />
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit property — same shared fields */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) {
            setEditTarget(null);
            resetEdit();
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
            {/* Listing administration — status pinned at the top, matches admin "edit" UX */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground">
                Listing administration
              </h3>
              <div className="space-y-2 w-full sm:max-w-xs">
                <Label>Status</Label>
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
            </div>

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
              videoProcessingStatus={editTarget?.videoProcessingStatus}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={propertyMutations.update.isPending}
              onClick={() => {
                setEditTarget(null);
                resetEdit();
              }}
            >
              Cancel
            </Button>
            <SubmitProgressButton
              type="button"
              variant="luxe"
              submitting={propertyMutations.update.isPending}
              idleLabel="Save changes"
              onClick={submitEdit}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Delete this property?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove{" "}
            <span className="font-medium text-foreground">
              “{deleteTarget?.title}”
            </span>{" "}
            from the catalog. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Approvals = () => {
  const { data, refetch } = usePropertyList(
    {
      moderationStatus: "pending",
      includeAds: false,
      pageSize: 50,
    },
    { auth: true },
  );
  const { approve, reject } = usePropertyMutations();
  const pending = useMemo(
    () =>
      (data?.items ?? [])
        .filter((x) => x.kind === "property")
        .map((x) => x.property),
    [data],
  );
  const act = async (id: string, status: "Approved" | "Rejected") => {
    try {
      if (status === "Approved") await approve.mutateAsync(id);
      else await reject.mutateAsync({ id });
      toast.success(`Property ${status.toLowerCase()}`);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  return (
    <div className="animate-fade-in">
      <h1 className="font-serif text-3xl md:text-4xl mb-6 md:mb-8">
        Approval Queue
      </h1>
      {pending.length === 0 ? (
        <div className="bg-card border border-dashed rounded-2xl p-16 text-center text-muted-foreground">
          All caught up — no pending properties.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {pending.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover-lift"
            >
              <img src={p.image} alt="" className="h-48 w-full object-cover" />
              <div className="p-5">
                <h3 className="font-serif text-xl">{p.title}</h3>
                <div className="text-sm text-muted-foreground">
                  {p.location} · ₹{p.price.toLocaleString("en-US")}
                </div>
                <p className="text-sm mt-2 line-clamp-2">{p.description}</p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="luxe"
                    size="sm"
                    onClick={() => act(p.id, "Approved")}
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => act(p.id, "Rejected")}
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type OwnerEditForm = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  isActive: boolean;
  newPassword: string;
  newPassword2: string;
};

function ownerToEditForm(owner: ApiOwner, fallback: AppUser): OwnerEditForm {
  return {
    id: owner.id,
    fullName:
      [owner.first_name, owner.last_name].filter(Boolean).join(" ").trim() ||
      fallback.name,
    email: owner.email || fallback.email,
    phone: owner.phone || fallback.phone || "",
    whatsappNumber: owner.whatsapp_number || "",
    address: owner.address || "",
    isActive: owner.is_active ?? fallback.active,
    newPassword: "",
    newPassword2: "",
  };
}

type OwnerViewDetail = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  isActive: boolean;
  joinedAt: string;
  propertyCount: number;
};

function ownerToViewDetail(
  owner: ApiOwner | undefined,
  fallback: AppUser,
): OwnerViewDetail {
  return {
    id: owner?.id ?? Number(fallback.id),
    fullName: owner
      ? [owner.first_name, owner.last_name].filter(Boolean).join(" ").trim() ||
        fallback.name
      : fallback.name,
    email: owner?.email ?? fallback.email,
    phone: owner?.phone || fallback.phone || "",
    whatsappNumber: owner?.whatsapp_number || "",
    address: owner?.address || "",
    isActive: owner?.is_active ?? fallback.active,
    joinedAt: owner?.date_joined?.slice(0, 10) || fallback.joinedAt,
    propertyCount:
      owner?.property_count ?? owner?.properties_count ?? fallback.propertyCount,
  };
}

const UsersAdmin = () => {
  const { data: ownersData, refetch } = useOwners({ page_size: 100 });
  const catalogMutations = useCatalogMutations();
  const users = useMemo(
    () => (ownersData?.results ?? []).map((o) => mapApiOwnerToAppUser(o)),
    [ownersData],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [viewingOwner, setViewingOwner] = useState<AppUser | null>(null);
  const [editingOwner, setEditingOwner] = useState<OwnerEditForm | null>(null);
  const pageSize = 10;

  const viewingDetail = useMemo(() => {
    if (!viewingOwner) return null;
    const owner = (ownersData?.results ?? []).find(
      (o) => String(o.id) === viewingOwner.id,
    );
    return ownerToViewDetail(owner, viewingOwner);
  }, [viewingOwner, ownersData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const toggleStatus = async (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    try {
      await catalogMutations.patchOwner.mutateAsync({
        id: Number(id),
        body: { is_active: !u.active },
      });
      toast.success("Owner status updated");
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeOwner = async (id: string) => {
    try {
      await catalogMutations.deleteOwner.mutateAsync(Number(id));
      toast.success("Owner removed");
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openViewOwner = (u: AppUser) => {
    setViewingOwner(u);
  };

  const openEditOwner = (u: AppUser) => {
    const owner = (ownersData?.results ?? []).find((o) => String(o.id) === u.id);
    setEditingOwner(
      owner
        ? ownerToEditForm(owner, u)
        : {
            id: Number(u.id),
            fullName: u.name,
            email: u.email,
            phone: u.phone,
            whatsappNumber: "",
            address: "",
            isActive: u.active,
            newPassword: "",
            newPassword2: "",
          },
    );
  };

  const saveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOwner) return;
    if (
      editingOwner.newPassword &&
      editingOwner.newPassword !== editingOwner.newPassword2
    ) {
      toast.error("Password fields don't match");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        full_name: editingOwner.fullName.trim(),
        email: editingOwner.email.trim(),
        phone: editingOwner.phone.trim(),
        whatsapp_number: editingOwner.whatsappNumber.trim(),
        address: editingOwner.address.trim(),
        is_active: editingOwner.isActive,
      };
      if (editingOwner.newPassword) {
        body.new_password = editingOwner.newPassword;
        body.new_password2 = editingOwner.newPassword2;
      }
      await catalogMutations.patchOwner.mutateAsync({
        id: editingOwner.id,
        body,
      });
      toast.success("Owner updated");
      setEditingOwner(null);
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="font-serif text-3xl md:text-4xl">Property Owners</h1>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, phone…"
            className="pl-9 rounded-full bg-card"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Owner</th>
                <th className="text-left p-4 font-medium">Phone</th>
                <th className="text-left p-4 font-medium">Joined</th>
                <th className="text-left p-4 font-medium">Properties</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-muted-foreground"
                  >
                    No owners match your search.
                  </td>
                </tr>
              ) : (
                paginated.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-sky-400 grid place-items-center text-white font-semibold text-sm shrink-0">
                          {u.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-foreground/80 whitespace-nowrap">
                      {u.phone}
                    </td>
                    <td className="p-4 text-foreground/80 whitespace-nowrap">
                      {formatDate(u.joinedAt)}
                    </td>
                    <td className="p-4 text-foreground/80">
                      {u.propertyCount}
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(u.id)}
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          u.active
                            ? "bg-[hsl(30_14%_10%)] text-white hover:bg-[hsl(30_14%_18%)]"
                            : "bg-muted text-foreground/70 hover:bg-muted/80",
                        )}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="View"
                          onClick={() => openViewOwner(u)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit"
                          onClick={() => openEditOwner(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete"
                          onClick={() =>
                            setPendingDelete({
                              label: u.name,
                              action: () => removeOwner(u.id),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground flex-wrap gap-3">
        <div>
          Page {safePage} · {filtered.length} total
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <AdminModal
        open={!!viewingOwner}
        onClose={() => setViewingOwner(null)}
        title={viewingDetail?.fullName ?? "Property owner"}
      >
        {viewingDetail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="h-12 w-12 rounded-full bg-sky-400 grid place-items-center text-white font-semibold text-lg shrink-0">
                {viewingDetail.fullName[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{viewingDetail.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {viewingDetail.email}
                </div>
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                      viewingDetail.isActive
                        ? "bg-[hsl(30_14%_10%)] text-white"
                        : "bg-muted text-foreground/70",
                    )}
                  >
                    {viewingDetail.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Email
                </div>
                <div className="mt-1 inline-flex items-center gap-1 break-all">
                  <Mail className="h-3 w-3 shrink-0" />
                  {viewingDetail.email || "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Phone
                </div>
                <div className="mt-1 inline-flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3 shrink-0" />
                  {viewingDetail.phone || "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  WhatsApp
                </div>
                <div className="mt-1">{viewingDetail.whatsappNumber || "—"}</div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Joined
                </div>
                <div className="mt-1">{formatDate(viewingDetail.joinedAt)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Address
              </div>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                {viewingDetail.address || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Properties listed
              </div>
              <div className="mt-1 text-lg font-medium tabular-nums">
                {viewingDetail.propertyCount}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingOwner(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="luxe"
                onClick={() => {
                  const user = viewingOwner;
                  setViewingOwner(null);
                  if (user) openEditOwner(user);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit owner
              </Button>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={!!editingOwner}
        onClose={() => setEditingOwner(null)}
        title="Edit property owner"
      >
        {editingOwner && (
          <form onSubmit={saveOwner} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Full name</Label>
              <Input
                value={editingOwner.fullName}
                onChange={(e) =>
                  setEditingOwner({
                    ...editingOwner,
                    fullName: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={editingOwner.email}
                onChange={(e) =>
                  setEditingOwner({
                    ...editingOwner,
                    email: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editingOwner.phone}
                  onChange={(e) =>
                    setEditingOwner({
                      ...editingOwner,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={editingOwner.whatsappNumber}
                  onChange={(e) =>
                    setEditingOwner({
                      ...editingOwner,
                      whatsappNumber: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Address</Label>
              <Textarea
                value={editingOwner.address}
                onChange={(e) =>
                  setEditingOwner({
                    ...editingOwner,
                    address: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <div className="text-sm font-medium">Active account</div>
                <div className="text-xs text-muted-foreground">
                  Inactive owners cannot sign in
                </div>
              </div>
              <Switch
                checked={editingOwner.isActive}
                onCheckedChange={(checked) =>
                  setEditingOwner({ ...editingOwner, isActive: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New password (optional)</Label>
              <Input
                type="password"
                value={editingOwner.newPassword}
                onChange={(e) =>
                  setEditingOwner({
                    ...editingOwner,
                    newPassword: e.target.value,
                  })
                }
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Confirm new password</Label>
              <Input
                type="password"
                value={editingOwner.newPassword2}
                onChange={(e) =>
                  setEditingOwner({
                    ...editingOwner,
                    newPassword2: e.target.value,
                  })
                }
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingOwner(null)}
              >
                Cancel
              </Button>
              <SubmitProgressButton
                type="submit"
                variant="luxe"
                submitting={catalogMutations.patchOwner.isPending}
                idleLabel="Save changes"
              />
            </div>
          </form>
        )}
      </AdminModal>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Remove this owner?"
        description={
          <>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">
              "{pendingDelete?.label}"
            </span>{" "}
            from the directory. This action cannot be undone.
          </>
        }
        confirmLabel="Remove owner"
        onConfirm={() => pendingDelete?.action()}
      />
    </div>
  );
};

type CategoryRow = { id: string; name: string; count: number; icon: string };
type FeatureRow = { id: string; name: string };

const DEFAULT_CATEGORY_ICONS: Record<
  string,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  apartment: Building2,
  commercial: Store,
  land: MapIcon,
  villa: HomeIcon,
};

const PROPERTY_TYPE_FLAG_LABELS: {
  key: keyof PropertyTypeFeatureFlags;
  label: string;
}[] = [
  { key: "has_bedrooms", label: "Bedrooms" },
  { key: "has_bathrooms", label: "Bathrooms" },
  { key: "has_parking_spaces", label: "Parking spaces" },
  { key: "has_project_status", label: "Project status" },
  { key: "has_floors", label: "Floors" },
  { key: "has_sighting", label: "Sighting" },
  { key: "has_furnishing", label: "Furnishing" },
  { key: "has_area_both", label: "Area both (sq.ft + cent)" },
];

function PropertyTypeFlagsEditor({
  flags,
  onChange,
}: {
  flags: PropertyTypeFeatureFlags;
  onChange: (flags: PropertyTypeFeatureFlags) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {PROPERTY_TYPE_FLAG_LABELS.map(({ key, label }) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
        >
          <Label className="text-sm">{label}</Label>
          <Switch
            checked={flags[key]}
            onCheckedChange={(checked) =>
              onChange({ ...flags, [key]: checked })
            }
          />
        </div>
      ))}
    </div>
  );
}

const Categories = () => {
  const PAGE_SIZE = 20;
  const [catSearch, setCatSearch] = useState("");
  const [debouncedCatSearch, setDebouncedCatSearch] = useState("");
  const [catPage, setCatPage] = useState(1);
  const [featSearch, setFeatSearch] = useState("");
  const [debouncedFeatSearch, setDebouncedFeatSearch] = useState("");
  const [featPage, setFeatPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCatSearch(catSearch), 350);
    return () => clearTimeout(t);
  }, [catSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFeatSearch(featSearch), 350);
    return () => clearTimeout(t);
  }, [featSearch]);

  useEffect(() => {
    setCatPage(1);
  }, [debouncedCatSearch]);

  useEffect(() => {
    setFeatPage(1);
  }, [debouncedFeatSearch]);

  const catQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: catPage,
      page_size: PAGE_SIZE,
    };
    if (debouncedCatSearch.trim()) params.search = debouncedCatSearch.trim();
    return params;
  }, [catPage, debouncedCatSearch]);

  const featQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: featPage,
      page_size: PAGE_SIZE,
    };
    if (debouncedFeatSearch.trim()) params.search = debouncedFeatSearch.trim();
    return params;
  }, [featPage, debouncedFeatSearch]);

  const { data: catsData, refetch: refetchCats } =
    useAdminPropertyTypesPaged(catQueryParams);
  const { data: featsData, refetch: refetchFeats } =
    useFeaturesPaged(featQueryParams);
  const catalogMutations = useCatalogMutations();
  const cats = catsData?.results ?? [];
  const feats = featsData?.results ?? [];
  const catTotal = catsData?.count ?? 0;
  const featTotal = featsData?.count ?? 0;
  const catTotalPages = Math.max(1, Math.ceil(catTotal / PAGE_SIZE));
  const featTotalPages = Math.max(1, Math.ceil(featTotal / PAGE_SIZE));

  const [newCat, setNewCat] = useState("");
  const [newCatFlags, setNewCatFlags] = useState<PropertyTypeFeatureFlags>(
    DEFAULT_PROPERTY_TYPE_FLAGS,
  );
  const [newFeat, setNewFeat] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [iconName, setIconName] = useState<string>("");
  const [editingCat, setEditingCat] = useState<ApiPropertyType | null>(null);
  const [editingFeat, setEditingFeat] = useState<ApiFeature | null>(null);
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [editIconPreview, setEditIconPreview] = useState<string>("");
  const [editCatFlags, setEditCatFlags] = useState<PropertyTypeFeatureFlags>(
    DEFAULT_PROPERTY_TYPE_FLAGS,
  );
  const [pendingCatDelete, setPendingCatDelete] = useState<PendingDelete>(null);
  const [pendingFeatDelete, setPendingFeatDelete] =
    useState<PendingDelete>(null);

  const handleIconChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      event.target.value = "";
      return;
    }
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setIconPreview(typeof reader.result === "string" ? reader.result : "");
      setIconName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleEditIconChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      event.target.value = "";
      return;
    }
    setEditIconFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setEditIconPreview(
        typeof reader.result === "string" ? reader.result : "",
      );
    };
    reader.readAsDataURL(file);
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) {
      toast.error("Enter a category name");
      return;
    }
    if (!iconFile) {
      toast.error("Please upload a category icon");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("image", iconFile);
      appendPropertyTypeFlagsToFormData(fd, newCatFlags);
      await catalogMutations.createPropertyType.mutateAsync(fd);
      toast.success("Category added");
      setNewCat("");
      setNewCatFlags(DEFAULT_PROPERTY_TYPE_FLAGS);
      setIconFile(null);
      setIconPreview("");
      setIconName("");
      void refetchCats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addFeature = async () => {
    const name = newFeat.trim();
    if (!name) {
      toast.error("Enter a feature name");
      return;
    }
    try {
      await catalogMutations.createFeature.mutateAsync({ name });
      toast.success("Feature added");
      setNewFeat("");
      void refetchFeats();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openEditCategory = (c: ApiPropertyType) => {
    setEditingCat(c);
    setEditIconFile(null);
    setEditIconPreview(c.image || "");
    setEditCatFlags(flagsFromPropertyType(c));
  };

  return (
    <div className="animate-fade-in">
      <h1 className="font-serif text-3xl md:text-4xl mb-6">
        Categories &amp; Features
      </h1>

      <Tabs defaultValue="cats">
        <TabsList className="bg-muted/60 rounded-full p-1 h-10">
          <TabsTrigger
            value="cats"
            className="rounded-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Categories
          </TabsTrigger>
          <TabsTrigger
            value="feats"
            className="rounded-full px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cats" className="mt-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-1 h-5 bg-emerald-500 rounded-sm" />
              <h2 className="text-base font-medium">Categories</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Enter category name"
                className="sm:max-w-md rounded-lg"
              />
              <Button
                type="button"
                variant="luxe"
                onClick={addCategory}
                className="shrink-0"
              >
                Add Category
              </Button>
            </div>

            <div className="relative mb-5 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Search categories…"
                className="pl-9 rounded-lg"
              />
            </div>

            <div className="mb-6 max-w-md">
              <Label className="text-xs font-medium text-foreground/80">
                Category icon <span className="text-rose-500">*</span>
              </Label>
              <label
                htmlFor="category-icon-upload"
                className="mt-2 grid place-items-center cursor-pointer h-28 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors"
              >
                {iconPreview ? (
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={iconPreview}
                      alt={iconName}
                      className="h-14 object-contain"
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[16rem]">
                      {iconName}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-emerald-600 font-medium">
                        Upload Icon
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        (JPG, PNG, WebP)
                      </span>
                    </div>
                  </div>
                )}
                <input
                  id="category-icon-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleIconChange}
                />
              </label>
            </div>

            <div className="mb-6 space-y-3">
              <Label className="text-xs font-medium text-foreground/80">
                Property form fields for this category
              </Label>
              <PropertyTypeFlagsEditor
                flags={newCatFlags}
                onChange={setNewCatFlags}
              />
            </div>

            <div className="space-y-2">
              {cats.map((c) => {
                const FallbackIcon =
                  DEFAULT_CATEGORY_ICONS[c.name.toLowerCase()] ?? Building2;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background p-3 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-sky-50 grid place-items-center text-sky-500 shrink-0">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt=""
                            className="h-7 w-7 object-contain"
                          />
                        ) : (
                          <FallbackIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        title="Edit"
                        onClick={() => openEditCategory(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete"
                        onClick={() =>
                          setPendingCatDelete({
                            label: c.name,
                            action: async () => {
                              try {
                                await catalogMutations.deletePropertyType.mutateAsync(
                                  c.id,
                                );
                                toast.success("Category removed");
                                void refetchCats();
                              } catch (err) {
                                toast.error(getErrorMessage(err));
                              }
                            },
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {cats.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No categories yet.
                </div>
              )}
            </div>

            <PaginationFooter
              page={catPage}
              total={catTotal}
              pageSize={PAGE_SIZE}
              onPrev={() => setCatPage((p) => Math.max(1, p - 1))}
              onNext={() => setCatPage((p) => Math.min(catTotalPages, p + 1))}
            />
          </div>
        </TabsContent>

        <TabsContent value="feats" className="mt-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-1 h-5 bg-emerald-500 rounded-sm" />
              <h2 className="text-base font-medium">Features</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <Input
                value={newFeat}
                onChange={(e) => setNewFeat(e.target.value)}
                placeholder="Enter feature name"
                className="sm:max-w-md rounded-lg"
              />
              <Button
                type="button"
                variant="luxe"
                onClick={addFeature}
                className="shrink-0"
              >
                Add Feature
              </Button>
            </div>

            <div className="relative mb-5 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={featSearch}
                onChange={(e) => setFeatSearch(e.target.value)}
                placeholder="Search features…"
                className="pl-9 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              {feats.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-3 hover:bg-muted/30 transition"
                >
                  <div className="font-medium">{f.name}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      title="Edit"
                      onClick={() => setEditingFeat(f)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                      onClick={() =>
                        setPendingFeatDelete({
                          label: f.name,
                          action: async () => {
                            try {
                              await catalogMutations.deleteFeature.mutateAsync(
                                f.id,
                              );
                              toast.success("Feature removed");
                              void refetchFeats();
                            } catch (err) {
                              toast.error(getErrorMessage(err));
                            }
                          },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {feats.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No features yet.
                </div>
              )}
            </div>

            <PaginationFooter
              page={featPage}
              total={featTotal}
              pageSize={PAGE_SIZE}
              onPrev={() => setFeatPage((p) => Math.max(1, p - 1))}
              onNext={() => setFeatPage((p) => Math.min(featTotalPages, p + 1))}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!editingCat}
        onOpenChange={(v) => {
          if (!v) {
            setEditingCat(null);
            setEditIconPreview("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Edit category
            </DialogTitle>
          </DialogHeader>
          {editingCat && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get("name") ?? "").trim();
                if (!name) {
                  toast.error("Enter a name");
                  return;
                }
                try {
                  const form = new FormData();
                  form.append("name", name);
                  if (editIconFile) form.append("image", editIconFile);
                  appendPropertyTypeFlagsToFormData(form, editCatFlags);
                  await catalogMutations.updatePropertyType.mutateAsync({
                    id: editingCat.id,
                    form,
                  });
                  toast.success("Category updated");
                  setEditingCat(null);
                  setEditIconFile(null);
                  setEditIconPreview("");
                  void refetchCats();
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Category name</Label>
                <Input name="name" defaultValue={editingCat.name} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Category icon</Label>
                <label
                  htmlFor="edit-category-icon"
                  className="grid place-items-center cursor-pointer h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:border-emerald-500 transition-colors"
                >
                  {editIconPreview ? (
                    <img
                      src={editIconPreview}
                      alt=""
                      className="h-14 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">Upload new icon</span>
                    </div>
                  )}
                  <input
                    id="edit-category-icon"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleEditIconChange}
                  />
                </label>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-foreground/80">
                  Property form fields for this category
                </Label>
                <PropertyTypeFlagsEditor
                  flags={editCatFlags}
                  onChange={setEditCatFlags}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCat(null);
                    setEditIconPreview("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="luxe">
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingFeat}
        onOpenChange={(v) => {
          if (!v) setEditingFeat(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Edit feature
            </DialogTitle>
          </DialogHeader>
          {editingFeat && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get("name") ?? "").trim();
                if (!name) {
                  toast.error("Enter a name");
                  return;
                }
                try {
                  await catalogMutations.updateFeature.mutateAsync({
                    id: editingFeat.id,
                    body: { name },
                  });
                  toast.success("Feature updated");
                  setEditingFeat(null);
                  void refetchFeats();
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Feature name</Label>
                <Input name="name" defaultValue={editingFeat.name} required />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFeat(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="luxe">
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!pendingCatDelete}
        onOpenChange={(v) => {
          if (!v) setPendingCatDelete(null);
        }}
        title="Delete this category?"
        description={
          <>
            This will permanently remove the{" "}
            <span className="font-medium text-foreground">
              "{pendingCatDelete?.label}"
            </span>{" "}
            category. Listings under it will need to be re-tagged.
          </>
        }
        confirmLabel="Delete category"
        onConfirm={() => pendingCatDelete?.action()}
      />

      <ConfirmDeleteDialog
        open={!!pendingFeatDelete}
        onOpenChange={(v) => {
          if (!v) setPendingFeatDelete(null);
        }}
        title="Delete this feature?"
        description={
          <>
            This will permanently remove the{" "}
            <span className="font-medium text-foreground">
              "{pendingFeatDelete?.label}"
            </span>{" "}
            feature.
          </>
        }
        confirmLabel="Delete feature"
        onConfirm={() => pendingFeatDelete?.action()}
      />
    </div>
  );
};

/* ------------------------------- Banners -------------------------------- */

type BannerType = "hero" | "offer";

const Banners = () => {
  const { data: heroData, refetch: refetchHero } = useHeroBanners();
  const { data: offerData, refetch: refetchOffer } = useOfferBanners();
  const catalogMutations = useCatalogMutations();
  const hero = heroData?.results ?? [];
  const offer = offerData?.results ?? [];

  const [open, setOpen] = useState(false);
  const [bannerType, setBannerType] = useState<BannerType>("hero");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageName, setImageName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : "");
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setBannerType("hero");
    setBannerFile(null);
    setImagePreview("");
    setImageName("");
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const addBanner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bannerFile) {
      toast.error("Please upload a banner image");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("image", bannerFile);
      if (bannerType === "hero") {
        await catalogMutations.createHeroBanner.mutateAsync(fd);
        void refetchHero();
      } else {
        await catalogMutations.createOfferBanner.mutateAsync(fd);
        void refetchOffer();
      }
      toast.success(
        `${bannerType === "hero" ? "Hero" : "Offer"} banner updated`,
      );
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeBanner = async (id: number, type: BannerType) => {
    try {
      if (type === "hero") {
        await catalogMutations.deleteHeroBanner.mutateAsync(id);
        void refetchHero();
      } else {
        await catalogMutations.deleteOfferBanner.mutateAsync(id);
        void refetchOffer();
      }
      toast.success("Banner removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderHeroCard = (b: {
    id: number;
    image?: string;
    created_at?: string;
  }) => (
    <div key={b.id} className="max-w-md">
      <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
        {b.image ? (
          <img src={b.image} alt="" className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-muted" />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2 text-sm">
        <span className="text-foreground/80">
          Added: {formatDate(b.created_at)}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          onClick={() =>
            setPendingDelete({
              label: "Hero banner",
              action: () => void removeBanner(b.id, "hero"),
            })
          }
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderOfferCard = (b: {
    id: number;
    image?: string;
    created_at?: string;
  }) => (
    <div key={b.id} className="max-w-md">
      <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
        {b.image ? (
          <img src={b.image} alt="" className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-muted" />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2 text-sm">
        <span className="text-foreground/80">
          Added: {formatDate(b.created_at)}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          onClick={() =>
            setPendingDelete({
              label: "Offer banner",
              action: () => void removeBanner(b.id, "offer"),
            })
          }
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Banner Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload hero and offer banners shown on the home page.
          </p>
        </div>
        <Button variant="luxe" onClick={() => setOpen(true)}>
          Add New Banner
        </Button>
      </div>

      <section className="mb-10">
        <h2 className="font-serif text-xl mb-1">Hero Banners</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Uploading a new hero banner replaces the current one on the home page.
        </p>
        {hero.length === 0 ? (
          <div className="bg-card border border-border rounded-lg px-6 py-6 text-center text-muted-foreground text-sm">
            No banners yet. Use "Add New Banner" to upload one.
          </div>
        ) : (
          hero.map(renderHeroCard)
        )}
      </section>

      <section>
        <h2 className="font-serif text-xl mb-1">Offer Banners</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Uploading a new offer banner replaces the current carousel image.
        </p>
        {offer.length === 0 ? (
          <div className="bg-card border border-border rounded-lg px-6 py-6 text-center text-muted-foreground text-sm">
            No banners yet. Use "Add New Banner" to upload one.
          </div>
        ) : (
          offer.map(renderOfferCard)
        )}
      </section>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Add New Banner
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={addBanner} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Banner Type</Label>
              <select
                value={bannerType}
                onChange={(e) => setBannerType(e.target.value as BannerType)}
                className="h-10 w-full rounded-md border-2 border-blue-500 bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-blue-500"
              >
                <option value="hero">Hero Banner</option>
                <option value="offer">Offer Banner</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Banner Image</Label>
              <label
                htmlFor="banner-image-upload"
                className="relative block h-40 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-blue-500 hover:bg-blue-50/30"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={imageName}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-blue-600 font-medium">
                        Upload a file
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        or drag and drop
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF, WebP up to 10MB
                    </p>
                  </div>
                )}
                <input
                  id="banner-image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="luxe">
                Add Banner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Delete this banner?"
        description={
          <>
            The{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.label}
            </span>{" "}
            will be permanently removed from the site.
          </>
        }
        confirmLabel="Delete banner"
        onConfirm={() => pendingDelete?.action()}
      />
    </div>
  );
};

/* ----------------------------- Testimonials ----------------------------- */

const Testimonials = () => {
  const { data, refetch } = useAdminTestimonials();
  const catalogMutations = useCatalogMutations();
  const list = useMemo(
    () => [...(data?.results ?? [])].sort((a, b) => a.order - b.order),
    [data?.results],
  );
  // Section heading defaults are unused while the admin "Section heading" form is
  // hidden (these values are not rendered in the home page UI yet).
  // const sectionDefaults = useMemo(
  //   () => ({
  //     tag: data?.section?.tag ?? "CLIENT STORIES",
  //     heading: data?.section?.heading ?? "What our clients say",
  //     description:
  //       data?.section?.description ??
  //       "Real experiences from people who found their perfect space with us.",
  //   }),
  //   [data?.section],
  // );

  const [editing, setEditing] = useState<UiTestimonial | null>(null);
  const [open, setOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const testimonialsPager = usePagination(list, 6);

  // Disabled together with the hidden "Section heading" form above.
  // const saveSection = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   const fd = new FormData(e.currentTarget);
  //   try {
  //     await catalogMutations.patchSiteSettings.mutateAsync({
  //       testimonials_section_tag: String(fd.get("tag") ?? "").trim(),
  //       testimonials_section_heading: String(fd.get("heading") ?? "").trim(),
  //       testimonials_section_description: String(fd.get("description") ?? "").trim(),
  //     });
  //     void refetch();
  //     toast.success("Section heading saved");
  //   } catch (err) {
  //     toast.error(getErrorMessage(err));
  //   }
  // };

  const openNew = () => {
    setEditing({
      id: 0,
      name: "",
      role: "",
      content: "",
      rating: 5,
      order: list.length,
      avatar: null,
      published: true,
    });
    setAvatarPreview("");
    setAvatarFile(null);
    setAvatarName("");
    setEditPublished(true);
    setOpen(true);
  };

  const openEdit = (t: UiTestimonial) => {
    setEditing({ ...t });
    setAvatarPreview(t.avatar || "");
    setAvatarFile(null);
    setAvatarName("");
    setEditPublished(t.published);
    setOpen(true);
  };

  const handleAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      event.target.value = "";
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(typeof reader.result === "string" ? reader.result : "");
      setAvatarName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      toast.error("Client name is required");
      return;
    }
    const payload = buildTestimonialFormData({
      name,
      role: String(fd.get("role") ?? "").trim(),
      quote: String(fd.get("quote") ?? "").trim(),
      rating: Number(fd.get("rating") ?? 5),
      order: Number(fd.get("order") ?? 0),
      published: editPublished,
      avatarFile,
    });
    try {
      if (editing.id) {
        await catalogMutations.updateTestimonial.mutateAsync({
          id: editing.id,
          form: payload,
        });
        toast.success("Testimonial updated");
      } else {
        await catalogMutations.createTestimonial.mutateAsync(payload);
        toast.success("Testimonial created");
      }
      void refetch();
      setOpen(false);
      setEditing(null);
      setAvatarPreview("");
      setAvatarFile(null);
      setAvatarName("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const togglePublished = async (t: UiTestimonial) => {
    try {
      await catalogMutations.updateTestimonial.mutateAsync({
        id: t.id,
        form: { is_published: !t.published },
      });
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: number) => {
    try {
      await catalogMutations.deleteTestimonial.mutateAsync(id);
      void refetch();
      toast.success("Testimonial removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">Client Stories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage testimonials shown on the home page.
        </p>
      </div>

      {/*
        Section heading form is hidden: the tag/heading/description values are not
        currently rendered in the home page UI (the home testimonials header text is
        hardcoded). Re-enable this block once those fields are wired into the UI.

      <form
        key={`section-${sectionDefaults.tag}-${sectionDefaults.heading}`}
        onSubmit={saveSection}
        className="bg-card border border-border rounded-2xl p-6 max-w-2xl mb-10 shadow-sm"
      >
        <h2 className="font-serif text-lg mb-4">Section heading</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Section tag</Label>
            <Input name="tag" defaultValue={sectionDefaults.tag} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Heading</Label>
            <Input name="heading" defaultValue={sectionDefaults.heading} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              name="description"
              defaultValue={sectionDefaults.description}
              rows={3}
              className="resize-none rounded-lg"
            />
          </div>
        </div>
        <Button type="submit" variant="luxe" className="mt-5">Save section</Button>
      </form>
      */}

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-serif text-xl">Testimonials</h2>
        <Button variant="luxe" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add testimonial
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          No testimonials yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {testimonialsPager.paginated.map((t) => (
            <article
              key={t.id}
              className="bg-card border border-border rounded-2xl p-6 hover-lift"
            >
              <div className="flex items-center gap-3">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-sky-400 grid place-items-center font-semibold text-white">
                    {t.name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.role || "Client"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
              {t.content && (
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                  "{t.content}"
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={t.published}
                    onCheckedChange={() => void togglePublished(t)}
                  />
                  Published
                </label>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => openEdit(t)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50"
                    onClick={() =>
                      setPendingDelete({
                        label: t.name,
                        action: () => void remove(t.id),
                      })
                    }
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {list.length > 0 && (
        <PaginationFooter
          page={testimonialsPager.page}
          total={list.length}
          pageSize={6}
          onPrev={testimonialsPager.goPrev}
          onNext={testimonialsPager.goNext}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setAvatarPreview("");
            setAvatarFile(null);
            setAvatarName("");
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editing?.id ? "Edit testimonial" : "Add testimonial"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Client name</Label>
              <Input
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="Savannah N."
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Role / title</Label>
              <Input
                name="role"
                defaultValue={editing?.role ?? ""}
                placeholder="Property Investor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Testimonial</Label>
              <Textarea
                name="quote"
                rows={4}
                defaultValue={editing?.content ?? ""}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rating</Label>
              <select
                name="rating"
                defaultValue={String(editing?.rating ?? 5)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-blue-500"
              >
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Display order</Label>
              <Input
                name="order"
                type="number"
                min="0"
                defaultValue={String(editing?.order ?? 0)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Avatar (optional)</Label>
              <div className="rounded-md border border-input bg-background px-3 py-2 flex items-center gap-3">
                <label
                  htmlFor="testimonial-avatar"
                  className="cursor-pointer rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80"
                >
                  Choose File
                </label>
                <span className="text-xs text-muted-foreground truncate">
                  {avatarName ||
                    (avatarPreview ? "Current image" : "No file chosen")}
                </span>
                <input
                  id="testimonial-avatar"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatar}
                />
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ml-auto"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <Label className="text-sm">Published on site</Label>
              <Switch
                checked={editPublished}
                onCheckedChange={setEditPublished}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="luxe">
                {editing?.id ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Delete this testimonial?"
        description={
          <>
            The story from{" "}
            <span className="font-medium text-foreground">
              "{pendingDelete?.label}"
            </span>{" "}
            will be permanently removed.
          </>
        }
        confirmLabel="Delete testimonial"
        onConfirm={() => pendingDelete?.action()}
      />
    </div>
  );
};

/* -------------------------- Location Management ------------------------- */

type LocationView = "states" | "districts" | "cities";

const LocationManagement = ({ view }: { view: LocationView }) => {
  const LOCATION_PAGE_SIZE = 10;
  const { data: statesData, refetch: refetchStates } = useStates();
  const { data: districtsData, refetch: refetchDistricts } = useAllDistricts();
  const { data: citiesData, refetch: refetchCities } = useAllCities();
  const catalogMutations = useCatalogMutations();
  // Full lists power the dropdowns (add/edit dialogs) and name resolution.
  const states = useMemo(
    () => statesData?.results ?? [],
    [statesData?.results],
  );
  const districts = useMemo(
    () => districtsData?.results ?? [],
    [districtsData?.results],
  );
  const cities = useMemo(
    () => citiesData?.results ?? [],
    [citiesData?.results],
  );

  // Add dialog states
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [districtDialogOpen, setDistrictDialogOpen] = useState(false);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);

  // Edit dialog state
  const [editingState, setEditingState] = useState<ApiState | null>(null);
  const [editingDistrict, setEditingDistrict] = useState<ApiDistrict | null>(
    null,
  );
  const [editingCity, setEditingCity] = useState<ApiCity | null>(null);

  // Filters
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");

  // Server-side search + pagination for the states & districts tables.
  const [stateSearch, setStateSearch] = useState("");
  const [debouncedStateSearch, setDebouncedStateSearch] = useState("");
  const [statesPage, setStatesPage] = useState(1);
  const [districtSearch, setDistrictSearch] = useState("");
  const [debouncedDistrictSearch, setDebouncedDistrictSearch] = useState("");
  const [districtsPage, setDistrictsPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStateSearch(stateSearch), 350);
    return () => clearTimeout(t);
  }, [stateSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDistrictSearch(districtSearch), 350);
    return () => clearTimeout(t);
  }, [districtSearch]);

  useEffect(() => {
    setStatesPage(1);
  }, [debouncedStateSearch]);

  useEffect(() => {
    setDistrictsPage(1);
  }, [debouncedDistrictSearch, stateFilter]);

  const stateQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: statesPage,
      page_size: LOCATION_PAGE_SIZE,
    };
    if (debouncedStateSearch.trim())
      params.search = debouncedStateSearch.trim();
    return params;
  }, [statesPage, debouncedStateSearch]);

  const districtQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: districtsPage,
      page_size: LOCATION_PAGE_SIZE,
    };
    if (debouncedDistrictSearch.trim())
      params.search = debouncedDistrictSearch.trim();
    if (stateFilter) params.state_id = Number(stateFilter);
    return params;
  }, [districtsPage, debouncedDistrictSearch, stateFilter]);

  const { data: statesPageData } = useStatesPaged(stateQueryParams);
  const { data: districtsPageData } = useDistrictsPaged(districtQueryParams);
  const pagedStates = statesPageData?.results ?? [];
  const pagedDistricts = districtsPageData?.results ?? [];
  const statesTotal = statesPageData?.count ?? 0;
  const districtsTotal = districtsPageData?.count ?? 0;
  const statesTotalPages = Math.max(
    1,
    Math.ceil(statesTotal / LOCATION_PAGE_SIZE),
  );
  const districtsTotalPages = Math.max(
    1,
    Math.ceil(districtsTotal / LOCATION_PAGE_SIZE),
  );

  // Delete confirmations
  const [pendingStateDelete, setPendingStateDelete] =
    useState<PendingDelete>(null);
  const [pendingDistrictDelete, setPendingDistrictDelete] =
    useState<PendingDelete>(null);
  const [pendingCityDelete, setPendingCityDelete] =
    useState<PendingDelete>(null);

  // -------------- State actions --------------
  const addState = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      toast.error("Enter a state name");
      return;
    }
    try {
      await catalogMutations.createState.mutateAsync({ name });
      void refetchStates();
      setStateDialogOpen(false);
      toast.success("State added");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateState = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingState) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      toast.error("Enter a state name");
      return;
    }
    try {
      await catalogMutations.updateState.mutateAsync({
        id: editingState.id,
        body: { name },
      });
      void refetchStates();
      setEditingState(null);
      toast.success("State updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeState = async (s: ApiState) => {
    try {
      await catalogMutations.deleteState.mutateAsync(s.id);
      void refetchStates();
      void refetchDistricts();
      void refetchCities();
      toast.success(`${s.name} removed`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // -------------- District actions --------------
  const addDistrict = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const stateId = Number(fd.get("stateId") ?? "");
    if (!name || !stateId) {
      toast.error("Pick a state and enter a district name");
      return;
    }
    try {
      await catalogMutations.createDistrict.mutateAsync({
        name,
        state: stateId,
      });
      void refetchDistricts();
      setDistrictDialogOpen(false);
      toast.success("District added");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateDistrict = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDistrict) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const stateId = Number(fd.get("stateId") ?? "");
    if (!name || !stateId) {
      toast.error("Pick a state and enter a district name");
      return;
    }
    try {
      await catalogMutations.updateDistrict.mutateAsync({
        id: editingDistrict.id,
        body: { name, state: stateId },
      });
      void refetchDistricts();
      setEditingDistrict(null);
      toast.success("District updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeDistrict = async (d: ApiDistrict) => {
    try {
      await catalogMutations.deleteDistrict.mutateAsync(d.id);
      void refetchDistricts();
      void refetchCities();
      toast.success(`${d.name} removed`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // -------------- City actions --------------
  const addCity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const districtId = Number(fd.get("districtId") ?? "");
    if (!name || !districtId) {
      toast.error("Pick a district and enter a city name");
      return;
    }
    try {
      await catalogMutations.createCity.mutateAsync({
        name,
        district: districtId,
      });
      void refetchCities();
      setCityDialogOpen(false);
      toast.success("City added");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateCity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCity) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const districtId = Number(fd.get("districtId") ?? "");
    if (!name || !districtId) {
      toast.error("Pick a district and enter a city name");
      return;
    }
    try {
      await catalogMutations.updateCity.mutateAsync({
        id: editingCity.id,
        body: { name, district: districtId },
      });
      void refetchCities();
      setEditingCity(null);
      toast.success("City updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeCity = async (c: ApiCity) => {
    try {
      await catalogMutations.deleteCity.mutateAsync(c.id);
      void refetchCities();
      toast.success(`${c.name} removed`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Derived sorted/filtered lists (used for dropdowns and the cities table)
  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.name.localeCompare(b.name)),
    [states],
  );

  const sortedCities = useMemo(() => {
    const filterDistrictId = districtFilter ? Number(districtFilter) : 0;
    const filtered = filterDistrictId
      ? cities.filter((c) => c.district === filterDistrictId)
      : cities;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, districtFilter]);

  const citiesPager = usePagination(sortedCities, 10);

  // Common cell action buttons
  const editBtn = (onClick: () => void) => (
    <Button
      size="icon"
      variant="outline"
      className="h-8 w-8 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
      onClick={onClick}
      title="Edit"
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );
  const deleteBtn = (onClick: () => void) => (
    <Button
      size="icon"
      variant="outline"
      className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
      onClick={onClick}
      title="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="animate-fade-in">
      {/* ---------------------------- States view ---------------------------- */}
      {view === "states" && (
        <>
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h1 className="font-serif text-3xl md:text-4xl">States</h1>
            <Button variant="luxe" onClick={() => setStateDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add state
            </Button>
          </div>

          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              placeholder="Search states…"
              className="pl-9 rounded-lg"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="text-left p-4 font-medium w-32">ID</th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-right p-4 font-medium pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-12 text-center text-muted-foreground"
                      >
                        {debouncedStateSearch.trim()
                          ? "No states match your search."
                          : "No states yet."}
                      </td>
                    </tr>
                  ) : (
                    pagedStates.map((s) => (
                      <tr
                        key={s.id}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="p-4 text-muted-foreground">{s.id}</td>
                        <td className="p-4 font-medium">{s.name}</td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {editBtn(() => setEditingState(s))}
                            {deleteBtn(() =>
                              setPendingStateDelete({
                                label: s.name,
                                action: () => void removeState(s),
                              }),
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {statesTotal > 0 && (
            <PaginationFooter
              page={statesPage}
              total={statesTotal}
              pageSize={LOCATION_PAGE_SIZE}
              onPrev={() => setStatesPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setStatesPage((p) => Math.min(statesTotalPages, p + 1))
              }
            />
          )}

          {/* Add state dialog */}
          <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  Add state
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={addState} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">State name</Label>
                  <Input name="name" placeholder="Kerala" required />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="luxe">
                    Add state
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit state dialog */}
          <Dialog
            open={!!editingState}
            onOpenChange={(v) => {
              if (!v) setEditingState(null);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  Edit state
                </DialogTitle>
              </DialogHeader>
              {editingState && (
                <form onSubmit={updateState} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">State name</Label>
                    <Input
                      name="name"
                      defaultValue={editingState.name}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingState(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="luxe">
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* --------------------------- Districts view --------------------------- */}
      {view === "districts" && (
        <>
          <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
            <h1 className="font-serif text-3xl md:text-4xl">Districts</h1>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    placeholder="Search districts…"
                    className="h-10 w-56 pl-9 rounded-full"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Filter by state
                </Label>
                <select
                  className="h-10 w-48 rounded-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-gold"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  <option value="">All states</option>
                  {sortedStates.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="luxe"
                onClick={() => setDistrictDialogOpen(true)}
              >
                <Plus className="h-4 w-4" /> Add district
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="text-left p-4 font-medium w-24">ID</th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">State</th>
                    <th className="text-right p-4 font-medium pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDistricts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-12 text-center text-muted-foreground"
                      >
                        {debouncedDistrictSearch.trim() || stateFilter
                          ? "No districts match your search."
                          : "No districts yet."}
                      </td>
                    </tr>
                  ) : (
                    pagedDistricts.map((d) => {
                      const state = states.find((s) => s.id === d.state);
                      return (
                        <tr
                          key={d.id}
                          className="border-t border-border hover:bg-muted/30"
                        >
                          <td className="p-4 text-muted-foreground">{d.id}</td>
                          <td className="p-4 font-medium">{d.name}</td>
                          <td className="p-4 text-foreground/80">
                            {state?.name ?? d.state_name ?? "—"}
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {editBtn(() => setEditingDistrict(d))}
                              {deleteBtn(() =>
                                setPendingDistrictDelete({
                                  label: d.name,
                                  action: () => void removeDistrict(d),
                                }),
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {districtsTotal > 0 && (
            <PaginationFooter
              page={districtsPage}
              total={districtsTotal}
              pageSize={LOCATION_PAGE_SIZE}
              onPrev={() => setDistrictsPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setDistrictsPage((p) => Math.min(districtsTotalPages, p + 1))
              }
            />
          )}

          {/* Add district dialog */}
          <Dialog
            open={districtDialogOpen}
            onOpenChange={setDistrictDialogOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  Add district
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={addDistrict} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">State</Label>
                  <select
                    name="stateId"
                    defaultValue={stateFilter}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Select state…</option>
                    {sortedStates.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">District name</Label>
                  <Input name="name" placeholder="Ernakulam" required />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDistrictDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="luxe">
                    Add district
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit district dialog */}
          <Dialog
            open={!!editingDistrict}
            onOpenChange={(v) => {
              if (!v) setEditingDistrict(null);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  Edit district
                </DialogTitle>
              </DialogHeader>
              {editingDistrict && (
                <form onSubmit={updateDistrict} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">State</Label>
                    <select
                      name="stateId"
                      defaultValue={String(editingDistrict.state)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      <option value="">Select state…</option>
                      {sortedStates.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">District name</Label>
                    <Input
                      name="name"
                      defaultValue={editingDistrict.name}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingDistrict(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="luxe">
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ---------------------------- Cities view ---------------------------- */}
      {view === "cities" && (
        <>
          <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
            <h1 className="font-serif text-3xl md:text-4xl">Cities</h1>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Filter by district
                </Label>
                <select
                  className="h-10 w-48 rounded-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-gold"
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                >
                  <option value="">All districts</option>
                  {[...districts]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <Button variant="luxe" onClick={() => setCityDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Add city
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="text-left p-4 font-medium w-24">ID</th>
                    <th className="text-left p-4 font-medium">City</th>
                    <th className="text-left p-4 font-medium">District</th>
                    <th className="text-left p-4 font-medium">State</th>
                    <th className="text-right p-4 font-medium pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-12 text-center text-muted-foreground"
                      >
                        No cities yet.
                      </td>
                    </tr>
                  ) : (
                    citiesPager.paginated.map((c) => {
                      const district = districts.find(
                        (d) => d.id === c.district,
                      );
                      const state = district
                        ? states.find((s) => s.id === district.state)
                        : undefined;
                      return (
                        <tr
                          key={c.id}
                          className="border-t border-border hover:bg-muted/30"
                        >
                          <td className="p-4 text-muted-foreground">{c.id}</td>
                          <td className="p-4 font-medium">{c.name}</td>
                          <td className="p-4 text-foreground/80">
                            {district?.name ?? c.district_name ?? "—"}
                          </td>
                          <td className="p-4 text-foreground/80">
                            {state?.name ?? "—"}
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {editBtn(() => setEditingCity(c))}
                              {deleteBtn(() =>
                                setPendingCityDelete({
                                  label: c.name,
                                  action: () => void removeCity(c),
                                }),
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {sortedCities.length > 0 && (
            <PaginationFooter
              page={citiesPager.page}
              total={sortedCities.length}
              pageSize={10}
              onPrev={citiesPager.goPrev}
              onNext={citiesPager.goNext}
            />
          )}

          {/* Add city dialog */}
          <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  Add city
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={addCity} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">District</Label>
                  <select
                    name="districtId"
                    defaultValue={districtFilter}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Select district…</option>
                    {[...districts]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((d) => {
                        const state = states.find((s) => s.id === d.state);
                        return (
                          <option key={d.id} value={String(d.id)}>
                            {d.name}
                            {state ? ` · ${state.name}` : ""}
                          </option>
                        );
                      })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">City name</Label>
                  <Input name="name" placeholder="Kochi" required />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCityDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="luxe">
                    Add city
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit city dialog */}
          <Dialog
            open={!!editingCity}
            onOpenChange={(v) => {
              if (!v) setEditingCity(null);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">
                  Edit city
                </DialogTitle>
              </DialogHeader>
              {editingCity && (
                <form onSubmit={updateCity} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">District</Label>
                    <select
                      name="districtId"
                      defaultValue={String(editingCity.district)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      <option value="">Select district…</option>
                      {[...districts]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((d) => {
                          const state = states.find((s) => s.id === d.state);
                          return (
                            <option key={d.id} value={String(d.id)}>
                              {d.name}
                              {state ? ` · ${state.name}` : ""}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">City name</Label>
                    <Input
                      name="name"
                      defaultValue={editingCity.name}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCity(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="luxe">
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      <ConfirmDeleteDialog
        open={!!pendingStateDelete}
        onOpenChange={(v) => {
          if (!v) setPendingStateDelete(null);
        }}
        title="Delete this state?"
        description={
          <>
            Deleting{" "}
            <span className="font-medium text-foreground">
              "{pendingStateDelete?.label}"
            </span>{" "}
            will also remove all of its districts and cities. This action cannot
            be undone.
          </>
        }
        confirmLabel="Delete state"
        onConfirm={() => pendingStateDelete?.action()}
      />

      <ConfirmDeleteDialog
        open={!!pendingDistrictDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDistrictDelete(null);
        }}
        title="Delete this district?"
        description={
          <>
            Deleting{" "}
            <span className="font-medium text-foreground">
              "{pendingDistrictDelete?.label}"
            </span>{" "}
            will also remove all cities under it. This action cannot be undone.
          </>
        }
        confirmLabel="Delete district"
        onConfirm={() => pendingDistrictDelete?.action()}
      />

      <ConfirmDeleteDialog
        open={!!pendingCityDelete}
        onOpenChange={(v) => {
          if (!v) setPendingCityDelete(null);
        }}
        title="Delete this city?"
        description={
          <>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">
              "{pendingCityDelete?.label}"
            </span>
            .
          </>
        }
        confirmLabel="Delete city"
        onConfirm={() => pendingCityDelete?.action()}
      />
    </div>
  );
};

/* -------------------------------- Enquiry ------------------------------- */

const EnquiryAdmin = () => {
  const { data, refetch } = useContacts({ page_size: 100 });
  const catalogMutations = useCatalogMutations();
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, Enquiry["status"]>
  >({});
  const items = useMemo(
    () =>
      (data?.items ?? []).map((e) => ({
        ...e,
        status: statusOverrides[e.id] ?? e.status,
      })),
    [data, statusOverrides],
  );
  const [active, setActive] = useState<Enquiry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const enquiriesPager = usePagination(items, 10);

  const setStatus = (id: string, status: Enquiry["status"]) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    toast.success(`Marked as ${status.toLowerCase()} (local)`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6 md:mb-8">
        <h1 className="font-serif text-3xl md:text-4xl">Enquiries</h1>
        <div className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {items.filter((e) => e.status === "New").length} new · {items.length}{" "}
          total
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-dashed rounded-2xl p-16 text-center text-muted-foreground">
          No enquiries yet. Messages from buyers will appear here.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-4">From</th>
                  <th className="text-left p-4">Property</th>
                  <th className="text-left p-4">Message</th>
                  <th className="text-left p-4">Received</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiriesPager.paginated.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border hover:bg-muted/40 align-top"
                  >
                    <td className="p-4">
                      <div className="font-medium">{e.fromName}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {e.fromEmail}
                      </div>
                      {e.fromPhone ? (
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                          <PhoneIcon className="h-3 w-3" />
                          {e.fromPhone}
                        </div>
                      ) : null}
                    </td>
                    <td
                      className="p-4 text-foreground/80 max-w-[200px] truncate"
                      title={e.propertyTitle}
                    >
                      {e.propertyTitle}
                    </td>
                    <td className="p-4 text-foreground/75 max-w-[320px]">
                      <span className="line-clamp-2">{e.message}</span>
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {e.createdAt}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={e.status === "New" ? "default" : "secondary"}
                      >
                        {e.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActive(e)}
                        title="View"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {e.status !== "Replied" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(e.id, "Replied")}
                          title="Mark replied"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      )}
                      {e.status !== "Closed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setStatus(e.id, "Closed")}
                          title="Close"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setPendingDelete({
                            label: e.fromName,
                            action: async () => {
                              try {
                                await catalogMutations.deleteContact.mutateAsync(
                                  Number(e.id),
                                );
                                toast.success("Enquiry removed");
                                void refetch();
                              } catch (err) {
                                toast.error(getErrorMessage(err));
                              }
                            },
                          })
                        }
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <PaginationFooter
          page={enquiriesPager.page}
          total={items.length}
          pageSize={10}
          onPrev={enquiriesPager.goPrev}
          onNext={enquiriesPager.goNext}
        />
      )}

      <Dialog
        open={!!active}
        onOpenChange={(v) => {
          if (!v) setActive(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Enquiry from {active?.fromName}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Property
                </div>
                <div className="font-medium mt-1">{active.propertyTitle}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Email
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {active.fromEmail}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Phone
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" />
                    {active.fromPhone || "—"}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Message
                </div>
                <p className="rounded-xl border border-border p-3 leading-relaxed">
                  {active.message}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus(active.id, "Closed");
                    setActive(null);
                  }}
                >
                  Close enquiry
                </Button>
                <Button
                  variant="luxe"
                  onClick={() => {
                    setStatus(active.id, "Replied");
                    setActive(null);
                  }}
                >
                  Mark as replied
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Delete this enquiry?"
        description={
          <>
            The enquiry from{" "}
            <span className="font-medium text-foreground">
              "{pendingDelete?.label}"
            </span>{" "}
            will be permanently removed.
          </>
        }
        confirmLabel="Delete enquiry"
        onConfirm={() => pendingDelete?.action()}
      />
    </div>
  );
};

/* ----------------------------- Advertisements ----------------------------- */

const AD_SUBMIT_MESSAGES = [
  "Saving Advertisement...",
  "Uploading video...",
  "Almost there...",
  "Final Moment...",
];

type AdImageKey = "desktopBanner" | "mobileBanner" | "videoThumbnail";

const AdvertisementsAdmin = () => {
  const [adSearch, setAdSearch] = useState("");
  const [debouncedAdSearch, setDebouncedAdSearch] = useState("");
  const [adTypeFilter, setAdTypeFilter] = useState<"all" | AdType>("all");
  const [adStatusFilter, setAdStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [adSort, setAdSort] = useState<"newest" | "oldest" | "priority">(
    "newest",
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAdSearch(adSearch), 350);
    return () => clearTimeout(t);
  }, [adSearch]);

  const adQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page_size: 100,
      ordering: adSort,
    };
    if (adTypeFilter !== "all") params.ad_type = adTypeFilter;
    if (adStatusFilter !== "all")
      params.is_active = adStatusFilter === "active" ? "true" : "false";
    if (debouncedAdSearch.trim()) params.search = debouncedAdSearch.trim();
    return params;
  }, [adSort, adTypeFilter, adStatusFilter, debouncedAdSearch]);

  const {
    data: adsData,
    refetch,
    isFetching: adsFetching,
  } = useAdminAds(adQueryParams);
  const { data: siteSettings } = useSiteSettings();
  const [linkedPropertySearch, setLinkedPropertySearch] = useState("");
  const [linkedPropertyPage, setLinkedPropertyPage] = useState(1);
  const [linkedPropertyPickerOpen, setLinkedPropertyPickerOpen] =
    useState(false);
  const { data: propsForLink } = usePropertyList(
    {
      moderationStatus: "approved",
      includeAds: false,
      page: linkedPropertyPage,
      pageSize: 20,
      search: linkedPropertySearch.trim() || undefined,
    },
    { auth: true },
  );
  const catalogMutations = useCatalogMutations();
  const list = useMemo(() => adsData?.items ?? [], [adsData?.items]);
  const linkedPropertyTotalPages = Math.max(
    1,
    Math.ceil((propsForLink?.count ?? 0) / 20),
  );
  const linkableProperties = useMemo(
    () =>
      (propsForLink?.items ?? [])
        .filter((x) => x.kind === "property")
        .map((x) => x.property),
    [propsForLink],
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Advertisement>(emptyAd());
  const selectedLinkedProperty = linkableProperties.find(
    (p) => p.id === draft.linkedPropertyId,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [adFiles, setAdFiles] = useState<{
    desktop?: File;
    mobile?: File;
    video?: File;
  }>({});
  const [globalInjectEvery, setGlobalInjectEvery] = useState("5");
  const [savingGlobalInject, setSavingGlobalInject] = useState(false);
  const { data: adStatesData } = useStates();
  const adStateNum = draft.stateId ? Number(draft.stateId) : undefined;
  const { data: adDistrictsData } = useDistricts(adStateNum);

  const isPropertyAd = draft.adType === "property";
  const isImageAd = draft.mediaType === "image";
  const isVideoAd = draft.mediaType === "video";

  useEffect(() => {
    setLinkedPropertyPage(1);
  }, [linkedPropertySearch]);

  useEffect(() => {
    const n = siteSettings?.ad_inject_after_every_n_properties;
    if (n != null && Number.isFinite(Number(n))) {
      setGlobalInjectEvery(String(n));
    }
  }, [siteSettings?.ad_inject_after_every_n_properties]);

  const saveGlobalInjectEvery = async () => {
    const n = Number(globalInjectEvery);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("'Show after every X properties' must be at least 1");
      return;
    }
    setSavingGlobalInject(true);
    try {
      await catalogMutations.patchSiteSettings.mutateAsync({
        ad_inject_after_every_n_properties: n,
      });
      toast.success("Feed injection setting saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingGlobalInject(false);
    }
  };

  const setField = <K extends keyof Advertisement>(
    key: K,
    value: Advertisement[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

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
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const reset = () => {
    setDraft(emptyAd());
    setEditingId(null);
    setAdFiles({});
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      reset();
      setLinkedPropertyPickerOpen(false);
      setLinkedPropertySearch("");
      setLinkedPropertyPage(1);
    }
  };

  const openCreate = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setDraft({ ...ad });
    setEditingId(ad.id);
    setOpen(true);
  };

  const removeAd = async (id: string) => {
    try {
      await catalogMutations.deleteAd.mutateAsync(Number(id));
      toast.success("Advertisement removed");
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      if (editingId) {
        await catalogMutations.updateAd.mutateAsync({
          id: Number(editingId),
          form: fd,
        });
        toast.success("Advertisement updated");
      } else {
        await catalogMutations.createAd.mutateAsync(fd);
        toast.success("Advertisement created");
      }
      setOpen(false);
      reset();
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const totalAds = adsData?.count ?? list.length;
  const hasActiveFilters =
    adSearch.trim() !== "" ||
    adTypeFilter !== "all" ||
    adStatusFilter !== "all";

  const clearAdFilters = () => {
    setAdSearch("");
    setAdTypeFilter("all");
    setAdStatusFilter("all");
    setAdSort("newest");
  };

  const filterSelectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Advertisements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage property and generic ads shown across feeds.
          </p>
        </div>
        <Button
          variant="luxe"
          onClick={openCreate}
          className="self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> New advertisement
        </Button>
      </div>

      <div className="mb-6 bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label className="text-xs">
              Show after every X properties (global)
            </Label>
            <Input
              type="number"
              min={1}
              value={globalInjectEvery}
              onChange={(e) => setGlobalInjectEvery(e.target.value)}
              placeholder="5"
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Applies to all ads in property listing feeds. Property ads are
              shown before generic ads.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={savingGlobalInject}
            onClick={() => void saveGlobalInjectEvery()}
          >
            Save feed setting
          </Button>
        </div>
      </div>

      {(list.length > 0 || hasActiveFilters) && (
        <div className="mb-6 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={adSearch}
                  onChange={(e) => setAdSearch(e.target.value)}
                  placeholder="Search by title…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ad type</Label>
              <select
                value={adTypeFilter}
                onChange={(e) =>
                  setAdTypeFilter(e.target.value as "all" | AdType)
                }
                className={filterSelectClass}
              >
                <option value="all">All types</option>
                <option value="property">Property ads</option>
                <option value="generic">Generic ads</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={adStatusFilter}
                onChange={(e) =>
                  setAdStatusFilter(
                    e.target.value as "all" | "active" | "inactive",
                  )
                }
                className={filterSelectClass}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort by</Label>
              <select
                value={adSort}
                onChange={(e) =>
                  setAdSort(e.target.value as "newest" | "oldest" | "priority")
                }
                className={filterSelectClass}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {adsFetching
                ? "Updating…"
                : `${totalAds} ad${totalAds === 1 ? "" : "s"}`}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAdFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        hasActiveFilters ? (
          <div className="bg-card border border-dashed rounded-2xl p-16 text-center text-muted-foreground">
            No advertisements match your filters.
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAdFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-dashed rounded-2xl p-16 text-center text-muted-foreground">
            No advertisements yet. Click "New advertisement" to add one.
          </div>
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((ad) => {
            const preview =
              ad.desktopBanner || ad.mobileBanner || ad.videoThumbnail;
            const linkedProperty = linkableProperties.find(
              (p) => p.id === ad.linkedPropertyId,
            );
            return (
              <div
                key={ad.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={ad.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="h-40 w-full bg-muted grid place-items-center text-muted-foreground text-xs uppercase tracking-wider">
                    No media
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg leading-tight">
                      {ad.title}
                    </h3>
                    <Badge variant={ad.active ? "default" : "secondary"}>
                      {ad.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {ad.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {ad.subtitle}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        ad.adType === "property"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {ad.adType === "property" ? "Property" : "Generic"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {ad.mediaType}
                    </span>
                  </div>
                  {ad.redirectType === "property" && ad.linkedPropertyId && (
                    <div className="text-xs text-foreground/80 truncate">
                      Linked:{" "}
                      {linkedProperty?.title ??
                        `Property #${ad.linkedPropertyId}`}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {ad.priority
                        ? `Priority ${ad.priority}`
                        : "Default priority"}
                    </span>
                    {ad.createdAt && (
                      <span
                        title={`Created ${new Date(ad.createdAt).toLocaleString()}`}
                      >
                        {new Date(ad.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-3 flex items-center justify-end gap-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(ad)}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() =>
                        setPendingDelete({
                          label: ad.title,
                          action: () => removeAd(ad.id),
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingId ? "Edit advertisement" : "New advertisement"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-6">
            {/* 1. Basic Information */}
            <section className="space-y-3">
              <h3 className="font-serif text-base text-primary">
                1. Basic Information
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">
                  Ad Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Internal advertisement title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Ad Subtitle</Label>
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
                    Ad Type <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={draft.adType}
                    onChange={(e) =>
                      setField("adType", e.target.value as AdType)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="property">Property Ad</option>
                    <option value="generic">Generic Ad</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    Media Type <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={draft.mediaType}
                    onChange={(e) =>
                      setField("mediaType", e.target.value as AdMediaType)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Ad Status</div>
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

            {/* 2. Media Upload */}
            <section className="space-y-3">
              <h3 className="font-serif text-base text-primary">
                2. Media Upload
              </h3>
              {isImageAd && (
                <div className="grid gap-3">
                  <AdImageUploader
                    id="ad-desktop-banner"
                    label="Banner Image *"
                    preview={draft.desktopBanner}
                    onFile={(f) => handleImageFile("desktopBanner", f)}
                    onClear={() => clearAdImage("desktopBanner")}
                  />
                </div>
              )}
              {isVideoAd && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Video File <span className="text-rose-500">*</span>
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
                    videoProcessingStatusLabel(draft.videoProcessingStatus) ? (
                      <p
                        className={cn(
                          "text-xs",
                          videoProcessingStatusTone(
                            draft.videoProcessingStatus,
                          ) === "warning" && "text-amber-600",
                          videoProcessingStatusTone(
                            draft.videoProcessingStatus,
                          ) === "success" && "text-emerald-600",
                          videoProcessingStatusTone(
                            draft.videoProcessingStatus,
                          ) === "destructive" && "text-destructive",
                        )}
                      >
                        {videoProcessingStatusLabel(draft.videoProcessingStatus)}
                      </p>
                    ) : null}
                  </div>
                  <AdImageUploader
                    id="ad-video-thumb"
                    label="Video Thumbnail"
                    preview={draft.videoThumbnail}
                    onFile={(f) => handleImageFile("videoThumbnail", f)}
                    onClear={() => clearAdImage("videoThumbnail")}
                  />
                </div>
              )}
            </section>

            {/* 3. Redirect Configuration */}
            <section className="space-y-3">
              <h3 className="font-serif text-base text-primary">
                3. Redirect Configuration
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">
                  Redirect Type <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={draft.redirectType}
                  onChange={(e) =>
                    setField("redirectType", e.target.value as AdRedirectType)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="property">Property</option>
                  <option value="external">External URL</option>
                  <option value="internal">Internal Page</option>
                </select>
              </div>
              {draft.redirectType === "property" && (
                <div className="space-y-2">
                  <Label className="text-xs">
                    Linked Property <span className="text-rose-500">*</span>
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
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-border bg-white p-2 shadow-lg">
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={linkedPropertySearch}
                            onChange={(e) =>
                              setLinkedPropertySearch(e.target.value)
                            }
                            placeholder="Search property name..."
                            className="h-9 pl-8 text-sm"
                          />
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded border border-border/70">
                          {linkableProperties.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                              No approved properties found
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
                                <span className="block truncate">
                                  {p.title}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                  {p.location}, {p.city}
                                </span>
                              </button>
                            ))
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            Page {linkedPropertyPage} of{" "}
                            {linkedPropertyTotalPages}
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
                    Showing 20 approved properties per page. Use search to
                    filter by property name/location.
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
                  <Label className="text-xs">Internal Page Path</Label>
                  <Input
                    value={draft.internalPage}
                    onChange={(e) => setField("internalPage", e.target.value)}
                    placeholder="/buy or /sell or /contact"
                  />
                </div>
              )}
            </section>

            {/* 4. Location Targeting */}
            {isPropertyAd && (
              <section className="space-y-3">
                <h3 className="font-serif text-base text-primary">
                  4. Location Targeting
                </h3>
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
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">
                        {draft.stateId
                          ? "Select district…"
                          : "Select a state first"}
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
                      Place / City <span className="text-rose-500">*</span>
                    </Label>
                    <OsmPlaceSearch
                      value={draft.city}
                      displayLabel={draft.city}
                      stateName={selectedAdStateName}
                      districtName={selectedAdDistrictName}
                      disabled={!draft.districtId}
                      placeholder={
                        draft.districtId
                          ? "Search place…"
                          : "Select district first"
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

            {/* 5. Geo Targeting (property ads only) */}
            {isPropertyAd && (
              <section className="space-y-3">
                <h3 className="font-serif text-base text-primary">
                  5. Geo Targeting (Radius)
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={draft.latitude}
                      onChange={(e) => setField("latitude", e.target.value)}
                      placeholder="11.2588"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={draft.longitude}
                      onChange={(e) => setField("longitude", e.target.value)}
                      placeholder="75.7804"
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

            {/* 6. Schedule & Priority */}
            <section className="space-y-3">
              <h3 className="font-serif text-base text-primary">
                6. Schedule &amp; Priority
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setField("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">End Date</Label>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={
                  catalogMutations.createAd.isPending ||
                  catalogMutations.updateAd.isPending
                }
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <SubmitProgressButton
                type="submit"
                variant="luxe"
                submitting={
                  editingId
                    ? catalogMutations.updateAd.isPending
                    : catalogMutations.createAd.isPending
                }
                idleLabel={editingId ? "Save changes" : "Create advertisement"}
                messages={AD_SUBMIT_MESSAGES}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Delete this advertisement?"
        description={
          <>
            <span className="font-medium text-foreground">
              "{pendingDelete?.label}"
            </span>{" "}
            will be permanently removed.
          </>
        }
        confirmLabel="Delete ad"
        onConfirm={() => pendingDelete?.action()}
      />
    </div>
  );
};

type AdImageUploaderProps = {
  id: string;
  label: string;
  preview: string;
  onFile: (file: File | null | undefined) => void;
  onClear: () => void;
};

const AdImageUploader = ({
  id,
  label,
  preview,
  onFile,
  onClear,
}: AdImageUploaderProps) => (
  <div className="space-y-2">
    <Label className="text-xs">{label}</Label>
    <label
      htmlFor={id}
      className="relative block h-32 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary hover:bg-primary/5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFile(e.dataTransfer.files?.[0]);
      }}
    >
      {preview ? (
        <>
          <img
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Remove image"
          >
            <XCircle className="h-3 w-3" />
          </button>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            PNG, JPG, WebP up to 10MB
          </span>
        </div>
      )}
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </label>
  </div>
);

const SettingsPage = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const { data: mobileAppSettings, isLoading: isMobileAppLoading } = useMobileAppSettings();
  const catalogMutations = useCatalogMutations();
  const contactDefaults = useMemo(
    () => ({
      phone: settings?.admin_phone ?? "",
      whatsapp: settings?.admin_whatsapp ?? "",
      email: settings?.company_email ?? "",
      address: settings?.company_address ?? "",
    }),
    [settings],
  );
  const [androidAppVersion, setAndroidAppVersion] = useState("");
  const [androidForceUpdate, setAndroidForceUpdate] = useState(false);
  const [iosAppVersion, setIosAppVersion] = useState("");
  const [iosForceUpdate, setIosForceUpdate] = useState(false);

  useEffect(() => {
    setAndroidAppVersion(mobileAppSettings?.android_app_version ?? "");
    setAndroidForceUpdate(Boolean(mobileAppSettings?.android_force_update));
    setIosAppVersion(mobileAppSettings?.ios_app_version ?? "");
    setIosForceUpdate(Boolean(mobileAppSettings?.ios_force_update));
  }, [mobileAppSettings]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await catalogMutations.patchSiteSettings.mutateAsync({
        admin_phone: String(fd.get("phone") ?? "").trim(),
        admin_whatsapp: String(fd.get("whatsapp") ?? "").trim(),
        company_email: String(fd.get("email") ?? "").trim(),
        company_address: String(fd.get("address") ?? "").trim(),
      });
      toast.success("Company contact saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleMobileAppSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await catalogMutations.patchMobileAppSettings.mutateAsync({
        android_app_version: androidAppVersion.trim(),
        android_force_update: androidForceUpdate,
        ios_app_version: iosAppVersion.trim(),
        ios_force_update: iosForceUpdate,
      });
      toast.success("Mobile app settings saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl space-y-6">
      <h1 className="font-serif text-3xl md:text-4xl mb-6">Settings</h1>

      <form
        key={`settings-${contactDefaults.phone}-${contactDefaults.email}`}
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
      >
        <div>
          <h2 className="font-serif text-lg">Company contact</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Shown in the footer, contact page, and listing contact details.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-phone" className="text-xs">
            Phone
          </Label>
          <Input
            id="company-phone"
            name="phone"
            defaultValue={contactDefaults.phone}
            disabled={isLoading}
            placeholder="+91 ..."
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-whatsapp" className="text-xs">
            WhatsApp number
          </Label>
          <Input
            id="company-whatsapp"
            name="whatsapp"
            defaultValue={contactDefaults.whatsapp}
            disabled={isLoading}
            placeholder="+91 ..."
            className="rounded-lg"
          />
          <p className="text-xs text-muted-foreground">
            Used for the WhatsApp button on listings and the public contact
            page. Can differ from the primary phone.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-email" className="text-xs">
            Email
          </Label>
          <Input
            id="company-email"
            name="email"
            type="email"
            defaultValue={contactDefaults.email}
            disabled={isLoading}
            placeholder="hello@example.com"
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-address" className="text-xs">
            Address
          </Label>
          <Textarea
            id="company-address"
            name="address"
            defaultValue={contactDefaults.address}
            disabled={isLoading}
            rows={4}
            className="rounded-lg resize-none"
          />
        </div>

        <Button type="submit" variant="luxe">
          Save company contact
        </Button>
      </form>

      <form
        onSubmit={handleMobileAppSubmit}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
      >
        <div>
          <h2 className="font-serif text-lg">Mobile app</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Controls the version check shown to mobile app users on launch.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border p-4">
            <h3 className="font-medium text-sm">Android</h3>
            <div className="space-y-2">
              <Label htmlFor="android-app-version" className="text-xs">
                App version
              </Label>
              <Input
                id="android-app-version"
                name="android_app_version"
                value={androidAppVersion}
                onChange={(e) => setAndroidAppVersion(e.target.value)}
                disabled={isMobileAppLoading}
                placeholder="1.4.3"
                className="rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <Label className="text-sm">Force update</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requires Android users to update before continuing.
                </p>
              </div>
              <Switch
                checked={androidForceUpdate}
                onCheckedChange={setAndroidForceUpdate}
                disabled={isMobileAppLoading}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4">
            <h3 className="font-medium text-sm">iOS</h3>
            <div className="space-y-2">
              <Label htmlFor="ios-app-version" className="text-xs">
                App version
              </Label>
              <Input
                id="ios-app-version"
                name="ios_app_version"
                value={iosAppVersion}
                onChange={(e) => setIosAppVersion(e.target.value)}
                disabled={isMobileAppLoading}
                placeholder="1.4.3"
                className="rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <Label className="text-sm">Force update</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requires iOS users to update before continuing.
                </p>
              </div>
              <Switch
                checked={iosForceUpdate}
                onCheckedChange={setIosForceUpdate}
                disabled={isMobileAppLoading}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="luxe"
          disabled={isMobileAppLoading || catalogMutations.patchMobileAppSettings.isPending}
        >
          {catalogMutations.patchMobileAppSettings.isPending
            ? "Saving..."
            : "Save mobile app settings"}
        </Button>
      </form>
    </div>
  );
};

const AdminPanel = () => {
  const { user, hydrated } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    // Wait until the session is restored from localStorage before deciding,
    // otherwise a page refresh redirects to login before `user` is rehydrated.
    if (!hydrated) return;
    if (!user || user.role !== "admin") navigate("/admin/login");
  }, [navigate, user, hydrated]);
  // Auto-close the mobile nav whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  if (!hydrated) return null;
  if (!user || user.role !== "admin") return null;

  const currentPath = pathname.replace(/\/+$/, "");
  const segments = currentPath.split("/").filter(Boolean); // ["admin", section?, sub?]
  const section = currentPath === "/admin" ? "overview" : segments[1];
  const sub = segments[2];

  const renderSection = () => {
    switch (section) {
      case "properties":
        return <PropertiesAdmin />;
      case "approvals":
        return <Approvals />;
      case "users":
        return <UsersAdmin />;
      case "categories":
        return <Categories />;
      case "banners":
        return <Banners />;
      case "testimonials":
        return <Testimonials />;
      case "locations": {
        // City management was removed — city is entered as free text by admins
        // and property owners, so only states/districts are managed here.
        const view: LocationView = sub === "districts" ? "districts" : "states";
        return <LocationManagement view={view} />;
      }
      case "enquiry":
      case "enquiries":
        return <EnquiryAdmin />;
      case "advertisements":
        return <AdvertisementsAdmin />;
      case "settings":
        return <SettingsPage />;
      case "overview":
      case undefined:
        return <Overview />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <Sidebar />
      <MobileTopBar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-10 overflow-x-auto">
        {renderSection()}
      </main>
    </div>
  );
};

export default AdminPanel;
