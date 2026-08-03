"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "@/lib/api/accounts";
import { getErrorMessage } from "@/lib/api/errors";
import { buildAppPath, useNavigate } from "@/lib/router";
import type { ApiStaff, ApiStaffPerformance } from "@/lib/api/types";
import { AdminModal } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  KeyRound,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  UserX,
} from "lucide-react";

type StaffFormState = {
  full_name: string;
  email: string;
  phone: string;
  role_label: string;
  password: string;
  password2: string;
  can_manage_properties: boolean;
  can_manage_advertisements: boolean;
  is_active: boolean;
};

const emptyForm = (): StaffFormState => ({
  full_name: "",
  email: "",
  phone: "",
  role_label: "Staff",
  password: "",
  password2: "",
  can_manage_properties: true,
  can_manage_advertisements: true,
  is_active: true,
});

function staffInitials(s: ApiStaff) {
  const name = (s.full_name || `${s.first_name} ${s.last_name}` || s.email).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function MetricTile({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Building2;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ActivityBar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", className)}
          style={{ width: `${Math.max(pct, value > 0 ? 6 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function StaffDetailContent({
  staff,
  perf,
  activityMax,
}: {
  staff: ApiStaff;
  perf?: ApiStaffPerformance;
  activityMax: number;
}) {
  return (
    // Let `AdminModal` handle scrolling to avoid nested scrollbars.
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
          {staffInitials(staff)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl">{staff.full_name || staff.email}</h2>
          <p className="text-sm text-muted-foreground">{staff.email}</p>
          {staff.phone ? (
            <p className="text-sm text-muted-foreground mt-0.5">{staff.phone}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={staff.is_active ? "default" : "secondary"}>
              {staff.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="font-normal">
              <Shield className="h-3 w-3 mr-1" />
              {staff.role_label || "Staff"}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                staff.permissions?.can_manage_properties
                  ? "border-emerald-200 text-emerald-800"
                  : "opacity-60",
              )}
            >
              <Building2 className="h-3 w-3 mr-1" />
              Properties {staff.permissions?.can_manage_properties ? "on" : "off"}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                staff.permissions?.can_manage_advertisements
                  ? "border-emerald-200 text-emerald-800"
                  : "opacity-60",
              )}
            >
              <Megaphone className="h-3 w-3 mr-1" />
              Ads {staff.permissions?.can_manage_advertisements ? "on" : "off"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium">Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio totals and last {perf?.period_days ?? 30} days
            </p>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Properties"
            value={perf?.properties_created ?? staff.property_count ?? 0}
            icon={Building2}
            hint="Created by this staff"
          />
          <MetricTile
            label="Advertisements"
            value={perf?.advertisements_created ?? staff.advertisement_count ?? 0}
            icon={Megaphone}
            hint="Created by this staff"
          />
          <MetricTile
            label="Activity"
            value={perf?.activity_total ?? 0}
            icon={Activity}
            hint={`Last ${perf?.period_days ?? 30} days`}
          />
          <MetricTile
            label="Logins"
            value={perf?.activity_login ?? 0}
            icon={KeyRound}
            hint={`Last ${perf?.period_days ?? 30} days`}
          />
        </div>
        {perf && (
          <div className="pt-1 space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Activity mix
            </p>
            <ActivityBar
              label="Creates"
              value={perf.activity_create}
              max={activityMax}
              className="bg-emerald-600"
            />
            <ActivityBar
              label="Updates"
              value={perf.activity_update}
              max={activityMax}
              className="bg-sky-600"
            />
            <ActivityBar
              label="Deletes"
              value={perf.activity_delete}
              max={activityMax}
              className="bg-rose-600"
            />
            <ActivityBar
              label="Logins"
              value={perf.activity_login}
              max={activityMax}
              className="bg-amber-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function StaffAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiStaff | null>(null);
  const [form, setForm] = useState<StaffFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState<ApiStaff | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiStaff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiStaff | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listParams = useMemo(() => {
    const p: Record<string, string | number | boolean> = { page_size: 50 };
    if (debounced) p.search = debounced;
    if (statusFilter === "active") p.is_active = true;
    if (statusFilter === "inactive") p.is_active = false;
    return p;
  }, [debounced, statusFilter]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["staffAdmin", listParams],
    queryFn: () => accountsApi.listStaff(listParams),
  });

  const { data: overview } = useQuery({
    queryKey: ["staffOverview"],
    queryFn: () => accountsApi.staffOverview(),
  });

  const { data: performance } = useQuery({
    queryKey: ["staffPerformance", viewTarget?.id],
    queryFn: () => accountsApi.staffPerformance(viewTarget!.id, { days: 30 }),
    enabled: !!viewTarget,
  });

  const staffList = (data?.results ?? []).filter((s) => !s.is_superuser);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (s: ApiStaff) => {
    setEditing(s);
    setForm({
      full_name: s.full_name || `${s.first_name} ${s.last_name}`.trim(),
      email: s.email,
      phone: s.phone || "",
      role_label: s.role_label || "Staff",
      password: "",
      password2: "",
      can_manage_properties: s.permissions?.can_manage_properties ?? true,
      can_manage_advertisements: s.permissions?.can_manage_advertisements ?? true,
      is_active: s.is_active,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editing && (!form.password || form.password !== form.password2)) {
      toast.error("Password and confirmation must match");
      return;
    }
    if (editing && form.password && form.password !== form.password2) {
      toast.error("Password and confirmation must match");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role_label: form.role_label.trim(),
          can_manage_properties: form.can_manage_properties,
          can_manage_advertisements: form.can_manage_advertisements,
          is_active: form.is_active,
        };
        if (form.password) {
          body.new_password = form.password;
          body.new_password2 = form.password2;
        }
        await accountsApi.patchStaff(editing.id, body);
        toast.success("Staff updated");
      } else {
        await accountsApi.createStaff({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role_label: form.role_label.trim(),
          password: form.password,
          password2: form.password2,
          can_manage_properties: form.can_manage_properties,
          can_manage_advertisements: form.can_manage_advertisements,
        });
        toast.success("Staff created");
      }
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey: ["staffAdmin"] });
      void qc.invalidateQueries({ queryKey: ["staffOverview"] });
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await accountsApi.patchStaff(deactivateTarget.id, { is_active: false });
      toast.success("Staff deactivated");
      setDeactivateTarget(null);
      if (viewTarget?.id === deactivateTarget.id) setViewTarget(null);
      void qc.invalidateQueries({ queryKey: ["staffAdmin"] });
      void qc.invalidateQueries({ queryKey: ["staffOverview"] });
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await accountsApi.deleteStaff(deleteTarget.id);
      toast.success("Staff account removed");
      setDeleteTarget(null);
      if (viewTarget?.id === deleteTarget.id) setViewTarget(null);
      void qc.invalidateQueries({ queryKey: ["staffAdmin"] });
      void qc.invalidateQueries({ queryKey: ["staffOverview"] });
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const perf = performance as ApiStaffPerformance | undefined;
  const activityMax = Math.max(
    perf?.activity_create ?? 0,
    perf?.activity_update ?? 0,
    perf?.activity_delete ?? 0,
    perf?.activity_login ?? 0,
    1,
  );

  const overviewCards = [
    { label: "Total staff", value: overview?.total_staff ?? "—", icon: Users },
    { label: "Active", value: overview?.active_staff ?? "—", icon: CheckCircle2 },
    { label: "Inactive", value: overview?.inactive_staff ?? "—", icon: UserX },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Team operations
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">Staff management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage staff accounts, permissions, and monitor activity.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add staff
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-full bg-card"
            placeholder="Search by name, email, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Staff</th>
                <th className="text-left p-4 font-medium">Phone</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Properties</th>
                <th className="text-left p-4 font-medium">Ads</th>
                <th className="text-left p-4 font-medium">Joined</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && !staffList.length ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    Loading staff…
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold shrink-0">
                          {staffInitials(s)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {s.full_name || s.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-foreground/80 whitespace-nowrap">
                      {s.phone || "—"}
                    </td>
                    <td className="p-4 text-foreground/80 whitespace-nowrap">
                      {s.role_label || "Staff"}
                    </td>
                    <td className="p-4 tabular-nums">{s.property_count ?? 0}</td>
                    <td className="p-4 tabular-nums">{s.advertisement_count ?? 0}</td>
                    <td className="p-4 text-foreground/80 whitespace-nowrap">
                      {formatDate(s.date_joined)}
                    </td>
                    <td className="p-4">
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="View"
                          onClick={() => setViewTarget(s)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Activity history"
                          onClick={() =>
                            navigate(
                              buildAppPath(
                                "/admin/staff/activity",
                                `staff=${s.id}`,
                              ),
                            )
                          }
                        >
                          <Clock3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-amber-700"
                          title="Deactivate"
                          disabled={!s.is_active}
                          onClick={() => setDeactivateTarget(s)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteTarget(s)}
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

      <p className="text-sm text-muted-foreground">{staffList.length} staff member(s)</p>

      <AdminModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.full_name || viewTarget?.email || "Staff details"}
        className="max-w-4xl max-h-[80vh]"
      >
        {viewTarget ? (
          <StaffDetailContent
            staff={viewTarget}
            perf={perf}
            activityMax={activityMax}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit staff" : "Add staff"}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role label</Label>
              <Input
                value={form.role_label}
                onChange={(e) => setForm((f) => ({ ...f, role_label: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{editing ? "New password" : "Password"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={form.password2}
                onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Permissions
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="perm-props"
                checked={form.can_manage_properties}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, can_manage_properties: !!v }))
                }
              />
              <Label htmlFor="perm-props">Can manage properties</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="perm-ads"
                checked={form.can_manage_advertisements}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, can_manage_advertisements: !!v }))
                }
              />
              <Label htmlFor="perm-ads">Can manage advertisements</Label>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="staff-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: !!v }))}
                />
                <Label htmlFor="staff-active">Active</Label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate staff"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Deactivate &ldquo;{deactivateTarget?.full_name || deactivateTarget?.email}&rdquo;?
          They will no longer be able to sign in. You can reactivate them later via Edit.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={confirmDeactivate}>
            Deactivate
          </Button>
        </div>
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete staff account"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Permanently remove &ldquo;{deleteTarget?.full_name || deleteTarget?.email}&rdquo;?
          This deactivates the account and revokes access. This action cannot be undone from
          the admin panel.
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

export default StaffAdmin;
